/**
 * mining_physics.ts
 * ──────────────────────────────────────────────────────────
 * Mining Physics, Haulage Energy, Geotechnical Stability,
 * Flora/ESG Feasibility, and Thermal Mn Grade Color Engine.
 *
 * All calculations are grounded in standard open-pit mining
 * engineering (Hustrulid & Kuchta) and Indian IBM/DGMS norms.
 * ──────────────────────────────────────────────────────────
 */

// ─── CONSTANTS ────────────────────────────────────────────
const GRAVITY = 9.81; // m/s²
const ROLLING_RESISTANCE = 0.025; // Standard unpaved mine haul road
const DRIVETRAIN_EFFICIENCY = 0.85; // Diesel-electric mechanical η
const DIESEL_KWH_FACTOR = 0.28; // Liters diesel per kWh (high-displacement mining truck)
const DEFAULT_TRUCK_MASS_KG = 100_000; // 100-tonne loaded haul truck
const DEFAULT_TRUCK_VELOCITY = 4.2; // m/s (~15 km/h on grade)
const JOULES_TO_KWH = 1 / 3_600_000;

// ─── 1. THERMAL MANGANESE COLOR MAPPING ───────────────────

export interface ThermalMnColorResult {
  hex: string;
  hexInt: number;
  label: string;
  category: 'ultra_high' | 'high' | 'economic' | 'marginal' | 'waste';
}

/**
 * Returns thermal infrared color for a manganese grade percentage.
 * Mimics a FLIR-style thermal scan where high-grade hotspots glow
 * crimson red and waste rock is deep navy blue.
 */
export function getThermalMnColor(gradePercent: number): ThermalMnColorResult {
  if (gradePercent >= 38) {
    return { hex: '#b91c1c', hexInt: 0xb91c1c, label: 'Ultra-High Grade Pyrolusite', category: 'ultra_high' };
  }
  if (gradePercent >= 30) {
    return { hex: '#ea580c', hexInt: 0xea580c, label: 'High Grade Braunite', category: 'high' };
  }
  if (gradePercent >= 22) {
    return { hex: '#eab308', hexInt: 0xeab308, label: 'Economic Ore', category: 'economic' };
  }
  if (gradePercent >= 15) {
    return { hex: '#06b6d4', hexInt: 0x06b6d4, label: 'Marginal Ore', category: 'marginal' };
  }
  return { hex: '#1e3a8a', hexInt: 0x1e3a8a, label: 'Sub-Economic / Waste', category: 'waste' };
}

/**
 * Returns a continuous thermal color as an RGB tuple for shader use.
 * Smoothly interpolates across the thermal spectrum.
 */
export function getThermalMnColorContinuous(gradePercent: number): [number, number, number] {
  const g = Math.max(0, Math.min(50, gradePercent));
  const t = g / 50; // 0.0 (waste) → 1.0 (ultra high)

  // Navy → Cyan → Amber → Orange → Crimson
  if (t < 0.30) {
    // Navy to Cyan (0–15% Mn → 0.0–0.30)
    const s = t / 0.30;
    return [
      0.118 + s * (0.024 - 0.118),
      0.227 + s * (0.714 - 0.227),
      0.541 + s * (0.831 - 0.541)
    ];
  }
  if (t < 0.44) {
    // Cyan to Amber (15–22% → 0.30–0.44)
    const s = (t - 0.30) / 0.14;
    return [
      0.024 + s * (0.918 - 0.024),
      0.714 + s * (0.702 - 0.714),
      0.831 + s * (0.031 - 0.831)
    ];
  }
  if (t < 0.60) {
    // Amber to Orange (22–30% → 0.44–0.60)
    const s = (t - 0.44) / 0.16;
    return [
      0.918 + s * (0.918 - 0.918),
      0.702 + s * (0.345 - 0.702),
      0.031 + s * (0.047 - 0.031)
    ];
  }
  if (t < 0.76) {
    // Orange to Crimson (30–38% → 0.60–0.76)
    const s = (t - 0.60) / 0.16;
    return [
      0.918 + s * (0.725 - 0.918),
      0.345 + s * (0.110 - 0.345),
      0.047 + s * (0.110 - 0.047)
    ];
  }
  // Crimson glow (38%+ → 0.76–1.0)
  return [0.725, 0.110, 0.110];
}

// ─── 2. TOPOGRAPHIC HAULAGE POWER & FUEL ENGINE ───────────

export interface HaulageResult {
  deltaZ: number;           // Elevation difference (m)
  effectiveSlopeDeg: number; // Local terrain slope angle (°)
  gradeResistance: number;   // GR = tan(θ)
  rollingResistance: number; // RR (constant)
  totalResistance: number;   // TR = GR + RR
  potentialEnergyJ: number;  // Work to lift ore (Joules)
  energyPerTonneKWh: number; // kWh per tonne of ore hauled
  dieselPerTonneLiters: number; // Diesel consumption (L/t)
  powerDrawKW: number;       // Instantaneous power at steady speed (kW)
  annualFuelCostINR: number; // Estimated annual cost at 4000 t/day
}

