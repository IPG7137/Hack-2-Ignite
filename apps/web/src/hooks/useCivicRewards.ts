import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CitizenCivicProfile,
  CivicContribution,
  DistrictLeaderboardEntry,
  DistrictRecognitionCycle,
  DistrictEngagementStats,
} from '../types/civicRewards';
import { civicRewardsService, RecordContributionParams } from '../services/civicRewardsService';
import { useAuthContext } from '../context/AuthContext';
import { useOrganization } from '../context/OrganizationContext';
import { supabase, isLiveSupabaseAvailable } from '../services/supabaseClient';

export function useCivicRewards(overrideDistrictId?: string) {
  const { user } = useAuthContext();
  const { organizationType, districtId } = useOrganization();

  // Strict Active District Resolution:
  // 1. If explicit override is provided in STATE mode (e.g. State Admin inspecting a specific district)
  // 2. For district-bound users (citizen, district_admin, zone_admin), strictly lock to user.districtId.
  // 3. For state administrators, use the selected organization district.
  // 4. Fallback to organization district or user district.
  const activeDistrictId = (
    overrideDistrictId && organizationType === 'STATE'
      ? overrideDistrictId
      : user?.role !== 'state_admin' && user?.districtId
      ? user.districtId
      : districtId || user?.districtId || 'solapur'
  ).toLowerCase().trim();

  const [citizenProfile, setCitizenProfile] = useState<CitizenCivicProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<DistrictLeaderboardEntry[]>([]);
  const [isLiveDataset, setIsLiveDataset] = useState<boolean>(false);
  const [contributions, setContributions] = useState<CivicContribution[]>([]);
  const [districtStats, setDistrictStats] = useState<DistrictEngagementStats | null>(null);
  const [statewideStats, setStatewideStats] = useState<{
    districts: DistrictEngagementStats[];
    totalActiveCitizens: number;
    totalVerifiedContributors: number;
    totalCivicScore: number;
    totalResolutionsVerified: number;
  } | null>(null);
  const [recognitionCycles, setRecognitionCycles] = useState<DistrictRecognitionCycle[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const prevDistrictRef = useRef<string>('');

  const fetchRewardsData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!activeDistrictId && organizationType !== 'STATE') {
        setError('District context required. Please select or authenticate with an authorized district.');
        setLoading(false);
        return;
      }

      const userId = user?.id || 'USER-CITIZEN-CURRENT';
      const userMeta = {
        fullName: user?.fullName,
        email: user?.email,
        role: user?.role,
      };

      if (organizationType === 'STATE') {
        // State Admin view: Load statewide metrics across all 9 districts
        const [stateStats, cycles, profile] = await Promise.all([
          civicRewardsService.getStatewideEngagementStats(),
          civicRewardsService.getRecognitionCycles(),
          civicRewardsService.getCitizenProfile(userId, activeDistrictId, userMeta),
        ]);

        const distLeaderboard = await civicRewardsService.getDistrictLeaderboard(activeDistrictId, userId, profile);
        setIsLiveDataset(Boolean((distLeaderboard as any).isLiveDatabase));

        setStatewideStats(stateStats);
        setRecognitionCycles(cycles);
        setLeaderboard(distLeaderboard);
        setCitizenProfile(profile);

        if (profile) {
          const contribs = await civicRewardsService.getContributionHistory(profile.id);
          setContributions(contribs);
        }
      } else {
        // District / Citizen view: Load strictly isolated district data in parallel
        const [profile, distLeaderboard, cycles] = await Promise.all([
          civicRewardsService.getCitizenProfile(userId, activeDistrictId, userMeta),
          civicRewardsService.getDistrictLeaderboard(activeDistrictId, userId),
          civicRewardsService.getRecognitionCycles(activeDistrictId),
        ]);

        // Merge profile into distLeaderboard if the citizen has positive verified civic score
        if (profile && profile.civicScore > 0 && profile.districtId === activeDistrictId) {
          const existingIdx = distLeaderboard.findIndex((l) => l.userId === profile.userId);
          if (existingIdx >= 0) {
            distLeaderboard[existingIdx] = {
              ...distLeaderboard[existingIdx],
              civicScore: profile.civicScore,
              verifiedReportsCount: profile.verifiedReportsCount,
              verifiedResolutionsCount: profile.verifiedResolutionsCount,
              helpfulEvidenceCount: profile.helpfulEvidenceCount,
              badgeLevel: profile.badgeLevel,
            };
          }
        }

        const distStats = await civicRewardsService.getDistrictEngagementStats(activeDistrictId, distLeaderboard);

        setIsLiveDataset(Boolean((distLeaderboard as any).isLiveDatabase));
        setCitizenProfile(profile);
        setLeaderboard(distLeaderboard);
        setDistrictStats(distStats);
        setRecognitionCycles(cycles);

        if (profile) {
          const contribs = await civicRewardsService.getContributionHistory(profile.id);
          setContributions(contribs);
        }
      }
    } catch (err: any) {
      console.error('❌ Error in useCivicRewards:', err);
      setError(err.message || 'Unable to load contribution data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.fullName, user?.email, user?.role, activeDistrictId, organizationType]);

  // Re-fetch on district or organization changes
  useEffect(() => {
    const key = `${organizationType}::${activeDistrictId}`;
    if (key !== prevDistrictRef.current) {
      prevDistrictRef.current = key;
      // Immediately clear previous district data to avoid any cross-district ghosting
      setLeaderboard([]);
      setContributions([]);
      setCitizenProfile(null);
      fetchRewardsData();
    }
  }, [organizationType, activeDistrictId, fetchRewardsData]);

  // Supabase Realtime subscription for instant score updates (only when live backend is connected)
  useEffect(() => {
    if (!isLiveSupabaseAvailable) return;

    const channel = supabase
      .channel('civic-rewards-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'citizen_civic_profiles' },
        () => {
          fetchRewardsData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'civic_contributions' },
        () => {
          fetchRewardsData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reports' },
        () => {
          fetchRewardsData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRewardsData]);

  const recordCivicAction = async (params: RecordContributionParams) => {
    const result = await civicRewardsService.recordContribution(params);
    await fetchRewardsData();
    return result;
  };

  return {
    citizenProfile,
    leaderboard,
    isLiveDataset,
    contributions,
    districtStats,
    statewideStats,
    recognitionCycles,
    loading,
    error,
    activeDistrictId,
    recordCivicAction,
    refresh: fetchRewardsData,
  };
}
