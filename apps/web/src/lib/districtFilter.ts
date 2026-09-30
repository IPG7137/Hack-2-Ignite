import { Complaint } from '../types/complaint';
import { MaharashtraDistrict } from '../data/maharashtraDistricts';

/**
 * Checks whether a given complaint belongs to a specific Maharashtra District.
 * Supports:
 * 1. Explicit ID prefix conventions (e.g., CR-PUN, CR-SOL, CR-NSK, CR-CSN, etc.)
 * 2. Assigned department / corporation short names (e.g., CSMC, PMC, SMC, NMC, BMC, TMC, KMC, AMC)
 * 3. Geodesic coordinate proximity (< ~55km / 0.55 deg from municipal headquarters)
 * 4. Text matching across location address, landmark, ward, zone, and landmark aliases.
 */
export function isComplaintInDistrict(complaint: Complaint, district: MaharashtraDistrict): boolean {
  if (!complaint || !district) return false;

  const idLower = (complaint.id || '').toLowerCase();

  // 1. Direct ID Prefix Map (Strict Mutual Exclusion)
  const districtIdPrefixMap: Record<string, string[]> = {
    pune: ['cr-pun', 'pun'],
    solapur: ['cr-sol', 'sol'],
    nashik: ['cr-nsk', 'nsk', 'nas'],
    chhatrapati_sambhajinagar: ['cr-csn', 'cr-csm', 'csn', 'csmc'],
    mumbai: ['cr-mum', 'mum', 'bmc'],
    nagpur: ['cr-ngp', 'ngp'],
    thane: ['cr-thn', 'thn', 'tmc'],
    kolhapur: ['cr-klp', 'klp', 'kmc'],
    amravati: ['cr-amr', 'amr', 'amc'],
  };

  for (const [distId, prefixes] of Object.entries(districtIdPrefixMap)) {
    const hasPrefix = prefixes.some((p) => idLower.startsWith(p) || idLower.startsWith(`cr-${p}`));
    if (hasPrefix) {
      return distId === district.id;
    }
  }

  // 2. Department & Officer Assignment Check
  const deptInfo = `${complaint.assignment?.departmentId || ''} ${complaint.assignment?.departmentName || ''} ${complaint.assignment?.officerId || ''} ${complaint.assignment?.contractorName || ''}`.toLowerCase();
  for (const corp of district.corporations) {
    if (corp.shortName && deptInfo.includes(corp.shortName.toLowerCase())) {
      return true;
    }
    if (corp.id && deptInfo.includes(corp.id.toLowerCase())) {
      return true;
    }
  }

  // 3. Coordinate Proximity Matching (within ~55 km / 0.55 degrees)
  const lat = complaint.location?.latitude;
  const lng = complaint.location?.longitude;
  if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
    for (const corp of district.corporations) {
      const dLat = Math.abs(lat - corp.coordinates.lat);
      const dLng = Math.abs(lng - corp.coordinates.lng);
      if (dLat < 0.55 && dLng < 0.55) {
        return true;
      }
    }
  }

  // 4. Text Keywords in Address, Landmark, Ward, Zone, Title, Description
  const fullText = `${complaint.location?.address || ''} ${complaint.location?.landmark || ''} ${complaint.location?.ward || ''} ${complaint.location?.zone || ''} ${complaint.title || ''} ${complaint.description || ''}`.toLowerCase();

  const distName = district.name.toLowerCase();
  if (fullText.includes(distName) || fullText.includes(district.id.toLowerCase())) {
    return true;
  }

  // Known city & landmark aliases
  const districtAliases: Record<string, string[]> = {
    chhatrapati_sambhajinagar: [
      'sambhajinagar',
      'aurangabad',
      'kham river',
      'bibi ka maqbara',
      'gul mandi',
      'paithan road',
      'cidco aurangabad',
      'csmc',
    ],
    pune: ['pune', 'pcmc', 'deccan', 'kothrud', 'viman nagar', 'hadapsar', 'hinjawadi', 'wakad', 'shivajinagar', 'pmc'],
    solapur: ['solapur', 'navi peth', 'sadar bazar', 'saat rasta', 'siddheshwar', 'smc'],
    nashik: ['nashik', 'panchavati', 'cbs', 'cidco nashik', 'satpur', 'gangapur', 'nmc'],
    mumbai: ['mumbai', 'dadar', 'bandra', 'andheri', 'worli', 'kurla', 'borivali', 'colaba', 'chembur', 'bmc', 'mcgm'],
    nagpur: ['nagpur', 'sitabuldi', 'dharampeth', 'itwari', 'sadar nagpur', 'nmc nagpur'],
    thane: ['thane', 'teen haath', 'naupada', 'ghodbunder', 'majiwada', 'kalyan', 'dombivli', 'navi mumbai', 'tmc', 'nmmc', 'kdmc'],
    kolhapur: ['kolhapur', 'mahalaxmi', 'rajarampuri', 'rankala', 'shahupuri', 'kmc'],
    amravati: ['amravati', 'rajkamal', 'badnera', 'gadge nagar', 'amc'],
  };

  const aliases = districtAliases[district.id] || [];
  for (const alias of aliases) {
    if (fullText.includes(alias)) {
      return true;
    }
  }

  for (const corp of district.corporations) {
    if (
      (corp.shortName && fullText.includes(corp.shortName.toLowerCase())) ||
      (corp.id && fullText.includes(corp.id.toLowerCase())) ||
      (corp.name && fullText.includes(corp.name.toLowerCase()))
    ) {
      return true;
    }
  }

  return false;
}
