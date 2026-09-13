import { IComplaintService } from './api.interface';
import { SupabaseComplaintService } from './supabaseComplaintService';

/**
 * Live Supabase-backed complaint service singleton.
 * Strictly queries public.reports and public.report_status_history.
 * No mock/demo fallback in production flow.
 */
export const complaintService: IComplaintService = new SupabaseComplaintService();
