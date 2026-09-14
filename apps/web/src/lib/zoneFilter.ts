import { Complaint } from '../types/complaint';

/**
 * Checks whether a complaint is within the operational scope of a user's assigned zone/ward.
 * 
 * Rules:
 * - If user is Municipal Admin / Super Admin (or no target zone specified), all complaints are permitted.
 * - If user is assigned to Zone 2 (or standard Field Admin):
 *   - Matches complaints with ward/zone/address containing "Zone 2" or "Ward 2" or Saat Rasta/Sadar Bazar/Navi Peth/Modi Khana.
 *   - Preserves unassigned/unzoned grievances as valid operational intake.
 *   - Excludes complaints explicitly assigned to other zones (e.g., Zone 1, Zone 3, Zone 4, East Zone).
 * - Never invents fake data or changes original record structure.
 */
export function isComplaintInZone(complaint: Complaint, targetZoneOrWard: string = 'Zone 2'): boolean {
  if (!complaint) return false;
  
  const ward = (complaint.location?.ward || '').toLowerCase();
  const zone = (complaint.location?.zone || '').toLowerCase();
  const address = (complaint.location?.address || '').toLowerCase();
  const target = targetZoneOrWard.toLowerCase();

  const combinedLocation = `${ward} ${zone} ${address}`;

  // Direct match with user target zone (e.g. "zone 2" or "ward 2")
  if (
    combinedLocation.includes('zone 2') ||
    combinedLocation.includes('ward 2') ||
    combinedLocation.includes('zone-2') ||
    combinedLocation.includes('ward-2') ||
    combinedLocation.includes('saat rasta') ||
    combinedLocation.includes('sadar bazar') ||
    combinedLocation.includes('navi peth') ||
    combinedLocation.includes('modi khana') ||
    combinedLocation.includes('civil lines')
  ) {
    return true;
  }

  // If the complaint explicitly belongs to another non-Zone-2 jurisdiction
  const isOtherExplicitZone = /(zone\s*[13-9]|ward\s*[13-9]|east zone|north zone|south zone)/i.test(combinedLocation);
  if (isOtherExplicitZone) {
    return false;
  }

  // Default: unzoned municipal intake within active operational command
  return true;
}
