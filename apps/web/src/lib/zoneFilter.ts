import { Complaint } from '../types/complaint';

/**
 * Checks whether a complaint is within the operational scope of a user's assigned zone/ward.
 * 
 * Strict Isolation Rules:
 * - Zone Admin is strictly scoped to their assigned zone (e.g. Solapur North, Solapur South, Zone 1, Zone 2, etc.).
 * - Data belonging to another zone MUST be rejected.
 * - Cross-district grievances are NEVER allowed.
 */
export function isComplaintInZone(complaint: Complaint | any, targetZoneOrWard: string = 'Zone 2'): boolean {
  if (!complaint) return false;
  
  let ward = '';
  let zone = '';
  let address = '';
  let landmark = '';
  let locStr = '';

  if (complaint.location && typeof complaint.location === 'object') {
    ward = (complaint.location.ward || '').toLowerCase();
    zone = (complaint.location.zone || '').toLowerCase();
    address = (complaint.location.address || '').toLowerCase();
    landmark = (complaint.location.landmark || '').toLowerCase();
  } else if (typeof complaint.location === 'string') {
    locStr = complaint.location.toLowerCase();
  }

  const topWard = (complaint.ward || '').toLowerCase();
  const topZone = (complaint.zone || '').toLowerCase();
  const topAddress = (complaint.address || '').toLowerCase();
  const title = (complaint.title || '').toLowerCase();
  const description = (complaint.description || '').toLowerCase();

  const complaintDistrict = (complaint.district_id || complaint.districtId || complaint.district || '').toLowerCase().trim();
  const target = targetZoneOrWard.toLowerCase().trim();

  // If complaint has a specified district and target specifies a district, enforce strict district match
  if (complaintDistrict) {
    if (target.includes('solapur') && complaintDistrict !== 'solapur') return false;
    if (target.includes('pune') && complaintDistrict !== 'pune') return false;
    if (target.includes('nashik') && complaintDistrict !== 'nashik') return false;
    if ((target.includes('sambhajinagar') || target.includes('csn')) && 
        !(complaintDistrict.includes('sambhajinagar') || complaintDistrict === 'csn')) return false;
  }

  const combined = `${ward} ${zone} ${address} ${landmark} ${locStr} ${topWard} ${topZone} ${topAddress} ${title} ${description}`;

  // 1. SOLAPUR NORTH SPECIFIC ISOLATION
  if (target.includes('solapur north') || target === 'north zone' || target === 'north') {
    // If complaint is from another district or explicitly in Solapur South, reject immediately
    if (
      (complaintDistrict && complaintDistrict !== 'solapur') ||
      combined.includes('south') ||
      combined.includes('zone 3') ||
      combined.includes('zone 4') ||
      combined.includes('hotgi road') ||
      combined.includes('vijapur road') ||
      combined.includes('jule solapur') ||
      combined.includes('ward 03') ||
      combined.includes('ward 04')
    ) {
      return false;
    }
    // Must belong to Solapur North areas (Zone 1 / Zone 2 / Saat Rasta / Navi Peth / Sadar Bazar / Civil Lines / Old City)
    return (
      combined.includes('north') ||
      combined.includes('zone 1') ||
      combined.includes('zone 2') ||
      combined.includes('saat rasta') ||
      combined.includes('sadar bazar') ||
      combined.includes('navi peth') ||
      combined.includes('civil lines') ||
      combined.includes('old city') ||
      combined.includes('ward 01') ||
      combined.includes('ward 02') ||
      combined.includes('ward 1') ||
      combined.includes('ward 2')
    );
  }

  // 2. SOLAPUR SOUTH SPECIFIC ISOLATION
  if (target.includes('solapur south') || target === 'south zone' || target === 'south') {
    // If complaint is explicitly in Solapur North, reject immediately
    if (
      combined.includes('north') ||
      combined.includes('zone 1') ||
      combined.includes('zone 2') ||
      combined.includes('saat rasta') ||
      combined.includes('sadar bazar') ||
      combined.includes('navi peth') ||
      combined.includes('civil lines') ||
      combined.includes('ward 01') ||
      combined.includes('ward 02')
    ) {
      return false;
    }
    // Must belong to Solapur South areas (Zone 3 / Zone 4 / Hotgi Road / Vijapur Road / Jule Solapur)
    return (
      combined.includes('south') ||
      combined.includes('zone 3') ||
      combined.includes('zone 4') ||
      combined.includes('hotgi road') ||
      combined.includes('vijapur road') ||
      combined.includes('jule solapur') ||
      combined.includes('ward 03') ||
      combined.includes('ward 04') ||
      combined.includes('ward 3') ||
      combined.includes('ward 4')
    );
  }

  // 3. NUMERIC ZONE MATCHING (Zone 1, Zone 2, Zone 3, Zone 4, Zone 5...)
  const targetNumMatch = target.match(/zone\s*([0-9]+)/i) || target.match(/ward\s*([0-9]+)/i);
  if (targetNumMatch) {
    const targetNum = targetNumMatch[1];
    
    // Check if the complaint explicitly matches this zone number
    const zoneNumMatch = zone.match(/zone\s*([0-9]+)/i);
    const wardNumMatch = ward.match(/ward\s*0?([0-9]+)/i);

    if (zoneNumMatch) {
      return zoneNumMatch[1] === targetNum;
    }
    if (wardNumMatch) {
      return wardNumMatch[1] === targetNum;
    }

    // Direct text checks for the specific number
    const matchesTarget =
      combined.includes(`zone ${targetNum}`) ||
      combined.includes(`zone-${targetNum}`) ||
      combined.includes(`ward ${targetNum}`) ||
      combined.includes(`ward 0${targetNum}`) ||
      combined.includes(`ward-${targetNum}`);

    // If it contains a DIFFERENT zone explicitly, reject
    const hasDifferentZone = new RegExp(`zone\\s*(?!${targetNum})[0-9]+`, 'i').test(combined);
    if (hasDifferentZone) {
      return false;
    }

    return matchesTarget;
  }

  // 4. ALPHABETICAL ZONE MATCHING (Zone A, Zone B, Zone C...)
  const letterMatch = target.match(/zone\s*([a-z])/i);
  if (letterMatch) {
    const letter = letterMatch[1].toLowerCase();
    const mappedNum = letter === 'a' ? '1' : letter === 'b' ? '2' : letter === 'c' ? '3' : '4';
    
    // Check if complaint matches letter or mapped numeric equivalent
    if (combined.includes(`zone ${letter}`) || combined.includes(`zone-${letter}`)) return true;
    if (combined.includes(`zone ${mappedNum}`) || combined.includes(`zone-${mappedNum}`)) return true;
    return false;
  }

  // 5. DIRECT SUBSTRING MATCHING FOR NAMED ZONES
  if (target.length > 2 && combined.includes(target)) {
    return true;
  }

  return false;
}
