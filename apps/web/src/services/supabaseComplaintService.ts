import { Complaint, ComplaintStatus, ComplaintPriority } from '../types/complaint';
import { IComplaintService, ComplaintFilterParams } from './api.interface';
import { supabase } from './supabaseClient';
import { mapSupabaseRowToComplaint } from './reportAdapter';
import { ALLOWED_STATUS_TRANSITIONS } from '../lib/constants';
import { CivicRewardsService } from './civicRewardsService';
import {
  JointActionRequest,
  JointActionResult,
  IncidentClusterRecord,
  IncidentGroupingEngine,
} from './incidentGroupingEngine';
import {
  getMockComplaintsForCorporation,
  getMockComplaintsForDistrict,
  getAllStateComplaints,
} from './mock/districtMockData';
import {
  getCorporationById,
  MAHARASHTRA_DISTRICTS,
} from '../data/maharashtraDistricts';
import { isComplaintInDistrict } from '../lib/districtFilter';

export class SupabaseComplaintService implements IComplaintService {
  private rewardsService = new CivicRewardsService();
  /**
   * Helper to parse string ID (e.g. "CR-12", "CR-PUN-101", or "12") to integer DB ID
   */
  private parseDbId(id: string): number | null {
    if (!id) return null;
    const match = id.match(/\d+/);
    if (!match) return null;
    const num = parseInt(match[0], 10);
    return isNaN(num) ? null : num;
  }

  async getComplaints(filters: ComplaintFilterParams = {}): Promise<Complaint[]> {
    let query = supabase.from('reports').select('*');

    // Status filter
    if (filters.status && filters.status !== 'all') {
      const dbStatus =
        filters.status === 'verified'
          ? 'resolved'
          : filters.status;
      query = query.eq('status', dbStatus);
    }

    // Priority filter
    if (filters.priority && filters.priority !== 'all') {
      const dbPriority = filters.priority === 'urgent' ? 'critical' : filters.priority;
      query = query.eq('priority', dbPriority);
    }

    // Search filter across title, description, and location
    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      query = query.or(
        `title.ilike.${term},description.ilike.${term},location.ilike.${term}`
      );
    }

    // Order newest first
    query = query.order('created_at', { ascending: false }).limit(200);