/**
 * Computes haulage energy and diesel fuel consumption for lifting
 * ore from pit floor to surface processing plant.
 *
 * Based on: P_lift = m·g·v·(sinθ + C_rr) / η
 */
export function computeHaulageEnergy(
  deltaZ: number,
  slopeDeg: number,
  massKg: number = DEFAULT_TRUCK_MASS_KG
): HaulageResult {
  const thetaRad = (Math.max(1, Math.abs(slopeDeg)) * Math.PI) / 180;
  const gradeResistance = Math.tan(thetaRad);
  const totalResistance = gradeResistance + ROLLING_RESISTANCE;

  // Potential energy work to lift the full truck load
  const absZ = Math.max(1, Math.abs(deltaZ));
  const potentialEnergyJ = massKg * GRAVITY * absZ;

  // Account for total resistance and drivetrain losses
  const totalWorkJ = potentialEnergyJ * (1 + ROLLING_RESISTANCE / Math.sin(thetaRad)) / DRIVETRAIN_EFFICIENCY;

  // Per-tonne metrics (divide by mass in tonnes)
  const massT = massKg / 1000;
  const energyPerTonneKWh = (totalWorkJ / massKg) * JOULES_TO_KWH * massT;
  const dieselPerTonneLiters = energyPerTonneKWh * DIESEL_KWH_FACTOR;

  // Instantaneous power draw at steady velocity on grade
  const powerDrawKW = (massKg * GRAVITY * DEFAULT_TRUCK_VELOCITY * (Math.sin(thetaRad) + ROLLING_RESISTANCE)) / (DRIVETRAIN_EFFICIENCY * 1000);

  // Annual fuel cost estimate (4000 t/day × 300 operating days × ₹95/L diesel)
  const annualTonnage = 4000 * 300;
  const annualFuelCostINR = Math.round(dieselPerTonneLiters * annualTonnage * 95);

  return {
    deltaZ: absZ,
    effectiveSlopeDeg: slopeDeg,
    gradeResistance: Number(gradeResistance.toFixed(4)),
    rollingResistance: ROLLING_RESISTANCE,
    totalResistance: Number(totalResistance.toFixed(4)),
    potentialEnergyJ: Math.round(potentialEnergyJ),
    energyPerTonneKWh: Number(energyPerTonneKWh.toFixed(2)),
    dieselPerTonneLiters: Number(dieselPerTonneLiters.toFixed(2)),
    powerDrawKW: Number(powerDrawKW.toFixed(1)),
    annualFuelCostINR
  };
}

// ─── 3. FLORA & ENVIRONMENTAL FEASIBILITY INDEX ───────────

export interface FloraFeasibility {
  tcd: number;            // Tree Canopy Density (0–1)
  category: 'dense' | 'moderate' | 'barren';
  label: string;
  complianceFlag: string;
  color: string;
  costMultiplier: number; // CAPEX multiplier (1.0 = no extra cost)
  clearanceDelayMonths: number;
}

/**
 * Computes flora/environmental feasibility from NDVI-derived
 * Tree Canopy Density (TCD). Based on Forest Conservation Act
 * thresholds for Indian mining operations.
 */
export function getFloraFeasibility(ndvi: number): FloraFeasibility {
  const tcd = Math.max(0, Math.min(1, ndvi));

  if (tcd > 0.65) {
    return {
      tcd,
      category: 'dense',
      label: 'Dense Sal/Teak Forest',
      complianceFlag: 'Category-II Forest Clearance Required — High Stripping & Compensatory Afforestation Cost',
      color: '#ef4444',
      costMultiplier: 2.4,
      clearanceDelayMonths: 18
    };
  }
  if (tcd >= 0.35) {
    return {
      tcd,
      category: 'moderate',
      label: 'Moderate Scrub / Canopy',
      complianceFlag: 'Standard Topsoil Scrape — Environmental Clearance Stage-I',
      color: '#eab308',
      costMultiplier: 1.4,
      clearanceDelayMonths: 6
    };
  }
  return {
    tcd,
    category: 'barren',
    label: 'Barren / Degraded Land',
    complianceFlag: 'Optimal for Immediate Pit Siting — No Forest Clearance Required',
    color: '#10b981',
    costMultiplier: 1.0,
    clearanceDelayMonths: 0
  };
}

// ─── 4. GEOTECHNICAL BENCH STABILITY ──────────────────────

export interface BenchStability {
  slopeDeg: number;
  benchClass: 'A' | 'B' | 'C';
  label: string;
  recommendation: string;
  maxBenchHeight: number; // meters
  rampGrade: string;
  color: string;
}

/**
 * Assesses open-pit bench stability based on local slope angle.
 * Follows DGMS (Directorate General of Mines Safety) India norms
 * for manganese open-cast operations.
 */
