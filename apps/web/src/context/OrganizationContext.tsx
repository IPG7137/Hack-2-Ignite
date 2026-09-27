import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MunicipalCorporation,
  MaharashtraDistrict,
  ALL_MUNICIPAL_CORPORATIONS,
  MAHARASHTRA_DISTRICTS,
  getCorporationById,
} from '../data/maharashtraDistricts';

export type OrganizationType = 'STATE' | 'DISTRICT' | 'MUNICIPAL_CORPORATION';

export interface OrgMapCenter {
  lat: number;
  lng: number;
  zoom: number;
}

export interface OrganizationContextValue {
  organizationType: OrganizationType;
  stateName: string;
  division: string | null;
  district: string | null;
  districtId: string | null;
  municipalCorporationId: string | null;
  municipalCorporationName: string | null;
  currentCorporation: MunicipalCorporation | null;
  currentDistrict: MaharashtraDistrict | null;
  /** Stable geographic center for the current org context — use this for the map */
  mapCenter: OrgMapCenter;
  setOrganization: (
    type: OrganizationType,
    districtId?: string | null,
    corporationId?: string | null
  ) => void;
  resetToDefault: () => void;
}

// Maharashtra geographic center (fallback for state-level view)
const MAHARASHTRA_CENTER: OrgMapCenter = { lat: 18.8, lng: 76.5, zoom: 7.0 };

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

const STORAGE_KEY = 'civicresolve_org_context';

function getMapCenterForContext(
  type: OrganizationType,
  districtId: string | null,
  corporationId: string | null
): OrgMapCenter {
  if (type === 'STATE') return MAHARASHTRA_CENTER;

  // Corporation-level: use corporation's exact coordinates
  if (corporationId) {
    const corp = getCorporationById(corporationId);
    if (corp) return { lat: corp.coordinates.lat, lng: corp.coordinates.lng, zoom: 12.5 };
  }

  // District-level: average coordinates of all corporations in the district
  if (districtId) {
    const dist = MAHARASHTRA_DISTRICTS.find((d) => d.id === districtId);
    if (dist && dist.corporations.length > 0) {
      const lats = dist.corporations.map((c) => c.coordinates.lat);
      const lngs = dist.corporations.map((c) => c.coordinates.lng);
      const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
      const avgLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;
      return { lat: avgLat, lng: avgLng, zoom: dist.corporations.length > 1 ? 11.0 : 12.5 };
    }
  }

  return MAHARASHTRA_CENTER;
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          organizationType: (parsed.organizationType || 'MUNICIPAL_CORPORATION') as OrganizationType,
          districtId: parsed.districtId !== undefined ? parsed.districtId : 'pune',
          corporationId: parsed.corporationId !== undefined ? parsed.corporationId : 'pmc',
        };
      }
    } catch (_) {}
    return {
      organizationType: 'MUNICIPAL_CORPORATION' as OrganizationType,
      districtId: 'pune',
      corporationId: 'pmc',
    };
  };

  const initial = getInitialState();
  const [organizationType, setOrganizationType] = useState<OrganizationType>(initial.organizationType);
  const [districtId, setDistrictId] = useState<string | null>(initial.districtId);
  const [corporationId, setCorporationId] = useState<string | null>(initial.corporationId);

  // Re-sync from localStorage after mount (handles stale state from previous session)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.organizationType) setOrganizationType(parsed.organizationType);
        if (parsed.districtId !== undefined) setDistrictId(parsed.districtId);
        if (parsed.corporationId !== undefined) setCorporationId(parsed.corporationId);
      }
    } catch (_) {}
  }, []);

  const setOrganization = (
    type: OrganizationType,
    newDistrictId?: string | null,
    newCorporationId?: string | null
  ) => {
    setOrganizationType(type);
    if (type === 'STATE') {
      setDistrictId(null);
      setCorporationId(null);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ organizationType: 'STATE', districtId: null, corporationId: null })
      );
    } else {
      const finalDistId = newDistrictId ?? districtId ?? 'pune';
      const finalCorpId = newCorporationId ?? corporationId ?? null;
      setDistrictId(finalDistId);
      setCorporationId(finalCorpId);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          organizationType: type,
          districtId: finalDistId,
          corporationId: finalCorpId,
        })
      );
    }
  };

  const resetToDefault = () => {
    setOrganization('MUNICIPAL_CORPORATION', 'pune', 'pmc');
  };

  // Derive current district object
  const currentDistrict = districtId
    ? MAHARASHTRA_DISTRICTS.find((d) => d.id === districtId) || null
    : null;

  // Derive current corporation object
  const currentCorporation = corporationId ? getCorporationById(corporationId) || null : null;

  // Derive district display name (fallback: from corporation's district field)
  const districtName =
    currentDistrict?.name ||
    currentCorporation?.district ||
    null;

  // Derive division
  const division = currentDistrict?.division || null;

  // Derive corporation display name
  const municipalCorporationName =
    currentCorporation?.name ||
    (districtName ? `${districtName} Municipal Corporation` : null);

  // Stable map center for current context
  const mapCenter = getMapCenterForContext(organizationType, districtId, corporationId);

  const value: OrganizationContextValue = {
    organizationType,
    stateName: 'Maharashtra',
    division,
    district: districtName,
    districtId,
    municipalCorporationId: corporationId,
    municipalCorporationName,
    currentCorporation,
    currentDistrict,
    mapCenter,
    setOrganization,
    resetToDefault,
  };

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
};

export const useOrganization = (): OrganizationContextValue => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