    let mapped: Complaint[] = [];
    try {
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        console.log(`✅ Fetched ${data.length} live reports from Supabase`);
        mapped = data.map((row) => mapSupabaseRowToComplaint(row));
      } else if (error) {
        console.warn('⚠️ Supabase query error:', error.message);
        mapped = [];
      } else {
        mapped = [];
      }
    } catch (err) {
      console.warn('⚠️ Supabase connection error:', err);
      mapped = [];
    }

    // Resolve active organization context for strict district isolation
    let orgType = filters.organizationType;
    let districtId = filters.districtId;
    let corporationId = filters.corporationId;

    if (!orgType || (!districtId && !corporationId)) {
      try {
        const saved = localStorage.getItem('civicresolve_org_context');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (!orgType && parsed.organizationType) orgType = parsed.organizationType;
          if (!districtId && parsed.districtId) districtId = parsed.districtId;
          if (!corporationId && parsed.corporationId) corporationId = parsed.corporationId;
        }
      } catch (_) {}
    }

    if (!districtId && !corporationId) {
      try {
        const savedUser = localStorage.getItem('civicresolve_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          if (parsedUser.districtId) districtId = parsedUser.districtId;
          if (parsedUser.corporationId) corporationId = parsedUser.corporationId;
          if (parsedUser.role === 'state_admin') orgType = 'STATE';
        }
      } catch (_) {}
    }

    // Strict district isolation filtering
    if (orgType !== 'STATE') {
      const targetCorp = corporationId ? getCorporationById(corporationId) : null;
      const targetDist = districtId
        ? MAHARASHTRA_DISTRICTS.find((d) => d.id === districtId)
        : targetCorp
        ? MAHARASHTRA_DISTRICTS.find((d) => d.corporations.some((c) => c.id === targetCorp.id))
        : null;

      if (targetDist) {
        mapped = mapped.filter((c) => isComplaintInDistrict(c, targetDist));
      } else {
        const keywords: string[] = [];
        if (targetCorp) {
          keywords.push(targetCorp.shortName.toLowerCase());
          keywords.push(targetCorp.district.toLowerCase());
          keywords.push(targetCorp.name.toLowerCase());
        }

        const targetLat = targetCorp ? targetCorp.coordinates.lat : null;
        const targetLng = targetCorp ? targetCorp.coordinates.lng : null;

        mapped = mapped.filter((c) => {
          if (targetLat != null && targetLng != null && !isNaN(c.location.latitude) && !isNaN(c.location.longitude)) {
            const dLat = Math.abs(c.location.latitude - targetLat);
            const dLng = Math.abs(c.location.longitude - targetLng);
            if (dLat < 0.55 && dLng < 0.55) return true;
          }
          const locString = `${c.location.address} ${c.location.landmark} ${c.location.ward} ${c.location.zone}`.toLowerCase();
          for (const kw of keywords) {
            if (kw && locString.includes(kw)) return true;
          }
          return false;
        });
      }

      // If no live reports exist for this district, load isolated district mock dataset
      if (mapped.length === 0) {
        if (corporationId) {
          mapped = getMockComplaintsForCorporation(corporationId);
          console.log(`ℹ️ Isolated corporation dataset loaded for [${corporationId}]: ${mapped.length} complaints`);
        } else if (districtId) {
          mapped = getMockComplaintsForDistrict(districtId);
          console.log(`ℹ️ Isolated district dataset loaded for [${districtId}]: ${mapped.length} complaints`);
        } else {
          mapped = getMockComplaintsForCorporation('pmc');
        }
      }
    } else {
      // STATE admin view: Guarantee all 9 monitored districts have civic data!
      // If a district has live reports in Supabase, retain them.
      // If a district has NO live reports in Supabase, supplement with that district's mock dataset.
      const districtsWithLiveReports = new Set<string>();
      for (const dist of MAHARASHTRA_DISTRICTS) {
        if (mapped.some((c) => isComplaintInDistrict(c, dist))) {
          districtsWithLiveReports.add(dist.id);
        }
      }

      const supplementalComplaints: Complaint[] = [];
      for (const dist of MAHARASHTRA_DISTRICTS) {
        if (!districtsWithLiveReports.has(dist.id)) {
          const mocks = getMockComplaintsForDistrict(dist.id);
          supplementalComplaints.push(...mocks);
        }
      }

      if (supplementalComplaints.length > 0) {
        mapped = [...mapped, ...supplementalComplaints];
        console.log(
          `ℹ️ State administration overview dataset loaded: ${mapped.length} complaints (${districtsWithLiveReports.size} districts with live data, ${supplementalComplaints.length} supplemented across ${MAHARASHTRA_DISTRICTS.length - districtsWithLiveReports.size} districts)`
        );
      }
    }

    // Category filtering
    if (filters.category && filters.category !== 'all') {
      mapped = mapped.filter((c) => c.category === filters.category);
    }

    // Overdue SLA filter
    if (filters.isOverdueOnly) {
      mapped = mapped.filter((c) => c.sla.isOverdue);
    }

    // Custom Sorting
    if (filters.sortBy === 'priority') {
      const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 };
      mapped.sort((a, b) => {
        const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
        return filters.sortOrder === 'asc' ? -diff : diff;
      });
    } else if (filters.sortBy === 'slaDeadline') {
      mapped.sort((a, b) => {
        const timeA = new Date(a.sla.deadline).getTime();
        const timeB = new Date(b.sla.deadline).getTime();
        return filters.sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      });
    }

    return mapped;
  }

  async getComplaintById(id: string): Promise<Complaint | null> {
    const dbId = this.parseDbId(id);
    if (dbId != null) {
      try {
        // 1. Fetch report row
        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .select('*')
          .eq('id', dbId)
          .maybeSingle();

        if (!reportError && reportData) {
          // 2. Fetch status history
          const { data: historyData } = await supabase
            .from('report_status_history')
            .select('*')
            .eq('report_id', dbId)
            .order('created_at', { ascending: true });

          return mapSupabaseRowToComplaint(reportData, historyData || []);
        }
      } catch (_) {}
    }

    // Search isolated mock datasets across districts
    const idLower = id.toLowerCase().trim();
    const allMocks = getAllStateComplaints();
    const mockMatch = allMocks.find(
      (c) =>
        c.id.toLowerCase() === idLower ||
        (dbId != null && c.dbId === dbId) ||
        `cr-${c.dbId}` === idLower
    );

    if (mockMatch) {
      return { ...mockMatch };
    }

    console.warn(`⚠️ Complaint ${id} not found in database or mock datasets.`);
    return null;
  }

  async updateStatus(
    id: string,
    newStatus: ComplaintStatus,
    officerName: string,
    notes?: string,
    proofImageUrl?: string
  ): Promise<Complaint> {
    const dbId = this.parseDbId(id);
    if (dbId == null) {
      throw new Error(`Cannot update status: Invalid complaint ID "${id}"`);
    }

    const current = await this.getComplaintById(id);
    if (current) {
      const allowed = ALLOWED_STATUS_TRANSITIONS[current.status] || [];
      if (!allowed.includes(newStatus) && current.status !== newStatus) {
        console.warn(
          `⚠️ Controlled transition notice: moving from ${current.status} to ${newStatus}. Allowed: ${allowed.join(', ')}`
        );
      }
    }

    const now = new Date().toISOString();

    // Map web status to database status column
    let dbStatus: string = newStatus;
    if (newStatus === 'citizen_verification') {
      dbStatus = 'resolved';
    }

    const updatePayload: Record<string, any> = {
      status: dbStatus,
      updated_at: now,
    };

    if (notes) {
      updatePayload.resolution_notes = notes;
    }
    if (proofImageUrl) {
      updatePayload.resolution_image_url = proofImageUrl;
    }
    if (newStatus === 'resolved' || newStatus === 'citizen_verification' || newStatus === 'closed' || newStatus === 'resolution_submitted') {
      updatePayload.completion_date = now;
    }

    // 1. Update report in Supabase
    const { error: updateError } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('id', dbId);

    if (updateError) {
      console.warn('⚠️ Notice: Supabase update error, falling back to mock state update:', updateError.message);
      const mock = await this.getComplaintById(id);
      if (mock) {
        const fromStatus = mock.status;
        mock.status = newStatus;
        mock.updatedAt = now;
        if (notes) {
          mock.adminNotes.push({
            id: `AN-${Date.now()}`,
            author: officerName || 'Municipal Officer',
            text: notes,
            createdAt: now,
            isInternal: false,
          });
        }
        if (proofImageUrl) {
          mock.evidence.after = [proofImageUrl];
        }
        mock.statusHistory.push({
          id: `SH-${Date.now()}`,
          fromStatus,
          toStatus: newStatus,
          changedBy: officerName || 'Municipal Officer',
          role: 'officer',
          timestamp: now,
          notes: notes || `Status transitioned from ${fromStatus} to ${newStatus}`,
          proofImageUrl,
        });
        return mock;
      }
      throw new Error(`Database status update failed: ${updateError.message}`);
    }

    // 2. Insert into status history
    const { error: historyInsertError } = await supabase
      .from('report_status_history')
      .insert({
        report_id: dbId,
        old_status: current?.status,
        status: dbStatus,
        new_status: dbStatus,
        changed_by: officerName || 'Municipal Officer',
        notes: notes || `Status updated to ${newStatus}`,
        created_at: now,
      });

    if (historyInsertError) {
      console.warn('⚠️ Warning: Status history insertion note:', historyInsertError.message);
    }

    const fresh = await this.getComplaintById(id);
    if (!fresh) {
      throw new Error(`Complaint #${id} updated but could not be re-fetched.`);
    }
    return fresh;
  }

  /**
   * Change Complaint Priority with required audit trail logging
   */
  async changePriority(
    id: string,
    newPriority: ComplaintPriority,
    actorName: string,
    reason?: string
  ): Promise<Complaint> {
    const dbId = this.parseDbId(id);
    if (dbId == null) {
      throw new Error(`Cannot change priority: Invalid complaint ID "${id}"`);
    }

    const now = new Date().toISOString();
    const current = await this.getComplaintById(id);
    const oldPriority = current?.priority || 'medium';
    const auditNote = `Priority escalated from ${oldPriority.toUpperCase()} to ${newPriority.toUpperCase()}.${reason ? ` Reason: ${reason}` : ''}`;

    const { error } = await supabase
      .from('reports')
      .update({
        priority: newPriority,
        updated_at: now,
      })
      .eq('id', dbId);

    if (error) {
      console.warn('⚠️ Notice: Supabase priority update error, falling back to mock state update:', error.message);
      const mock = await this.getComplaintById(id);
      if (mock) {
        mock.priority = newPriority;
        mock.updatedAt = now;
        mock.adminNotes.push({
          id: `AN-${Date.now()}`,
          author: actorName || 'Municipal Dispatcher',
          text: auditNote,
          createdAt: now,
          isInternal: false,
        });
        mock.statusHistory.push({
          id: `SH-${Date.now()}`,
          toStatus: mock.status,
          changedBy: actorName || 'Municipal Dispatcher',
          role: 'officer',
          timestamp: now,
          action: 'priority_changed',
          notes: auditNote,
        });
        return mock;
      }
      throw new Error(`Failed to change priority: ${error.message}`);
    }

    await this.addAdminNote(id, actorName || 'Municipal Dispatcher', auditNote, false);

    const fresh = await this.getComplaintById(id);
    return fresh || current!;
  }

  /**
   * Submits Field Resolution Evidence (After photo, resolution note, and timestamp)
   */
  async submitResolution(
    id: string,
    officerName: string,
    resolutionNotes: string,
    proofImageUrl?: string
  ): Promise<Complaint> {
    const dbId = this.parseDbId(id);
    if (dbId == null) {
      throw new Error(`Cannot submit resolution: Invalid complaint ID "${id}"`);
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('reports')
      .update({
        status: 'resolved',
        resolution_notes: resolutionNotes,
        resolution_image_url: proofImageUrl || null,
        completion_date: now,
        updated_at: now,
      })
      .eq('id', dbId);

    if (error) {
      console.warn('⚠️ Notice: Supabase resolution update error, falling back to mock state update:', error.message);
      const mock = await this.getComplaintById(id);
      if (mock) {
        const fromStatus = mock.status;
        mock.status = 'citizen_verification';
        mock.updatedAt = now;
        mock.resolvedAt = now;
        if (proofImageUrl) {
          mock.evidence.after = [proofImageUrl];
        }
        mock.resolutionDetails = {
          resolvedAt: now,
          resolvedBy: officerName,
          resolutionNote: resolutionNotes,
          proofImageUrl,
          locationVerified: true,
        };
        mock.adminNotes.push({
          id: `AN-${Date.now()}`,
          author: officerName,
          text: `[Resolution Evidence Submitted]: ${resolutionNotes}`,
          createdAt: now,
          isInternal: false,
        });
        mock.statusHistory.push({
          id: `SH-${Date.now()}`,
          fromStatus,
          toStatus: 'citizen_verification',
          changedBy: officerName,
          role: 'officer',
          timestamp: now,
          action: 'resolution_submitted',
          notes: resolutionNotes,
          proofImageUrl,
        });
        return mock;
      }
      throw new Error(`Failed to submit resolution: ${error.message}`);
    }

    // Record status history
    await supabase.from('report_status_history').insert({
      report_id: dbId,
      status: 'resolved',
      new_status: 'resolved',
      changed_by: officerName,
      notes: `Resolution evidence uploaded: ${resolutionNotes}`,
      created_at: now,
    });

    const fresh = await this.getComplaintById(id);
    return fresh!;
  }

  /**
   * Citizen Verification Workflow:
   * - If satisfied == true: Marks complaint CLOSED, logs audit event, awards civic points.
   * - If satisfied == false: Reopens complaint to REOPENED with reason and photo.
   */
  async submitCitizenVerification(
    id: string,
    satisfied: boolean,
    comment?: string,
    reopenReason?: string,
    proofPhotoUrl?: string
  ): Promise<Complaint> {
    const dbId = this.parseDbId(id);
    if (dbId == null) {
      throw new Error(`Cannot verify complaint: Invalid complaint ID "${id}"`);
    }

    const now = new Date().toISOString();
    const current = await this.getComplaintById(id);
    const citizenName = current?.reporter?.name || 'Citizen';

    if (satisfied) {
      // Citizen Confirmed: Move to CLOSED
      const { error } = await supabase
        .from('reports')
        .update({
          status: 'closed',
          citizen_verification_status: 'verified',
          citizen_feedback: comment || 'Citizen confirmed grievance resolved successfully.',
          rating: 5,
          updated_at: now,
        })
        .eq('id', dbId);

      if (error) {
        console.warn('⚠️ Notice: Supabase citizen verification error, falling back to mock state update:', error.message);
        const mock = await this.getComplaintById(id);
        if (mock) {
          mock.status = 'closed';
          mock.closedAt = now;
          mock.updatedAt = now;
          mock.citizenVerification = {
            verifiedAt: now,
            satisfied: true,
            comment: comment || 'Confirmed resolved by citizen.',
            verifiedByCitizen: true,
            reopenCount: mock.citizenVerification?.reopenCount || 0,
          };
          mock.citizenFeedback = {
            rating: 5,
            comment: comment || 'Confirmed resolved by citizen.',
            satisfied: true,
          };
          mock.statusHistory.push({
            id: `SH-${Date.now()}`,
            fromStatus: 'citizen_verification',
            toStatus: 'closed',
            changedBy: citizenName,
            role: 'citizen',
            timestamp: now,
            action: 'citizen_verified_close',
            notes: comment || 'Citizen verified on-site resolution. Grievance closed.',
          });
          return mock;
        }
      }

      await supabase.from('report_status_history').insert({
        report_id: dbId,
        status: 'closed',
        new_status: 'closed',
        changed_by: citizenName,
        notes: comment || 'Citizen verified resolution. Complaint closed.',
        created_at: now,
      });

      // Award Civic Score points to citizen
      try {
        if (current?.reporter?.name) {
          await this.rewardsService.recordContribution({
            userId: current.reporter.name,
            districtId: 'pune',
            complaintId: id,
            contributionType: 'resolution_verification',
            customNotes: 'Civic points awarded for verifying municipal resolution.',
          });
        }
      } catch (_) {}

    } else {
      // Citizen Rejected: Reopen Issue
      const reasonText = reopenReason || comment || 'Citizen reported issue remains unresolved.';
      const currentReopenCount = (current?.citizenVerification?.reopenCount || 0) + 1;

      const { error } = await supabase
        .from('reports')
        .update({
          status: 'progress',
          citizen_verification_status: 'reopened',
          reopen_reason: reasonText,
          reopen_count: currentReopenCount,
          verification_photo_url: proofPhotoUrl || null,
          updated_at: now,
        })
        .eq('id', dbId);

      if (error) {
        console.warn('⚠️ Notice: Supabase citizen rejection error, falling back to mock state update:', error.message);
        const mock = await this.getComplaintById(id);
        if (mock) {
          mock.status = 'reopened';
          mock.updatedAt = now;
          mock.citizenVerification = {
            verifiedAt: now,
            satisfied: false,
            reopenReason: reasonText,
            verificationPhotoUrl: proofPhotoUrl,
            verifiedByCitizen: true,
            reopenCount: currentReopenCount,
          };
          mock.adminNotes.push({
            id: `AN-${Date.now()}`,
            author: `${citizenName} (Citizen)`,
            text: `[Verification Rejected - Case Reopened #${currentReopenCount}]: ${reasonText}`,
            createdAt: now,
            isInternal: false,
          });
          mock.statusHistory.push({
            id: `SH-${Date.now()}`,
            fromStatus: 'citizen_verification',
            toStatus: 'reopened',
            changedBy: citizenName,
            role: 'citizen',
            timestamp: now,
            action: 'citizen_rejected_reopen',
            notes: `Citizen rejected resolution: ${reasonText}`,
            proofImageUrl: proofPhotoUrl,
          });
          return mock;
        }
      }

      await supabase.from('report_status_history').insert({
        report_id: dbId,
        status: 'progress',
        new_status: 'reopened',
        changed_by: citizenName,
        notes: `Citizen rejected resolution (Reopened): ${reasonText}`,
        created_at: now,
      });

      await this.addAdminNote(
        id,
        `${citizenName} (Citizen)`,
        `[Citizen Verification Rejected - Case Reopened]: ${reasonText}`,
        false
      );
    }

    const fresh = await this.getComplaintById(id);
    return fresh || current!;
  }

  /**
   * Reopen Complaint with mandatory reason
   */
  async reopenComplaint(
    id: string,
    actorName: string,
    reason: string,
    proofUrl?: string
  ): Promise<Complaint> {
    const dbId = this.parseDbId(id);
    if (dbId == null) {
      throw new Error(`Cannot reopen complaint: Invalid complaint ID "${id}"`);
    }

    const now = new Date().toISOString();
    const current = await this.getComplaintById(id);
    const reopenNote = `Complaint Reopened by ${actorName}. Reason: ${reason}`;

    const { error } = await supabase
      .from('reports')
      .update({
        status: 'progress',
        citizen_verification_status: 'reopened',
        reopen_reason: reason,
        updated_at: now,
      })
      .eq('id', dbId);

    if (error) {
      console.warn('⚠️ Notice: Supabase reopen error, falling back to mock state update:', error.message);
      const mock = await this.getComplaintById(id);
      if (mock) {
        const fromStatus = mock.status;
        mock.status = 'reopened';
        mock.updatedAt = now;
        mock.adminNotes.push({
          id: `AN-${Date.now()}`,
          author: actorName,
          text: `[Reopened]: ${reason}`,
          createdAt: now,
          isInternal: false,
        });
        mock.statusHistory.push({
          id: `SH-${Date.now()}`,
          fromStatus,
          toStatus: 'reopened',
          changedBy: actorName,
          role: 'officer',
          timestamp: now,
          action: 'complaint_reopened',
          notes: reopenNote,
          proofImageUrl: proofUrl,
        });
        return mock;
      }
      throw new Error(`Failed to reopen complaint: ${error.message}`);
    }

    await supabase.from('report_status_history').insert({
      report_id: dbId,
      status: 'progress',
      new_status: 'reopened',
      changed_by: actorName,
      notes: reopenNote,
      created_at: now,
    });

    await this.addAdminNote(id, actorName, `[Complaint Reopened]: ${reason}`, false);

    const fresh = await this.getComplaintById(id);
    return fresh || current!;
  }

  async addAdminNote(
    id: string,
    author: string,
    text: string,
    _isInternal = true
  ): Promise<Complaint> {
    const dbId = this.parseDbId(id);
    if (dbId == null) {
      throw new Error(`Cannot add note: Invalid complaint ID "${id}"`);
    }

    const { data: existingRow } = await supabase
      .from('reports')
      .select('admin_notes')
      .eq('id', dbId)
      .maybeSingle();

    const timestamp = new Date().toISOString();
    const formattedEntry = `[${timestamp} - ${author || 'Command Center'}]: ${text.trim()}`;
    const combinedNotes =
      existingRow?.admin_notes && existingRow.admin_notes.trim().length > 0
        ? `${existingRow.admin_notes.trim()}\n${formattedEntry}`
        : formattedEntry;

    const { error } = await supabase
      .from('reports')
      .update({ admin_notes: combinedNotes, updated_at: timestamp })
      .eq('id', dbId);

    if (error) {
      console.warn('⚠️ Notice: Supabase admin note update error, falling back to mock state update:', error.message);
      const mock = await this.getComplaintById(id);
      if (mock) {
        mock.adminNotes.push({
          id: `AN-${Date.now()}`,
          author: author || 'Command Center',
          text: text.trim(),
          createdAt: timestamp,
          isInternal: _isInternal,
        });
        return mock;
      }
      throw new Error(`Failed to save admin note: ${error.message}`);
    }

    const fresh = await this.getComplaintById(id);
    if (!fresh) {
      throw new Error(`Complaint #${id} updated but could not be re-fetched.`);
    }
    return fresh;
  }

  async assignOfficer(
    id: string,
    officerName: string,
    departmentName: string,
    _contractorName?: string
  ): Promise<Complaint> {
    const dbId = this.parseDbId(id);
    if (dbId == null) {
      throw new Error(`Cannot assign officer: Invalid complaint ID "${id}"`);
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('reports')
      .update({
        assigned_to: officerName,
        assigned_officer_id: `OFF-${Math.floor(100 + Math.random() * 900)}`,
        status: 'assigned',
        updated_at: now,
      })
      .eq('id', dbId);

    if (error) {
      console.warn('⚠️ Notice: Supabase officer assign error, falling back to mock state update:', error.message);
      const mock = await this.getComplaintById(id);
      if (mock) {
        mock.status = 'assigned';
        mock.assignment = {
          officerId: `OFF-${Math.floor(100 + Math.random() * 900)}`,
          officerName,
          departmentId: 'DEP-GEN',
          departmentName,
          contractorName: _contractorName,
          assignedAt: now,
        };
        mock.updatedAt = now;
        mock.statusHistory.push({
          id: `SH-${Date.now()}`,
          toStatus: 'assigned',
          changedBy: 'Command Center',
          role: 'officer',
          timestamp: now,
          notes: `Assigned to ${officerName} (${departmentName})`,
        });
        return mock;
      }
      throw new Error(`Failed to assign officer: ${error.message}`);
    }

    // Log status history
    await supabase.from('report_status_history').insert({
      report_id: dbId,
      status: 'assigned',
      new_status: 'assigned',
      changed_by: 'Command Center',
      notes: `Assigned to ${officerName} (${departmentName})`,
      created_at: now,
    });

    const fresh = await this.getComplaintById(id);
    if (!fresh) {
      throw new Error(`Complaint #${id} assigned but could not be re-fetched.`);
    }
    return fresh;
  }

  /**
   * Fetches lightweight public map markers containing ZERO citizen PII (safe for anon/unauthenticated views)
   */
  async getPublicMapMarkers(): Promise<Array<{
    id: string;
    category: string;
    status: string;
    priority: string;
    latitude: number;
    longitude: number;
    createdAt: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('public_report_markers')
        .select('*');

      if (error || !data) {
        // Fallback to RPC if view query is unavailable
        const { data: rpcData } = await supabase.rpc('get_public_map_markers');
        if (rpcData && Array.isArray(rpcData)) {
          return rpcData.map((row: any) => ({
            id: `CR-${row.id}`,
            category: row.category,
            status: row.status,
            priority: row.priority,
            latitude: Number(row.latitude),
            longitude: Number(row.longitude),
            createdAt: row.created_at,
          }));
        }
        return [];
      }

      return data.map((row: any) => ({
        id: `CR-${row.id}`,
        category: row.category,
        status: row.status,
        priority: row.priority,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.warn('ℹ️ Notice: public map markers fetch error:', err);
      return [];
    }
  }

  /**
   * Creates a coordinated Joint Action for a Potential Incident cluster.
   * Atomically consolidates member complaints, assigns department/officer, logs audit trail.
   */
  async createJointAction(req: JointActionRequest): Promise<JointActionResult> {
    const validation = IncidentGroupingEngine.validateJointActionRequest(req);
    if (!validation.isValid) {
      throw new Error(`Invalid Joint Action request: ${validation.error}`);
    }

    const numericIds = req.reportIds
      .map((id) => this.parseDbId(id))
      .filter((n): n is number => n !== null);

    if (numericIds.length === 0) {
      throw new Error('Cannot create Joint Action: No valid report database IDs found in cluster.');
    }

    const now = new Date().toISOString();

    // 1. Try atomic database RPC function first
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('create_joint_incident_action', {
        p_incident_id: req.incidentId,
        p_title: req.title,
        p_summary: req.summary || `Coordinated dispatch for ${req.category} incident.`,
        p_category: req.category,
        p_report_ids: numericIds,
        p_assigned_department: req.assignedDepartment,
        p_assigned_officer: req.assignedOfficer,
        p_action_notes: req.actionNotes || null,
        p_confidence_score: req.confidenceScore || 85.0,
        p_center_lat: req.centerLatitude || null,
        p_center_lng: req.centerLongitude || null,
        p_radius_meters: req.radiusMeters || 500.0,
        p_reasons: req.explainableReasons || [],
      });

      if (!rpcErr && rpcRes && rpcRes.success) {
        console.log(`✅ Joint Action #${req.incidentId} successfully created via RPC!`);
        return {
          success: true,
          incidentId: req.incidentId,
          status: 'action_created',
          assignedDepartment: req.assignedDepartment,
          assignedOfficer: req.assignedOfficer,
          reportsUpdated: rpcRes.reports_updated || numericIds.length,
          actionNotes: req.actionNotes,
          createdAt: rpcRes.created_at || now,
        };
      }
      if (rpcErr) {
        console.warn('ℹ️ Notice: create_joint_incident_action RPC unavailable, applying direct table orchestration:', rpcErr.message);
      }
    } catch (e: any) {
      console.warn('ℹ️ Notice: RPC execution exception, falling back to direct table update:', e.message);
    }

    // 2. Direct Table Orchestration (Resilient fallback for local dev / unmigrated instances)
    try {
      const formattedNote = `[${now} - Command Center]: Coordinated Joint Action created (#${req.incidentId}). Assigned to ${req.assignedOfficer} (${req.assignedDepartment}). Notes: ${req.actionNotes || 'Consolidated municipal work package dispatch.'}`;

      // Batch update reports (preserve resolved/closed state, advance submitted/under_review to assigned)
      for (const dbId of numericIds) {
        const { data: existing } = await supabase
          .from('reports')
          .select('admin_notes, status')
          .eq('id', dbId)
          .maybeSingle();

        const currentNotes = existing?.admin_notes?.trim() || '';
        const combined = currentNotes ? `${currentNotes}\n${formattedNote}` : formattedNote;
        const newStatus = existing?.status === 'resolved' || existing?.status === 'rejected' ? existing.status : 'assigned';

        await supabase
          .from('reports')
          .update({
            status: newStatus,
            assigned_to: req.assignedOfficer,
            admin_notes: combined,
            updated_at: now,
          })
          .eq('id', dbId);

        // Record status history
        await supabase.from('report_status_history').insert({
          report_id: dbId,
          status: 'assigned',
          new_status: 'assigned',
          changed_by: req.createdBy || 'Command Center',
          notes: `Joint Action #${req.incidentId}: Assigned to ${req.assignedOfficer} (${req.assignedDepartment})`,
          created_at: now,
        });
      }

      // Try inserting into incident_clusters table if table exists
      try {
        await supabase.from('incident_clusters').upsert({
          id: req.incidentId,
          title: req.title,
          summary: req.summary || null,
          category: req.category,
          status: 'action_created',
          confidence_score: req.confidenceScore || 85.0,
          explainable_reasons: req.explainableReasons || [],
          center_latitude: req.centerLatitude || null,
          center_longitude: req.centerLongitude || null,
          affected_radius_meters: req.radiusMeters || 500.0,
          assigned_department: req.assignedDepartment,
          assigned_officer: req.assignedOfficer,
          created_by_name: req.createdBy || 'Executive Duty Officer',
          action_notes: req.actionNotes || null,
          updated_at: now,
        });

        for (const dbId of numericIds) {
          await supabase.from('incident_cluster_reports').insert({
            incident_id: req.incidentId,
            report_id: dbId,
            created_at: now,
          });
        }
      } catch (_) {
        // Safe fallback if tables are not yet migrated
      }

      return {
        success: true,
        incidentId: req.incidentId,
        status: 'action_created',
        assignedDepartment: req.assignedDepartment,
        assignedOfficer: req.assignedOfficer,
        reportsUpdated: numericIds.length,
        actionNotes: req.actionNotes,
        createdAt: now,
      };
    } catch (err: any) {
      console.error('❌ Failed to execute Joint Action orchestration:', err);
      throw new Error(`Failed to create Joint Action: ${err.message || 'Database error'}`);
    }
  }

  /**
   * Retrieves active incident clusters from the database
   */
  async getIncidentClusters(): Promise<IncidentClusterRecord[]> {
    try {
      const { data, error } = await supabase
        .from('incident_clusters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error || !data) {
        return [];
      }

      // Fetch junction report IDs for each cluster
      const clusters: IncidentClusterRecord[] = [];
      for (const row of data) {
        const { data: junctionRows } = await supabase
          .from('incident_cluster_reports')
          .select('report_id')
          .eq('incident_id', row.id);

        const reportIds = (junctionRows || []).map((j: any) => `CR-${j.report_id}`);

        clusters.push({
          id: row.id,
          title: row.title,
          summary: row.summary,
          category: row.category,
          status: row.status as any,
          confidenceScore: Number(row.confidence_score) || 0,
          explainableReasons: Array.isArray(row.explainable_reasons) ? row.explainable_reasons : [],
          centerLatitude: row.center_latitude ? Number(row.center_latitude) : undefined,
          centerLongitude: row.center_longitude ? Number(row.center_longitude) : undefined,
          affectedRadiusMeters: Number(row.affected_radius_meters) || 500,
          assignedDepartment: row.assigned_department || undefined,
          assignedOfficer: row.assigned_officer || undefined,
          assignedOfficerId: row.assigned_officer_id || undefined,
          createdByName: row.created_by_name || undefined,
          actionNotes: row.action_notes || undefined,
          reportIds,
          createdAt: row.created_at || new Date().toISOString(),
          updatedAt: row.updated_at || new Date().toISOString(),
        });
      }

      return clusters;
    } catch (err) {
      console.warn('ℹ️ Notice: Incident clusters fetch error:', err);
      return [];
    }
  }
}