export function getBenchStability(slopeDeg: number): BenchStability {
  if (slopeDeg < 25) {
    return {
      slopeDeg,
      benchClass: 'A',
      label: 'Optimal — Safe 15m Bench Intervals',
      recommendation: 'Direct 8% haul road gradient. No slope reinforcement required.',
      maxBenchHeight: 15,
      rampGrade: '8%',
      color: '#10b981'
    };
  }
  if (slopeDeg <= 38) {
    return {
      slopeDeg,
      benchClass: 'B',
      label: 'Moderate — Switchback Ramping Required',
      recommendation: 'Requires geotechnical switchback ramps & slope stabilization anchors.',
      maxBenchHeight: 8,
      rampGrade: '10%',
      color: '#f59e0b'
    };
  }
  return {
    slopeDeg,
    benchClass: 'C',
    label: 'Hazardous — High Wall Failure Risk',
    recommendation: 'Continuous SSR radar slope monitoring. Reduce bench to 6m with catch berms.',
    maxBenchHeight: 6,
    rampGrade: '12% (max)',
    color: '#ef4444'
  };
}

// ─── 5. SUMP DRAINAGE / DEWATERING RISK ───────────────────

export interface DrainageRisk {
  riskLevel: 'low' | 'moderate' | 'high';
  label: string;
  pumpRatingKW: number;
  recommendation: string;
  color: string;
}

/**
 * Estimates monsoon pit dewatering risk based on slope curvature
 * (concavity funnels runoff into pit sump).
 */
export function getSumpDrainageRisk(
  slopeDeg: number,
  elevationM: number
): DrainageRisk {
  // Concave slopes at low elevation → high catchment risk
  const riskScore = (slopeDeg / 45) * 0.6 + ((400 - Math.min(elevationM, 400)) / 400) * 0.4;

  if (riskScore > 0.65) {
    return {
      riskLevel: 'high',
      label: 'High — Active Monsoon Sump Required',
      pumpRatingKW: 250,
      recommendation: 'Deploy 3× submersible dewatering pumps (85 kW each). Blast schedule: dry-season priority.',
      color: '#ef4444'
    };
  }
  if (riskScore > 0.35) {
    return {
      riskLevel: 'moderate',
      label: 'Moderate — Seasonal Pumping',
      pumpRatingKW: 120,
      recommendation: 'Single 120 kW centrifugal pump with peripheral drainage channels.',
      color: '#f59e0b'
    };
  }
  return {
    riskLevel: 'low',
    label: 'Low — Natural Peripheral Runoff',
    pumpRatingKW: 0,
    recommendation: 'Curvature promotes natural runoff away from pit. Minimal pumping needed.',
    color: '#10b981'
  };
}

// ─── 6. UNIFIED FEASIBILITY COMPUTATION ───────────────────

export interface FullFeasibility {
  thermal: ThermalMnColorResult;
  haulage: HaulageResult;
  flora: FloraFeasibility;
  bench: BenchStability;
  drainage: DrainageRisk;
  overallScore: number; // 0–100 composite feasibility
  overallVerdict: string;
}

/**
 * Unified mine feasibility computation for a single point.
 * Returns all physics, environmental, and geotechnical metrics.
 */
export function computeFullFeasibility(
  grade: number,
  elevation: number,
  slopeDeg: number,
  surfaceElevation: number = 340,
  ndvi: number = 0.4
): FullFeasibility {
  const thermal = getThermalMnColor(grade);
  const deltaZ = Math.abs(surfaceElevation - elevation);
  const haulage = computeHaulageEnergy(deltaZ, slopeDeg);
  const flora = getFloraFeasibility(ndvi);
  const bench = getBenchStability(slopeDeg);
  const drainage = getSumpDrainageRisk(slopeDeg, elevation);

  // Composite feasibility score (weighted)
  const gradeScore = Math.min(100, (grade / 45) * 100) * 0.35;
  const slopeScore = Math.max(0, 100 - slopeDeg * 2.2) * 0.25;
  const floraScore = (1 - flora.tcd) * 100 * 0.15;
  const energyScore = Math.max(0, 100 - haulage.energyPerTonneKWh * 8) * 0.15;
  const drainScore = (drainage.riskLevel === 'low' ? 100 : drainage.riskLevel === 'moderate' ? 55 : 20) * 0.10;

  const overallScore = Math.round(Math.max(0, Math.min(100, gradeScore + slopeScore + floraScore + energyScore + drainScore)));

  let overallVerdict: string;
  if (overallScore >= 75) overallVerdict = 'Tier-1 Priority Target: Immediate RC Core Drilling';
  else if (overallScore >= 55) overallVerdict = 'Tier-2 Infill: Detailed Ground Geophysics Required';
  else if (overallScore >= 35) overallVerdict = 'Tier-3 Speculative: Desktop Study & Aerial Survey';
  else overallVerdict = 'Sub-Economic: Archive for Future Re-evaluation';

  return {
    thermal,
    haulage,
    flora,
    bench,
    drainage,
    overallScore,
    overallVerdict
  };
}
