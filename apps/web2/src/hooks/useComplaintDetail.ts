import { useState, useEffect, useCallback } from 'react';
import { Complaint, ComplaintStatus } from '../types/complaint';
import { complaintService } from '../services/complaintService';

export function useComplaintDetail(id: string | null) {
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!id) {
      setComplaint(null);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await complaintService.getComplaintById(id);
      setComplaint(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch complaint detail');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const updateStatus = async (
    newStatus: ComplaintStatus,
    officerName: string,
    notes?: string,
    proofImageUrl?: string
  ) => {
    if (!id) return null;
    const updated = await complaintService.updateStatus(id, newStatus, officerName, notes, proofImageUrl);
    setComplaint(updated);
    return updated;
  };

  const addAdminNote = async (author: string, text: string, isInternal = true) => {
    if (!id) return null;
    const updated = await complaintService.addAdminNote(id, author, text, isInternal);
    setComplaint(updated);
    return updated;
  };

  return {
    complaint,
    loading,
    error,
    refetch: fetchDetail,
    updateStatus,
    addAdminNote,
  };
}
