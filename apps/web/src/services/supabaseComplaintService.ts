import { Complaint, ComplaintStatus } from '../types/complaint';
import { IComplaintService, ComplaintFilterParams } from './api.interface';
import { supabase } from './supabaseClient';
import { mapSupabaseRowToComplaint } from './reportAdapter';
import {
  JointActionRequest,
  JointActionResult,
  IncidentClusterRecord,
  IncidentGroupingEngine,
} from './incidentGroupingEngine';

export class SupabaseComplaintService implements IComplaintService {
  /**
   * Helper to parse string ID (e.g. "CR-12" or "12") to integer DB ID
   */
  private parseDbId(id: string): number | null {
    const cleaned = id.replace(/^CR-/, '').trim();
    const num = parseInt(cleaned, 10);
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

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase getComplaints query failed:', error.message);
      throw new Error(`Failed to load complaints from database: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ Live database returned 0 reports (empty table or filter match)');
      return [];
    }

    console.log(`✅ Fetched ${data.length} live reports from Supabase`);
    let mapped = data.map((row) => mapSupabaseRowToComplaint(row));

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
    if (dbId == null) {
      console.warn(`⚠️ Invalid complaint ID format: "${id}"`);
      return null;
    }

    // 1. Fetch report row
    const { data: reportData, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', dbId)
      .maybeSingle();

    if (reportError) {
      console.error(`❌ Error fetching complaint #${id} from Supabase:`, reportError.message);
      throw new Error(`Failed to retrieve complaint #${id}: ${reportError.message}`);
    }

    if (!reportData) {
      console.log(`ℹ️ Report #${id} not found in database`);
      return null;
    }

    // 2. Fetch status history
    const { data: historyData, error: historyError } = await supabase
      .from('report_status_history')
      .select('*')
      .eq('report_id', dbId)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.warn(`⚠️ Note: Could not fetch status history for #${id}:`, historyError.message);
    }

    return mapSupabaseRowToComplaint(reportData, historyData || []);
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

    const now = new Date().toISOString();

    // Map web2 status to database status column
    const dbStatus =
      newStatus === 'verified'
        ? 'resolved'
        : newStatus;

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
    if (newStatus === 'verified' || newStatus === 'closed' || newStatus === 'resolution_submitted') {
      updatePayload.completion_date = now;
    }

    // 1. Update report
    const { error: updateError } = await supabase
      .from('reports')
      .update(updatePayload)
      .eq('id', dbId);

    if (updateError) {
      console.error('❌ Failed to update report status in Supabase:', updateError.message);
      throw new Error(`Database status update failed: ${updateError.message}`);
    }

    // 2. Insert into status history
    const { error: historyInsertError } = await supabase
      .from('report_status_history')
      .insert({
        report_id: dbId,
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
      console.error('❌ Failed to add admin note in Supabase:', error.message);
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
      console.error('❌ Failed to assign officer in Supabase:', error.message);
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

