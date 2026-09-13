export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapIncidentFeature {
  id: string;
  coordinates: [number, number]; // [lng, lat]
  title: string;
  category: string;
  priority: string;
  status: string;
  ward: string;
  slaRemainingHours: number;
  isCluster: boolean;
}
