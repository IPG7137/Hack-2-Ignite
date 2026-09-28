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
import { supabase } from '../services/supabaseClient';

export function useCivicRewards() {
  const { user } = useAuthContext();
  const { organizationType, districtId } = useOrganization();

  // Resolved active district: user district, or organization district (strictly no silent Solapur fallback)
  const activeDistrictId = districtId || (user as any)?.districtId || '';

  const [citizenProfile, setCitizenProfile] = useState<CitizenCivicProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<DistrictLeaderboardEntry[]>([]);
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

      if (organizationType === 'STATE') {
        // State Admin view: Load statewide metrics across all 9 districts
        const [stateStats, cycles, distLeaderboard, profile] = await Promise.all([
          civicRewardsService.getStatewideEngagementStats(),
          civicRewardsService.getRecognitionCycles(),
          civicRewardsService.getDistrictLeaderboard(activeDistrictId, userId),
          civicRewardsService.getCitizenProfile(userId, activeDistrictId),
        ]);

        setStatewideStats(stateStats);
        setRecognitionCycles(cycles);
        setLeaderboard(distLeaderboard);
        setCitizenProfile(profile);

        if (profile) {
          const contribs = await civicRewardsService.getContributionHistory(profile.id);
          setContributions(contribs);
        }
      } else {
        // District / Citizen view: Load strictly isolated district data
        const [profile, distLeaderboard, distStats, cycles] = await Promise.all([
          civicRewardsService.getCitizenProfile(userId, activeDistrictId),
          civicRewardsService.getDistrictLeaderboard(activeDistrictId, userId),
          civicRewardsService.getDistrictEngagementStats(activeDistrictId),
          civicRewardsService.getRecognitionCycles(activeDistrictId),
        ]);

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
      setError(err.message || 'Failed to load civic rewards data');
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeDistrictId, organizationType]);

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

  useEffect(() => {
    fetchRewardsData();
  }, [fetchRewardsData]);

  // Supabase Realtime subscription for instant score updates
  useEffect(() => {
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
