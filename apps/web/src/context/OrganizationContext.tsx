import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  MunicipalCorporation,
  MaharashtraDistrict,
  MAHARASHTRA_DISTRICTS,
  getCorporationById,
} from '../data/maharashtraDistricts';
import { AuthService } from '../services/authService';

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
  zone: string | null;
  zoneName: string | null;
  municipalCorporationId: string | null;
  municipalCorporationName: string | null;
  currentCorporation: MunicipalCorporation | null;
  currentDistrict: MaharashtraDistrict | null;
  /** Stable geographic center for the current org context — use this for the map */
  mapCenter: OrgMapCenter;
  setOrganization: (
    type: OrganizationType,
    districtId?: string | null,
    corporationId?: string | null,
    zone?: string | null
  ) => void;
  resetToDefault: () => void;
}

// Maharashtra geographic centroid (optimal center and zoom for statewide GIS framing)
const MAHARASHTRA_CENTER: OrgMapCenter = { lat: 18.9, lng: 76.7, zoom: 6.2 };

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined);

const STORAGE_KEY = 'civicresolve_org_context';

function getMapCenterForContext(
  type: OrganizationType,
  districtId: string | null,
  corporationId: string | null,
  zone: string | null
): OrgMapCenter {
  if (type === 'STATE') return MAHARASHTRA_CENTER;

  // Zone-level specialized coordinates
  if (zone) {
    const lz = zone.toLowerCase();
    if (lz.includes('north') || lz.includes('saat rasta')) {
      return { lat: 17.6685, lng: 75.9042, zoom: 13.5 };
    }
    if (lz.includes('south') || lz.includes('hotgi')) {
      return { lat: 17.6380, lng: 75.9020, zoom: 13.5 };
    }
    if (lz.includes('kothrud') || lz.includes('zone 2')) {
      return { lat: 18.5074, lng: 73.8077, zoom: 13.5 };
    }
    if (lz.includes('ghole') || lz.includes('zone 3')) {
      return { lat: 18.5284, lng: 73.8415, zoom: 13.5 };
    }
  }

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

function getStoredUser() {
  try {
    const saved = localStorage.getItem('civicresolve_user');
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return null;
}

export const OrganizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getInitialState = () => {
    const storedUser = getStoredUser();

    // If an administrative user is logged in, their assigned role strictly determines jurisdiction
    if (storedUser?.role === 'zone_admin') {
      return {
        organizationType: 'MUNICIPAL_CORPORATION' as OrganizationType,
        districtId: storedUser.districtId || 'solapur',
        corporationId: storedUser.districtId === 'solapur' ? 'smc' : (storedUser.districtId === 'pune' ? 'pmc' : null),
        zone: storedUser.zone || 'Solapur North',
      };
    }

    if (storedUser?.role === 'district_admin') {
      return {
        organizationType: 'MUNICIPAL_CORPORATION' as OrganizationType,
        districtId: storedUser.districtId || 'solapur',
        corporationId: storedUser.districtId === 'solapur' ? 'smc' : (storedUser.districtId === 'pune' ? 'pmc' : null),
        zone: null,
      };
    }

    if (storedUser?.role === 'state_admin') {
      return {
        organizationType: 'STATE' as OrganizationType,
        districtId: null,
        corporationId: null,
        zone: null,
      };
    }

    if (storedUser?.role === 'citizen' && storedUser?.districtId) {
      const dist = storedUser.districtId;
      const corp = MAHARASHTRA_DISTRICTS.find((d) => d.id === dist)?.corporations[0]?.id || null;
      return {
        organizationType: 'MUNICIPAL_CORPORATION' as OrganizationType,
        districtId: dist,
        corporationId: corp,
        zone: storedUser.zone || null,
      };
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          organizationType: (parsed.organizationType || 'MUNICIPAL_CORPORATION') as OrganizationType,
          districtId: parsed.districtId !== undefined ? parsed.districtId : 'solapur',
          corporationId: parsed.corporationId !== undefined ? parsed.corporationId : 'smc',
          zone: parsed.zone || null,
        };
      }
    } catch (_) {}
    return {
      organizationType: 'MUNICIPAL_CORPORATION' as OrganizationType,
      districtId: 'solapur',
      corporationId: 'smc',
      zone: null,
    };
  };

  const initial = getInitialState();
  const [organizationType, setOrganizationType] = useState<OrganizationType>(initial.organizationType);
  const [districtId, setDistrictId] = useState<string | null>(initial.districtId);
  const [corporationId, setCorporationId] = useState<string | null>(initial.corporationId);
  const [zone, setZone] = useState<string | null>(initial.zone);

  // Sync state and enforce strict RBAC locks
  useEffect(() => {
    const storedUser = getStoredUser();

    // STRICT LOCK: Zone Admin is locked to assigned district & zone
    if (storedUser?.role === 'zone_admin') {
      setOrganizationType('MUNICIPAL_CORPORATION');
      setDistrictId(storedUser.districtId);
      setZone(storedUser.zone);
      return;
    }

    // STRICT LOCK: District Admin is locked to assigned district
    if (storedUser?.role === 'district_admin') {
      setOrganizationType('MUNICIPAL_CORPORATION');
      setDistrictId(storedUser.districtId);
      return;
    }

    // State Admin
    if (storedUser?.role === 'state_admin') {
      setOrganizationType('STATE');
      setDistrictId(null);
      setZone(null);
      return;
    }

    // STRICT LOCK: Citizen is locked to their home municipality
    if (storedUser?.role === 'citizen' && storedUser?.districtId) {
      const dist = storedUser.districtId;
      const corp = MAHARASHTRA_DISTRICTS.find((d) => d.id === dist)?.corporations[0]?.id || null;
      setOrganizationType('MUNICIPAL_CORPORATION');
      setDistrictId(dist);
      setCorporationId(corp);
      setZone(storedUser.zone || null);
      return;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.organizationType) setOrganizationType(parsed.organizationType);
        if (parsed.districtId !== undefined) setDistrictId(parsed.districtId);
        if (parsed.corporationId !== undefined) setCorporationId(parsed.corporationId);
        if (parsed.zone !== undefined) setZone(parsed.zone);
      }
    } catch (_) {}
  }, []);

  const setOrganization = (
    type: OrganizationType,
    newDistrictId?: string | null,
    newCorporationId?: string | null,
    newZone?: string | null
  ) => {
    const storedUser = getStoredUser();

    // STRICT SECURITY BOUNDARY:
    // A Zone Admin CANNOT escape their assigned district or zone
    if (storedUser?.role === 'zone_admin') {
      const lockedDist = storedUser.districtId;
      const lockedZone = storedUser.zone;
      setOrganizationType('MUNICIPAL_CORPORATION');
      setDistrictId(lockedDist);
      setZone(lockedZone);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          organizationType: 'MUNICIPAL_CORPORATION',
          districtId: lockedDist,
          corporationId: corporationId,
          zone: lockedZone,
        })
      );
      return;
    }

    // STRICT SECURITY BOUNDARY:
    // A District Admin CANNOT escape their assigned district
    if (storedUser?.role === 'district_admin') {
      const lockedDist = storedUser.districtId;
      const finalCorpId = newCorporationId ?? corporationId ?? null;
      const finalZone = newZone ?? null;
      setOrganizationType('MUNICIPAL_CORPORATION');
      setDistrictId(lockedDist);
      setCorporationId(finalCorpId);
      setZone(finalZone);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          organizationType: 'MUNICIPAL_CORPORATION',
          districtId: lockedDist,
          corporationId: finalCorpId,
          zone: finalZone,
        })
      );
      return;
    }

    // STRICT SECURITY BOUNDARY:
    // An Authenticated Citizen is strictly bound to their home municipality
    if (storedUser?.role === 'citizen' && storedUser?.districtId) {
      const lockedDist = storedUser.districtId;
      const corp = MAHARASHTRA_DISTRICTS.find((d) => d.id === lockedDist)?.corporations[0]?.id || null;
      setOrganizationType('MUNICIPAL_CORPORATION');
      setDistrictId(lockedDist);
      setCorporationId(corp);
      setZone(storedUser.zone || null);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          organizationType: 'MUNICIPAL_CORPORATION',
          districtId: lockedDist,
          corporationId: corp,
          zone: storedUser.zone || null,
        })
      );
      return;
    }

    // State Admin or General Navigation
    setOrganizationType(type);
    if (type === 'STATE') {
      setDistrictId(null);
      setCorporationId(null);
      setZone(null);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ organizationType: 'STATE', districtId: null, corporationId: null, zone: null })
      );
    } else {
      const finalDistId = newDistrictId ?? districtId ?? 'solapur';
      const finalCorpId = newCorporationId ?? corporationId ?? null;
      const finalZone = newZone ?? null;
      setDistrictId(finalDistId);
      setCorporationId(finalCorpId);
      setZone(finalZone);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          organizationType: type,
          districtId: finalDistId,
          corporationId: finalCorpId,
          zone: finalZone,
        })
      );
    }
  };

  const resetToDefault = () => {
    const storedUser = getStoredUser();
    if (storedUser?.role === 'zone_admin') {
      setOrganization('MUNICIPAL_CORPORATION', storedUser.districtId, null, storedUser.zone);
    } else if (storedUser?.role === 'district_admin') {
      setOrganization('MUNICIPAL_CORPORATION', storedUser.districtId, null, null);
    } else {
      setOrganization('STATE', null, null, null);
    }
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
    (districtId ? districtId.toUpperCase() : null);

  // Derive division
  const division = currentDistrict?.division || null;

  // Derive corporation display name
  const municipalCorporationName =
    currentCorporation?.name ||
    (districtName ? `${districtName} Municipal Corporation` : null);

  // Stable map center for current context
  const mapCenter = getMapCenterForContext(organizationType, districtId, corporationId, zone);

  const value: OrganizationContextValue = {
    organizationType,
    stateName: 'Maharashtra',
    division,
    district: districtName,
    districtId,
    zone,
    zoneName: zone,
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
