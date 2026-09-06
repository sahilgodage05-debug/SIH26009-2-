export interface ReserveZone {
  id: string;
  name: string;
  leaseArea: string;
  coordinates: [number, number]; // [lat, lng]
  manganeseProbability: number; // e.g. 87
  confidenceInterval: string; // e.g. "± 3.1%"
  estimatedReserveVolume: string; // e.g. "1.42M Tonnes"
  averageGrade: string; // e.g. "44.8% Mn (High Grade)"
  estimatedValueINR: string; // e.g. "₹1,280 Cr"
  overburdenRatio: string; // e.g. "1 : 2.4"
  status: 'High Potential' | 'Verified Deposit' | 'Target for Drilling' | 'Exploration Stage';
  primaryIndicator: string;
  indicators: {
    densityAnomaly: { value: string; status: 'optimal' | 'warning' | 'neutral'; desc: string };
    vegetationStress: { value: string; status: 'optimal' | 'warning' | 'neutral'; desc: string };
    thermalInertia: { value: string; status: 'optimal' | 'warning' | 'neutral'; desc: string };
    structuralTrap: { value: string; status: 'optimal' | 'warning' | 'neutral'; desc: string };
  };
  satelliteTelemetry: {
    sentinelPassDate: string;
    sarCoherence: number;
    ndviAnomalyScore: number;
    surfaceTempKelvin: number;
  };
  spaceTelemetry?: {
    rainfall_mm_hr: number;
    soilMoisturePercent: number;
    ndviVegetationIndex: number;
    surfaceTempKelvin: number;
  };
  exactLocation?: {
    dms: string;
    districtState: string;
    tehsilVillage: string;
    pincode: string;
    elevationMeters: number;
  };
  stratigraphy: {
    depth: string;
    layerName: string;
    rockType: string;
    mnGrade: number;
    color: string;
  }[];
  aiRecommendation: string;
}

export interface DrillingSite {
  id: string;
  boreholeCode: string;
  mine: string;
  coordinates: [number, number];
  depthMeters: number;
  gradeMnPct: number;
  drilledYear: number;
  status: 'Productive Core' | 'Traces Detected' | 'Barren';
}

export interface HeatmapPolygon {
  id: string;
  name: string;
  probability: number;
  color: string;
  fillColor: string;
  coordinates: [number, number][]; // Polygon coordinates
}

export interface LayerState {
  ndvi: boolean;
  soilMoisture: boolean;
  landTemperature: boolean;
  historicalDrilling: boolean;
  aiHeatmap: boolean;
  radarPrecipitation: boolean;
  structuralFaults: boolean;
}

export interface FleetEquipment {
  id: string;
  name: string;
  type: 'Excavator' | 'Haul Truck' | 'Blast Drill' | 'Crusher';
  location: string;
  status: 'Operational' | 'Warning' | 'Critical Shortfall' | 'Maintenance';
  vibrationAnomaly: boolean;
  vibrationMmSec: number;
  hydraulicTempC: number;
  utilizationRate: number;
  assignedPit: string;
  healthScore: number;
}

export interface OperationalAlert {
  id: string;
  timestamp: string;
  severity: 'Critical' | 'Warning' | 'Info';
  category: 'Weather Impact' | 'Mechanical Telemetry' | 'Blasting Delay' | 'Supply Shortfall';
  title: string;
  description: string;
  impact: string;
  recommendedAction: string;
}
