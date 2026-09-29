/**
 * Live Commuter Hazard Radar Service for CIVICRESOLVE
 * 
 * Provides real-time geolocation tracking and proximity hazard alerting for commuters.
 * When a citizen or field crew travels towards or near an unresolved civic problem
 * (such as a hazardous road pothole, open manhole, high pressure water flooding,
 * dark corridor blackout, or cave-in), the system alerts the user with dynamic
 * distance countdown, visual warning HUD, and actionable safety guidance.
 */

import { Complaint, IncidentCategory } from '../types/complaint';

export interface CommuteLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number; // meters per second
  heading?: number; // degrees
  timestamp?: number;
}

export interface CommuteHazardAlert {
  id: string;
  complaintId: string;
  complaintTitle: string;
  category: IncidentCategory;
  categoryLabel: string;
  priority: string;
  distanceMeters: number;
  bearingDegrees: number;
  cardinalDirection: string;
  severity: 'critical' | 'warning' | 'advisory';
  safetyInstruction: string;
  locationAddress: string;
  hazardCoordinates: { latitude: number; longitude: number };
  detectedAt: string;
}

export interface HazardRadarOptions {
  alertRadiusMeters?: number; // Default 300 meters
  criticalRadiusMeters?: number; // Default 100 meters
  onlyUnresolved?: boolean; // Default true
  playSound?: boolean;
  enableVibration?: boolean;
}

/**
 * Calculates spherical distance in meters between two geographic coordinates
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates compass bearing from point 1 to point 2 in degrees (0 - 360)
 */
