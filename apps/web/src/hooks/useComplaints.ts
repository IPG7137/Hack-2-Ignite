import { useState, useEffect, useCallback, useRef } from 'react';
import { Complaint, ComplaintStatus } from '../types/complaint';
import { complaintService } from '../services/complaintService';
import { SupabaseComplaintService } from '../services/supabaseComplaintService';
import { ComplaintFilterParams } from '../services/api.interface';
import { supabase } from '../services/supabaseClient';
import { useAuthContext } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';

import { JointActionRequest, JointActionResult, IncidentClusterRecord } from '../services/incidentGroupingEngine';

export function useComplaints(initialFilters: ComplaintFilterParams = {}) {
  const { user, isAuthenticated } = useAuthContext();
  const { organizationType, districtId, municipalCorporationId, zone } = useOrganization();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [incidentClusters, setIncidentClusters] = useState<IncidentClusterRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ComplaintFilterParams>(initialFilters);
  // Track org context to detect changes that require a re-fetch
  const prevOrgRef = useRef<string>('');

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const activeZone =
        user?.role === 'zone_admin'
          ? (user.zone || user.ward || zone)
          : (filters.zone || zone);

      const targetDistrictId =
        user?.role === 'zone_admin' || user?.role === 'district_admin'
          ? (user.districtId || districtId)
          : districtId;

      const mergedFilters: ComplaintFilterParams = {
        ...filters,
        organizationType,
        districtId: targetDistrictId || undefined,
        corporationId: municipalCorporationId || undefined,
        zone: activeZone || undefined,
      };

      const [data, clusters] = await Promise.all([
        complaintService.getComplaints(mergedFilters),
        complaintService.getIncidentClusters().catch(() => []),
      ]);
      setComplaints(data);
      setIncidentClusters(clusters);
    } catch (err: any) {
      console.error('❌ Error fetching complaints in useComplaints:', err);
      setError(err.message || 'Failed to fetch complaints');
    } finally {
      setLoading(false);
    }
  }, [filters, isAuthenticated, user?.id, user?.role, user?.districtId, user?.zone, organizationType, districtId, municipalCorporationId, zone]);

  // Re-fetch when the org context changes (district/corporation/zone switch) or filters change
  useEffect(() => {
    fetchComplaints();
  }, [organizationType, districtId, municipalCorporationId, zone, filters, fetchComplaints]);

  // Live Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('complaints-live-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        (payload) => {
          console.log('📡 Realtime report update detected:', payload.eventType);
          SupabaseComplaintService.invalidateCache();
          fetchComplaints();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'report_status_history' },
        (payload) => {
          console.log('📡 Realtime status history update detected:', payload.eventType);
          SupabaseComplaintService.invalidateCache();
          fetchComplaints();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'incident_clusters' },
        (payload) => {
          console.log('📡 Realtime incident cluster update detected:', payload.eventType);
          SupabaseComplaintService.invalidateCache();
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

  const createJointAction = async (req: JointActionRequest): Promise<JointActionResult> => {
    const result = await complaintService.createJointAction(req);
    await fetchComplaints();
    return result;
  };

  const changePriority = async (
    id: string,
    newPriority: import('../types/complaint').ComplaintPriority,
    actorName = 'Executive Duty Officer',
    reason?: string
  ) => {
    const updated = await complaintService.changePriority(id, newPriority, actorName, reason);
    setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const submitResolution = async (
    id: string,
    officerName: string,
    resolutionNotes: string,
    proofImageUrl?: string
  ) => {
    const updated = await complaintService.submitResolution(id, officerName, resolutionNotes, proofImageUrl);
    setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const submitCitizenVerification = async (
    id: string,
    satisfied: boolean,
    comment?: string,
    reopenReason?: string,
    proofPhotoUrl?: string
  ) => {
    const updated = await complaintService.submitCitizenVerification(id, satisfied, comment, reopenReason, proofPhotoUrl);
    setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const reopenComplaint = async (
    id: string,
    actorName: string,
    reason: string,
    proofUrl?: string
  ) => {
    const updated = await complaintService.reopenComplaint(id, actorName, reason, proofUrl);
    setComplaints((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const submitComplaint = async (params: import('../services/api.interface').CreateComplaintParams): Promise<Complaint> => {
    const newComplaint = await complaintService.submitComplaint(params);
    setComplaints((prev) => [newComplaint, ...prev]);
    return newComplaint;
  };

  const getComplaintById = async (id: string): Promise<Complaint | null> => {
    return await complaintService.getComplaintById(id);
  };

  return {
    complaints,
    incidentClusters,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchComplaints,
    submitComplaint,
    updateStatus,
    assignOfficer,
    addAdminNote,
    changePriority,
    submitResolution,
    submitCitizenVerification,
    reopenComplaint,
    createJointAction,
    getComplaintById,
  };
}
