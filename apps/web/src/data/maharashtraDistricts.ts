export interface MunicipalCorporation {
  id: string;
  name: string;
  shortName: string;
  district: string;
  headquarters: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  commissionerTitle?: string;
  population?: number;
  establishedYear?: number;
  zoneCount?: number;
  status: 'operational' | 'high_load' | 'maintenance';
}

export interface MaharashtraDistrict {
  id: string;
  name: string;
  division: 'Konkan' | 'Pune' | 'Nashik' | 'Chhatrapati Sambhajinagar' | 'Amravati' | 'Nagpur';
  corporations: MunicipalCorporation[];
}

export const MAHARASHTRA_DISTRICTS: MaharashtraDistrict[] = [
  {
    id: 'pune',
    name: 'Pune',
    division: 'Pune',
    corporations: [
      {
        id: 'pmc',
        name: 'Pune Municipal Corporation',
        shortName: 'PMC',
        district: 'Pune',
        headquarters: 'Shivajinagar, Pune',
        coordinates: { lat: 18.5204, lng: 73.8567 },
        commissionerTitle: 'Municipal Commissioner, Pune',
        population: 3400000,
        establishedYear: 1950,
        zoneCount: 5,
        status: 'operational',
      },
      {
        id: 'pcmc',
        name: 'Pimpri Chinchwad Municipal Corporation',
        shortName: 'PCMC',
        district: 'Pune',
        headquarters: 'Pimpri, Pune',
        coordinates: { lat: 18.6298, lng: 73.7997 },
        commissionerTitle: 'Municipal Commissioner, PCMC',
        population: 1729000,
        establishedYear: 1982,
        zoneCount: 4,
        status: 'operational',
      },
    ],
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    division: 'Konkan',
    corporations: [
      {
        id: 'bmc',
        name: 'Brihanmumbai Municipal Corporation',
        shortName: 'BMC',
        district: 'Mumbai',
        headquarters: 'Fort, Mumbai',
        coordinates: { lat: 18.9322, lng: 72.8335 },
        commissionerTitle: 'Municipal Commissioner, Greater Mumbai',
        population: 12500000,
        establishedYear: 1888,
        zoneCount: 7,
        status: 'operational',
      },
    ],
  },
  {
    id: 'thane',
    name: 'Thane',
    division: 'Konkan',
    corporations: [
      {
        id: 'tmc',
        name: 'Thane Municipal Corporation',
        shortName: 'TMC',
        district: 'Thane',
        headquarters: 'Panchpakhadi, Thane',
        coordinates: { lat: 19.2183, lng: 72.9781 },
        commissionerTitle: 'Municipal Commissioner, Thane',
        population: 1841000,
        establishedYear: 1982,
        zoneCount: 4,
        status: 'operational',
      },
      {
        id: 'nmmc',
        name: 'Navi Mumbai Municipal Corporation',
        shortName: 'NMMC',
        district: 'Thane',
        headquarters: 'Belapur, Navi Mumbai',
        coordinates: { lat: 19.033, lng: 73.0297 },
        commissionerTitle: 'Municipal Commissioner, Navi Mumbai',
        population: 1120000,
        establishedYear: 1991,
        zoneCount: 3,
        status: 'operational',
      },
      {
        id: 'kdmc',
        name: 'Kalyan-Dombivli Municipal Corporation',
        shortName: 'KDMC',
        district: 'Thane',
        headquarters: 'Kalyan West',
        coordinates: { lat: 19.2437, lng: 73.1355 },
        commissionerTitle: 'Municipal Commissioner, KDMC',
        population: 1247000,
        establishedYear: 1983,
        zoneCount: 3,
        status: 'operational',
      },
    ],
  },
  {
    id: 'nashik',
    name: 'Nashik',
    division: 'Nashik',
    corporations: [
      {
        id: 'nmc',
        name: 'Nashik Municipal Corporation',
        shortName: 'NMC Nashik',
        district: 'Nashik',
        headquarters: 'Rajiv Gandhi Bhavan, Nashik',
        coordinates: { lat: 19.9975, lng: 73.7898 },
        commissionerTitle: 'Municipal Commissioner, Nashik',
        population: 1561000,
        establishedYear: 1992,
        zoneCount: 6,
        status: 'operational',
      },
      {
        id: 'mmc',
        name: 'Malegaon Municipal Corporation',
        shortName: 'MMC',
        district: 'Nashik',
        headquarters: 'Malegaon',
        coordinates: { lat: 20.5579, lng: 74.5287 },
        commissionerTitle: 'Municipal Commissioner, Malegaon',
        population: 576000,
        establishedYear: 2001,
        zoneCount: 2,
        status: 'operational',
      },
    ],
  },
  {
    id: 'solapur',
    name: 'Solapur',
    division: 'Pune',
    corporations: [
      {
        id: 'smc',
        name: 'Solapur Municipal Corporation',
        shortName: 'SMC',
        district: 'Solapur',
        headquarters: 'Indrabhavan, Solapur',
        coordinates: { lat: 17.6599, lng: 75.9064 },
        commissionerTitle: 'Municipal Commissioner, Solapur',
        population: 951000,
        establishedYear: 1963,
        zoneCount: 4,
        status: 'operational',
      },
    ],
  },
  {
    id: 'nagpur',
    name: 'Nagpur',
    division: 'Nagpur',
    corporations: [
      {
        id: 'nmc_nagpur',
        name: 'Nagpur Municipal Corporation',
        shortName: 'NMC Nagpur',
        district: 'Nagpur',
        headquarters: 'Civil Lines, Nagpur',
        coordinates: { lat: 21.1458, lng: 79.0882 },
        commissionerTitle: 'Municipal Commissioner, Nagpur',
        population: 2405000,
        establishedYear: 1951,
        zoneCount: 10,
        status: 'operational',
      },
    ],
  },
  {
    id: 'chhatrapati_sambhajinagar',
    name: 'Chhatrapati Sambhajinagar',
    division: 'Chhatrapati Sambhajinagar',
    corporations: [
      {
        id: 'csmc',
        name: 'Chhatrapati Sambhajinagar Municipal Corporation',
        shortName: 'CSMC',
        district: 'Chhatrapati Sambhajinagar',
        headquarters: 'Town Hall, CSN',
        coordinates: { lat: 19.8762, lng: 75.3433 },
        commissionerTitle: 'Municipal Commissioner, CSMC',
        population: 1175000,
        establishedYear: 1982,
        zoneCount: 4,
        status: 'operational',
      },
    ],
  },
  {
    id: 'kolhapur',
    name: 'Kolhapur',
    division: 'Pune',
    corporations: [
      {
        id: 'kmc',
        name: 'Kolhapur Municipal Corporation',
        shortName: 'KMC',
        district: 'Kolhapur',
        headquarters: 'Bhausinghji Road, Kolhapur',
        coordinates: { lat: 16.705, lng: 74.2433 },
        commissionerTitle: 'Municipal Commissioner, Kolhapur',
        population: 549000,
        establishedYear: 1972,
        zoneCount: 3,
        status: 'operational',
      },
    ],
  },
  {
    id: 'amravati',
    name: 'Amravati',
    division: 'Amravati',
    corporations: [
      {
        id: 'amc',
        name: 'Amravati Municipal Corporation',
        shortName: 'AMC',
        district: 'Amravati',
        headquarters: 'Rajkamal Chowk, Amravati',
        coordinates: { lat: 20.9374, lng: 77.7796 },
        commissionerTitle: 'Municipal Commissioner, Amravati',
        population: 647000,
        establishedYear: 1983,
        zoneCount: 3,
        status: 'operational',
      },
    ],
  },
];

export const ALL_MUNICIPAL_CORPORATIONS: MunicipalCorporation[] = MAHARASHTRA_DISTRICTS.flatMap(
  (d) => d.corporations
);

export function getCorporationById(id: string): MunicipalCorporation | undefined {
  return ALL_MUNICIPAL_CORPORATIONS.find((c) => c.id === id);
}

export function getCorporationsForDistrict(districtName: string): MunicipalCorporation[] {
  const dist = MAHARASHTRA_DISTRICTS.find(
    (d) => d.name.toLowerCase() === districtName.toLowerCase() || d.id.toLowerCase() === districtName.toLowerCase()
  );
  return dist ? dist.corporations : [];
}
