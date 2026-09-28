import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Award,
  Users,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Landmark,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Calendar,
  Sparkles,
  TreePine,
} from 'lucide-react';
import { useCivicRewards } from '../hooks/useCivicRewards';
import { useOrganization } from '../context/OrganizationContext';
import { CitizenImpactCard } from '../components/rewards/CitizenImpactCard';
import { DistrictLeaderboardCard } from '../components/rewards/DistrictLeaderboardCard';
import { RecognitionFrameworkCard } from '../components/rewards/RecognitionFrameworkCard';
import { ContributionHistoryModal } from '../components/rewards/ContributionHistoryModal';
import { CivicOccasionRecognitionSection } from '../components/rewards/CivicOccasionRecognitionSection';
import { CivicCertificateModal } from '../components/rewards/CivicCertificateModal';
import { PlantRedemptionModal } from '../components/rewards/PlantRedemptionModal';
import { MunicipalRedemptionQueue } from '../components/rewards/MunicipalRedemptionQueue';
import { MAHARASHTRA_DISTRICTS, MaharashtraDistrict } from '../data/maharashtraDistricts';
import { civicRecognitionService } from '../services/civicRecognitionService';
import { CivicCertificate, CivicRedemption } from '../types/civicRecognition';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export const CivicChampions: React.FC = () => {
  const {
    citizenProfile,
    leaderboard,
    contributions,
    districtStats,
    statewideStats,
    recognitionCycles,
    loading,
    refresh,
    activeDistrictId,
  } = useCivicRewards();

  const { organizationType, setOrganization } = useOrganization();
  const isStateAdmin = organizationType === 'STATE';
  const isMunicipalStaff = organizationType === 'DISTRICT' || organizationType === 'STATE';

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedStateDistrict, setSelectedStateDistrict] = useState<string>(activeDistrictId || 'pune');

  // Task 08 Civic Recognition & Certificates State
  const [userCertificates, setUserCertificates] = useState<CivicCertificate[]>([]);
  const [userRedemptions, setUserRedemptions] = useState<CivicRedemption[]>([]);
  const [districtRedemptions, setDistrictRedemptions] = useState<CivicRedemption[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CivicCertificate | null>(null);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [selectedCertForPlant, setSelectedCertForPlant] = useState<CivicCertificate | null>(null);
  const [isPlantModalOpen, setIsPlantModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'RECOGNITION' | 'LEADERBOARD' | 'MUNICIPAL_DESK'>('RECOGNITION');

  // Resolve current district object
  const currentDistrictObj = MAHARASHTRA_DISTRICTS.find(
    (d) => d.id === (isStateAdmin ? selectedStateDistrict : activeDistrictId)
  ) || MAHARASHTRA_DISTRICTS[0];

  const loadRecognitionData = async () => {
    try {
      const certs = await civicRecognitionService.getUserCertificates(citizenProfile?.userId);
      const userReds = await civicRecognitionService.getUserRedemptions(citizenProfile?.userId);
      const distReds = await civicRecognitionService.getDistrictRedemptions(currentDistrictObj.id);

      setUserCertificates(certs);
      setUserRedemptions(userReds);
      setDistrictRedemptions(distReds);
    } catch (err) {
      console.error('Failed to load recognition data:', err);
    }
  };

  useEffect(() => {
    loadRecognitionData();
  }, [citizenProfile?.userId, currentDistrictObj.id]);

  const handleOpenCertificate = (cert: CivicCertificate) => {
    setSelectedCertificate(cert);
    setIsCertificateModalOpen(true);
  };

  const handleOpenPlantRedemption = (cert: CivicCertificate) => {
    setSelectedCertForPlant(cert);
    setIsPlantModalOpen(true);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* ==================================================
          PAGE HEADER
          ================================================== */}
      <div className="p-4 sm:p-5 bg-white border border-[#D9E2EC] rounded-xl shadow-xs space-y-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-1 rounded-md bg-[#1769D2]/10 text-[#1769D2]">
                <Trophy className="w-5 h-5 text-[#1769D2]" />
              </span>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#526581]">
                CIVICRESOLVE
              </span>
              <span className="text-slate-300">/</span>
              <h1 className="text-base sm:text-lg font-bold text-[#123B6D] tracking-tight">
                {isStateAdmin
                  ? 'Maharashtra Statewide Civic Champions & Citizen Recognition'
                  : `${currentDistrictObj.name} District Civic Recognition & Champions`}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 text-[#1769D2] border border-blue-200 font-bold uppercase">
                {isStateAdmin ? 'Level 1 Oversight' : `${currentDistrictObj.division} Division`}
              </span>
            </div>
            <p className="text-xs text-[#526581] mt-1">
              Verified civic contributions • Official occasion recognition • Tamper-verified digital certificates • Municipal sapling redemptions
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refresh();
                loadRecognitionData();
              }}
              className="h-8 text-xs font-semibold text-[#1769D2] border-blue-200 hover:bg-blue-50 gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Sync Recognition Data</span>
            </Button>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="flex items-center gap-2 pt-3 border-t border-[#E8EEF5]">
          <button
            type="button"
            onClick={() => setActiveTab('RECOGNITION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'RECOGNITION'
                ? 'bg-[#1769D2] text-white shadow-xs'
                : 'text-[#526581] hover:bg-slate-100'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Civic Recognition & Occasions</span>
            {userCertificates.length > 0 && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                {userCertificates.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LEADERBOARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'LEADERBOARD'
                ? 'bg-[#1769D2] text-white shadow-xs'
                : 'text-[#526581] hover:bg-slate-100'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>District Participation & Tiers</span>
          </button>

          {isMunicipalStaff && (
            <button
              type="button"
              onClick={() => setActiveTab('MUNICIPAL_DESK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'MUNICIPAL_DESK'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-50'
              }`}
            >
              <TreePine className="w-3.5 h-3.5" />
              <span>Nursery Plant Desk</span>
              {districtRedemptions.length > 0 && (
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">
                  {districtRedemptions.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* ==================================================
          STATE ADMIN OVERVIEW (IF IN STATE MODE)
          ================================================== */}
      {isStateAdmin && statewideStats && (
        <>
          {/* Statewide Summary KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
              <div className="flex items-center justify-between text-[#526581] text-xs font-semibold">
                <span>Active Citizens</span>
                <Users className="w-4 h-4 text-[#1769D2]" />
              </div>
              <div className="text-2xl font-bold text-[#172B4D] mt-1.5">
                {statewideStats.totalActiveCitizens.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#718096] mt-0.5">Across 9 Districts</div>
            </Card>

            <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
              <div className="flex items-center justify-between text-[#526581] text-xs font-semibold">
                <span>Verified Contributors</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-700 mt-1.5">
                {statewideStats.totalVerifiedContributors.toLocaleString()}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium mt-0.5">Quality Confirmed</div>
            </Card>

            <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
              <div className="flex items-center justify-between text-[#526581] text-xs font-semibold">
                <span>Total Civic Points</span>
                <Award className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-bold text-amber-700 mt-1.5">
                {statewideStats.totalCivicScore.toLocaleString()}
              </div>
              <div className="text-[10px] text-[#718096] mt-0.5">Verified Quality Points</div>
            </Card>

            <Card className="p-3.5 bg-white border-[#D9E2EC] shadow-2xs">
              <div className="flex items-center justify-between text-[#526581] text-xs font-semibold">
                <span>Resolutions Verified</span>
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
              </div>
              <div className="text-2xl font-bold text-teal-700 mt-1.5">
                {statewideStats.totalResolutionsVerified.toLocaleString()}
              </div>
              <div className="text-[10px] text-teal-700 font-medium mt-0.5">On-Site Citizen Audits</div>
            </Card>
          </div>

          {/* District-by-District Civic Engagement Progress */}
          <Card className="bg-white border-[#D9E2EC] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E8EEF5] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#1769D2]" />
                <h2 className="text-xs font-bold text-[#123B6D] uppercase tracking-wider">
                  District-Wise Civic Engagement & Participation
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-[#1769D2] border border-blue-200">
                  9 Districts Monitored
                </span>
              </div>
              <span className="text-[10px] text-[#718096] font-mono">Anti-Spam Triage Active</span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {statewideStats.districts.map((d) => (
                <div
                  key={d.districtId}
                  className={`p-3.5 rounded-lg border transition-all ${
                    selectedStateDistrict === d.districtId
                      ? 'bg-blue-50/70 border-[#1769D2] ring-2 ring-blue-200'
                      : 'bg-[#F8FAFC] border-[#E8EEF5] hover:bg-white hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs font-bold text-[#123B6D]">{d.districtName} District</div>
                      <div className="text-[10px] text-[#718096] font-mono">{d.division} Division</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      OPERATIONAL
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-center mb-2.5">
                    <div className="bg-white rounded p-1.5 border border-[#E8EEF5]">
                      <div className="text-xs font-bold text-[#172B4D]">{d.activeCitizensCount}</div>
                      <div className="text-[9px] text-[#718096]">Citizens</div>
                    </div>
                    <div className="bg-white rounded p-1.5 border border-[#E8EEF5]">
                      <div className="text-xs font-bold text-amber-700">{d.totalCivicScore}</div>
                      <div className="text-[9px] text-[#718096]">Points</div>
                    </div>
                    <div className="bg-white rounded p-1.5 border border-[#E8EEF5]">
                      <div className="text-xs font-bold text-teal-700">{d.resolutionVerificationsCount}</div>
                      <div className="text-[9px] text-[#718096]">Audits</div>
                    </div>
                  </div>

                  {d.topChampionName && (
                    <div className="text-[10px] bg-white rounded p-1.5 border border-[#E8EEF5] flex items-center justify-between text-[#526581] mb-2 font-mono">
                      <span>🥇 Champion: <strong>{d.topChampionName}</strong></span>
                      <span className="font-bold text-[#1769D2]">{d.topChampionScore} pts</span>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStateDistrict(d.districtId);
                    }}
                    className="w-full h-7 text-[11px] text-[#1769D2] border-blue-200 hover:bg-blue-50 gap-1 font-semibold"
                  >
                    <span>Inspect {d.districtName} Recognition</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* ==================================================
          TAB CONTENT
          ================================================== */}
      {activeTab === 'RECOGNITION' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column: Citizen Impact Card */}
            <div className="space-y-5 lg:col-span-1">
              <CitizenImpactCard
                profile={citizenProfile}
                rank={leaderboard.find((l) => l.isCurrentUser)?.rank || 1}
                districtName={currentDistrictObj.name}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
              />

              <RecognitionFrameworkCard
                cycles={recognitionCycles}
                leaderboard={leaderboard}
                districtName={currentDistrictObj.name}
              />
            </div>

            {/* Right Column: Occasions & Certificates Section */}
            <div className="lg:col-span-2 space-y-5">
              <CivicOccasionRecognitionSection
                profile={citizenProfile}
                certificates={userCertificates}
                redemptions={userRedemptions}
                districtName={currentDistrictObj.name}
                onViewCertificate={handleOpenCertificate}
                onOpenPlantRedemption={handleOpenPlantRedemption}
                onRefresh={() => {
                  refresh();
                  loadRecognitionData();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'LEADERBOARD' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-5 lg:col-span-1">
            <CitizenImpactCard
              profile={citizenProfile}
              rank={leaderboard.find((l) => l.isCurrentUser)?.rank || 1}
              districtName={currentDistrictObj.name}
              onOpenHistory={() => setIsHistoryModalOpen(true)}
            />
          </div>

          <div className="lg:col-span-2">
            <DistrictLeaderboardCard
              entries={leaderboard}
              districtName={currentDistrictObj.name}
              divisionName={currentDistrictObj.division}
              currentUserId={citizenProfile?.userId}
            />
          </div>
        </div>
      )}

      {activeTab === 'MUNICIPAL_DESK' && (
        <MunicipalRedemptionQueue
          districtId={currentDistrictObj.id}
          districtName={currentDistrictObj.name}
          isStaff={isMunicipalStaff}
          redemptions={districtRedemptions}
          onRefresh={loadRecognitionData}
        />
      )}

      {/* ==================================================
          MODALS
          ================================================== */}
      {/* Contribution History Audit Trail Modal */}
      <ContributionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        contributions={contributions}
        citizenName={citizenProfile?.displayName}
        civicScore={citizenProfile?.civicScore}
        districtName={currentDistrictObj.name}
      />

      {/* Official Digital Certificate Modal */}
      <CivicCertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        certificate={selectedCertificate}
        onOpenPlantRedemption={handleOpenPlantRedemption}
      />

      {/* Government Nursery Plant Sapling Redemption Modal */}
      <PlantRedemptionModal
        isOpen={isPlantModalOpen}
        onClose={() => setIsPlantModalOpen(false)}
        certificate={selectedCertForPlant}
        existingRedemption={
          userRedemptions.find((r) => r.certificateId === selectedCertForPlant?.id) || null
        }
        onRedemptionCreated={() => {
          loadRecognitionData();
        }}
      />
    </div>
  );
};

export default CivicChampions;
