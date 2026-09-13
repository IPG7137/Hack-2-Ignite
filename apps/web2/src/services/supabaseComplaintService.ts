import { Complaint, ComplaintStatus } from '../types/complaint';
import { IComplaintService, ComplaintFilterParams } from './api.interface';
import { supabase } from './supabaseClient';
import { mapSupabaseRowToComplaint } from './reportAdapter';

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
}