export function calculateBearingDegrees(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const y = Math.sin(((lon2 - lon1) * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(((lon2 - lon1) * Math.PI) / 180);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Returns human-readable 8-point compass direction
 */
export function getCardinalDirection(bearing: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Formats deterministic safety instruction based on civic problem category and distance
 */
export function generateHazardSafetyInstruction(
  category: IncidentCategory,
  distanceMeters: number,
  title: string
): string {
  if (category === 'roads') {
    if (distanceMeters <= 80) {
      return `CRITICAL: Severe road surface damage immediately ahead (${distanceMeters}m). Reduce speed to under 20 km/h now.`;
    }
    return `Caution: Road pothole / surface damage reported ${distanceMeters}m ahead. Keep safe following distance.`;
  }
  if (category === 'drainage' || category === 'water_sewage') {
    if (distanceMeters <= 80) {
      return `CRITICAL: Road flooding / open drainage manhole hazard ${distanceMeters}m ahead. Avoid deep water patches.`;
    }
    return `Warning: Water accumulation / sewer backflow reported ${distanceMeters}m ahead. Watch for slippery road conditions.`;
  }
  if (category === 'streetlights') {
    return `Advisory: Dark corridor / streetlight failure ${distanceMeters}m ahead. Turn on high beams / pedestrian torch.`;
  }
  if (category === 'waste_management') {
    return `Notice: Garbage overflow / road obstruction ${distanceMeters}m ahead. Watch for debris spilling onto road.`;
  }
  return `Warning: Active civic problem (${title}) located ${distanceMeters}m ahead. Proceed with caution.`;
}

/**
 * Scans active complaints for hazards within proximity radius of current commuter location
 */
export function detectNearbyHazards(
  commuterLocation: CommuteLocation,
  complaints: Complaint[],
  options: HazardRadarOptions = {}
): CommuteHazardAlert[] {
  const alertRadius = options.alertRadiusMeters ?? 300;
  const criticalRadius = options.criticalRadiusMeters ?? 100;
  const onlyUnresolved = options.onlyUnresolved ?? true;

  const alerts: CommuteHazardAlert[] = [];

  for (const c of complaints) {
    if (!c.location?.latitude || !c.location?.longitude) continue;

    // Filter resolved if requested
    if (onlyUnresolved && (c.status === 'verified' || c.status === 'closed' || c.status === 'resolved')) {
      continue;
    }

    const dist = calculateHaversineDistanceMeters(
      commuterLocation.latitude,
      commuterLocation.longitude,
      c.location.latitude,
      c.location.longitude
    );

    if (dist <= alertRadius) {
      const bearing = calculateBearingDegrees(
        commuterLocation.latitude,
        commuterLocation.longitude,
        c.location.latitude,
        c.location.longitude
      );

      const isCritical = dist <= criticalRadius || c.priority === 'urgent';
      const severity: 'critical' | 'warning' | 'advisory' = isCritical
        ? 'critical'
        : dist <= alertRadius * 0.6
        ? 'warning'
        : 'advisory';

      alerts.push({
        id: `radar-alert-${c.id}`,
        complaintId: c.id,
        complaintTitle: c.title,
        category: c.category,
        categoryLabel: c.categoryLabel || c.category,
        priority: c.priority,
        distanceMeters: dist,
        bearingDegrees: Math.round(bearing),
        cardinalDirection: getCardinalDirection(bearing),
        severity,
        safetyInstruction: generateHazardSafetyInstruction(c.category, dist, c.title),
        locationAddress: c.location.address || 'Municipal Road Corridor',
        hazardCoordinates: {
          latitude: c.location.latitude,
          longitude: c.location.longitude,
        },
        detectedAt: new Date().toISOString(),
      });
    }
  }

  // Sort by nearest hazard first
  return alerts.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

/**
 * Synthesizes a safe audio warning chime using Web Audio API
 */
export function playHazardAlertAudio(severity: 'critical' | 'warning' | 'advisory'): void {
  try {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = severity === 'critical' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(severity === 'critical' ? 880 : 587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      severity === 'critical' ? 440 : 880,
      ctx.currentTime + (severity === 'critical' ? 0.35 : 0.25)
    );

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {
    // Audio context may be restricted by autoplay policy; silent fallback
  }
}

/**
 * Commute Hazard Radar Tracking Controller
 */
export class LiveCommuteHazardRadarService {
  private static watchId: number | null = null;
  private static simulationTimer: any = null;
  private static dismissedAlertIds = new Set<string>();

  /**
   * Starts live hardware GPS tracking with automated proximity hazard evaluation
   */
  public static startLiveTracking(
    complaints: Complaint[],
    onLocationUpdate: (loc: CommuteLocation) => void,
    onHazardAlerts: (alerts: CommuteHazardAlert[]) => void,
    options: HazardRadarOptions = {}
  ): boolean {
    this.stopTracking();

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return false;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc: CommuteLocation = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          speed: pos.coords.speed ?? undefined,
          heading: pos.coords.heading ?? undefined,
          timestamp: pos.timestamp,
        };

        onLocationUpdate(loc);

        const allAlerts = detectNearbyHazards(loc, complaints, options);
        const activeAlerts = allAlerts.filter((a) => !this.dismissedAlertIds.has(a.id));

        if (activeAlerts.length > 0) {
          if (options.playSound) {
            playHazardAlertAudio(activeAlerts[0].severity);
          }
          if (options.enableVibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate?.([150, 80, 150]);
          }
        }

        onHazardAlerts(activeAlerts);
      },
      (err) => {
        console.warn('Live commute tracking error:', err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 1000,
      }
    );

    return true;
  }

  /**
   * Starts an interactive simulated travel commute path towards a designated civic problem
   * Enables complete end-to-end verification without requiring physical outdoor walking.
   */
  public static startSimulation(
    targetHazard: Complaint,
    complaints: Complaint[],
    onLocationUpdate: (loc: CommuteLocation) => void,
    onHazardAlerts: (alerts: CommuteHazardAlert[]) => void,
    options: HazardRadarOptions = {}
  ): void {
    this.stopTracking();

    const targetLat = targetHazard.location.latitude;
    const targetLng = targetHazard.location.longitude;

    // Start 600m south-west of the problem
    const startLat = targetLat - 0.0050;
    const startLng = targetLng - 0.0050;

    let step = 0;
    const totalSteps = 25; // 25 intervals of smooth commute motion

    this.simulationTimer = setInterval(() => {
      step++;
      const progress = Math.min(step / totalSteps, 1.0);
      const currentLat = startLat + (targetLat - startLat) * progress;
      const currentLng = startLng + (targetLng - startLng) * progress;

      const loc: CommuteLocation = {
        latitude: Number(currentLat.toFixed(6)),
        longitude: Number(currentLng.toFixed(6)),
        accuracy: 5,
        speed: 8.5, // ~30 km/h driving speed
        heading: 45,
        timestamp: Date.now(),
      };

      onLocationUpdate(loc);

      const allAlerts = detectNearbyHazards(loc, complaints, options);
      const activeAlerts = allAlerts.filter((a) => !this.dismissedAlertIds.has(a.id));

      if (activeAlerts.length > 0 && step % 4 === 0) {
        if (options.playSound) {
          playHazardAlertAudio(activeAlerts[0].severity);
        }
      }

      onHazardAlerts(activeAlerts);

      if (step >= totalSteps) {
        clearInterval(this.simulationTimer);
        this.simulationTimer = null;
      }
    }, 700);
  }

  /**
   * Halts any active hardware watchPosition or simulation timer
   */
  public static stopTracking(): void {
    if (this.watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.simulationTimer !== null) {
      clearInterval(this.simulationTimer);
      this.simulationTimer = null;
    }
  }

  /**
   * Dismisses an alert ID so it does not repeatedly trigger during the current journey
   */
  public static dismissAlert(alertId: string): void {
    this.dismissedAlertIds.add(alertId);
  }

  /**
   * Resets dismissed alerts for a brand new trip
   */
  public static resetDismissedAlerts(): void {
    this.dismissedAlertIds.clear();
  }

  /**
   * Checks if tracking or simulation is currently active
   */
  public static isTrackingActive(): boolean {
    return this.watchId !== null || this.simulationTimer !== null;
  }
}
