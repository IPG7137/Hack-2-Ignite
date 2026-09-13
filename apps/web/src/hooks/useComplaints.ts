import { useState, useEffect, useCallback } from 'react';
import { Complaint, ComplaintStatus } from '../types/complaint';
import { complaintService } from '../services/complaintService';
import { ComplaintFilterParams } from '../services/api.interface';
import { supabase } from '../services/supabaseClient';

export function useComplaints(initialFilters: ComplaintFilterParams = {}) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ComplaintFilterParams>(initialFilters);

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await complaintService.getComplaints(filters);
      setComplaints(data);
    } catch (err: any) {
      console.error('❌ Error fetching complaints in useComplaints:', err);
      setError(err.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Live Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('complaints-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          console.log('📡 Realtime report update detected:', payload.eventType);
          fetchComplaints();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'report_status_history' },
        (payload) => {
          console.log('📡 Realtime status history update detected:', payload.eventType);
          fetchComplaints();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchComplaints]);

  const updateStatus = async (
    id: string,
    newStatus: ComplaintStatus,
    officerName = 'Executive Duty Officer',
    notes?: string,
    proofImageUrl?: string
  ) => {
    const updated = await complaintService.updateStatus(id, newStatus, officerName, notes, proofImageUrl);
    setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const assignOfficer = async (
    id: string,
    officerName: string,
    departmentName: string,
    contractorName?: string
  ) => {
    const updated = await complaintService.assignOfficer(id, officerName, departmentName, contractorName);
    setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const addAdminNote = async (
    id: string,
    text: string,
    author = 'Executive Duty Officer',
    isInternal = true
  ) => {
    const updated = await complaintService.addAdminNote(id, author, text, isInternal);
    setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const getComplaintById = async (id: string): Promise<Complaint | null> => {
    return await complaintService.getComplaintById(id);
  };

  return {
    complaints,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchComplaints,
    updateStatus,
    assignOfficer,
    addAdminNote,
    getComplaintById,
  };
}
