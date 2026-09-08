'use client';

import React, { useState, useEffect } from 'react';
import { 
  Truck, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  Navigation, 
  Fuel, 
  Thermometer, 
  Scale, 
  Wrench, 
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Check,
  ShieldAlert,
  Users,
  Satellite,
  Droplets,
  HardHat,
  Cpu,
  Layers,
  Zap,
  Info,
  X,
  Clock,
  Radio,
  FileCheck,
  Eye,
  ShieldCheck,
  Crosshair
} from 'lucide-react';
import { LegacyFleetTelemetry } from '@/components/LegacyFleetTelemetry';

interface TpmsWheel {
  pos: string;
  name: string;
  pressure_psi: number;
  temp_c: number;
  status: 'OPTIMAL' | 'ELEVATED' | 'CRITICAL';
}

interface TruckData {
  id: string;
  csv_machine_id?: string;
  model: string;
  capacity_t: number;
  payload_t: number;
  status: string;
  route: string;
  progress: number;
  speed_kmh: number;
  heading_deg: number;
  target_shovel: string;
  target_geofence: string;
  intersection_status?: string;
  lat: number;
  lng: number;
  telemetry: {
    engine_rpm: number;
    coolant_temp_c: number;
    oil_pressure_kpa: number;
    fuel_level_pct: number;
    fuel_burn_rate_lph: number;
    fuel_cycle_state?: string;
    rolling_resistance_alert?: boolean;
    tkph: number;
    tkph_front?: number;
    tkph_rear?: number;
    tkph_rating_max: number;
    thermal_throttling_active?: boolean;
    speed_throttled_kmh?: number;
    tire_temp_c: number;
    tpms_wheels?: TpmsWheel[];
    vibration_rms_mms?: number;
    vibration_iso_zone?: string;
    vibration_status?: string;
    vibration_subsystem?: string;
    strut_pressure_front_psi: number;
    strut_pressure_rear_psi: number;
    driver_fatigue_index: number;
    has_fuel_sensor?: number;
  };
  payload_compliance?: {
    compliance_status: string;
    compliance_pct: number;
    tare_drift_tons: number;
    carryback_alert: boolean;
    dgms_overload_violation: boolean;
  };
  cycle_phase_times?: {
    queue_time_shovel_min: number;
    spot_load_time_min: number;
    haul_travel_time_min: number;
    calibrated_baseline_min: number;
    dump_wait_time_min: number;
    total_cycle_time_min: number;
    variance_vs_baseline_pct: number;
  };
  cycle_stats: {
    completed_trips_shift: number;
    avg_cycle_time_min: number;
    tonnes_hauled_shift: number;
  };
}

interface ShovelData {
  id: string;
  csv_machine_id?: string;
  model: string;
  type: string;
  location_name: string;
  geofence_id: string;
  lat: number;
  lng: number;
  status: string;
  bucket_capacity_t: number;
  avg_load_time_min: number;
  queue_count: number;
  operator: string;
  health_pct: number;
  face_id?: string;
  face_grade_mn_pct?: number;
  lithology?: string;
  shovel_hang_time_min?: number;
}

interface GeofenceData {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  radius_m: number;
  speed_limit_kmh?: number;
  priority_rule?: string;
}

interface CorrectiveAction {
  action_id: string;
  priority: string;
  title: string;
  category: string;
  description: string;
  tonnage_recovery_tons: number;
  recovery_time_min: number;
  cost_impact: string;
  status: string;
}

interface HemmUnit {
  unit_id: string;
  type: string;
  availability_pct: number;
  mtbf_hours: number;
  mttr_hours: number;
  health_score: number;
  failure_risk_48h_pct: number;
  operating_hours: number;
  critical_subsystem: string;
  current_status?: string;
  oee_metrics?: {
    mechanical_availability_pct: number;
    utilization_of_availability_pct: number;
    operational_efficiency_pct: number;
    overall_oee_pct: number;
  };
}

export function FleetCommandCenter({ mineId, zone }: { mineId?: string; zone?: any }) {
  const currentMineId = mineId || 'zone-dongri-buzurg';
  const mineName = zone?.name || (currentMineId ? currentMineId.replace('zone-', '').toUpperCase() + ' Mine' : 'MOIL Manganese Mine');

  // State
  const [fleetState, setFleetState] = useState<any>(null);
  const [matchFactor, setMatchFactor] = useState<any>(null);
  const [shortfall, setShortfall] = useState<any>(null);
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([]);
  const [hemmData, setHemmData] = useState<any>(null);
  const [workforceRoster, setWorkforceRoster] = useState<any>(null);
  const [lpSolution, setLpSolution] = useState<any>(null);
  const [crusherBlend, setCrusherBlend] = useState<any>(null);
  const [autoDispatchData, setAutoDispatchData] = useState<any>(null);
  
  const [selectedTruck, setSelectedTruck] = useState<TruckData | null>(null);
  const [modalTruck, setModalTruck] = useState<TruckData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [autoDispatchTriggered, setAutoDispatchTriggered] = useState<boolean>(false);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'map' | 'shortfall' | 'telemetry' | 'workforce'>('map');
  const [recoveredTonnage, setRecoveredTonnage] = useState<number>(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch all fleet & production analytics
  const fetchAllData = async () => {
    try {
      const [fleetRes, mfRes, sfRes, caRes, hemmRes, wfRes, blendRes, autoDispRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/fleet/status/${currentMineId}`),
        fetch(`http://127.0.0.1:8000/api/v1/fleet/match-factor/${currentMineId}`),
        fetch(`http://127.0.0.1:8000/api/v1/production/shortfall/${currentMineId}`),
        fetch(`http://127.0.0.1:8000/api/v1/production/corrective-actions/${currentMineId}`),
        fetch(`http://127.0.0.1:8000/api/v1/production/hemm-reliability/${currentMineId}`),
        fetch(`http://127.0.0.1:8000/api/v1/fleet/workers-roster/${currentMineId}`),
        fetch(`http://127.0.0.1:8000/api/v1/fleet/crusher-blend/${currentMineId}`),
        fetch(`http://127.0.0.1:8000/api/v1/fleet/auto-dispatch/${currentMineId}`, { method: 'POST' })
      ]);

      if (fleetRes.ok) {
        const data = await fleetRes.json();
        setFleetState(data);
        if (selectedTruck) {
          const updatedSelected = data.trucks.find((t: TruckData) => t.id === selectedTruck.id);
          if (updatedSelected) setSelectedTruck(updatedSelected);
        } else if (data.trucks?.length > 0) {
          setSelectedTruck(data.trucks[0]);
        }
      }
      if (mfRes.ok) setMatchFactor(await mfRes.json());
      if (sfRes.ok) setShortfall(await sfRes.json());
      if (caRes.ok) setCorrectiveActions(await caRes.json());
      if (hemmRes.ok) setHemmData(await hemmRes.json());
      if (wfRes.ok) setWorkforceRoster(await wfRes.json());
      if (blendRes.ok) setCrusherBlend(await blendRes.json());
      if (autoDispRes.ok) setAutoDispatchData(await autoDispRes.json());
    } catch (err) {
      console.warn('Backend polling active; waiting for local endpoint on port 8000:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
    let interval: any = null;
    if (isLivePolling) {
      interval = setInterval(fetchAllData, 2500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentMineId, isLivePolling]);

  // Execute Corrective Action
  const handleApplyAction = async (action: CorrectiveAction) => {
    setAppliedActions(prev => new Set(prev).add(action.action_id));
    setRecoveredTonnage(prev => prev + action.tonnage_recovery_tons);
    setActionSuccessMsg(`Executed: ${action.title} (+${action.tonnage_recovery_tons} T recovered)`);
    
    // If LP redeployment action, trigger LP solver
    if (action.action_id.includes('LP') || action.action_id.includes('DISPATCH')) {
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/v1/production/solve-lp-reallocation/${currentMineId}`);
        if (res.ok) {
          const lpData = await res.json();
          setLpSolution(lpData);
        }
      } catch (e) {
        console.warn('LP solver call error:', e);
      }
    }

    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4500);
  };

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOADED_HAUL':
        return <span className="bg-emerald-950 text-emerald-300 border border-emerald-500/70 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono"><ArrowUpRight className="w-3 h-3" /> Loaded Uphill</span>;
      case 'EMPTY_RETURN':
        return <span className="bg-cyan-950 text-cyan-300 border border-cyan-500/70 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">Empty Return (Yielding)</span>;
      case 'LOADING':
        return <span className="bg-amber-950 text-amber-300 border border-amber-500/70 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 font-mono">Loading Face</span>;
      case 'DUMPING':
        return <span className="bg-purple-950 text-purple-300 border border-purple-500/70 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">Crusher Dumping</span>;
      case 'QUEUED_SHOVEL':
        return <span className="bg-yellow-950 text-yellow-300 border border-yellow-500/70 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">Shovel Queue</span>;
      case 'MAINTENANCE':
        return <span className="bg-rose-950 text-rose-300 border border-rose-500/70 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">Mechanical Down</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">{status}</span>;
    }
  };

  const trucks: TruckData[] = fleetState?.trucks || [];
  const shovels: ShovelData[] = fleetState?.shovels || [];
  const geofences: GeofenceData[] = fleetState?.geofences || [];

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans pb-12">
      
      {/* MINING ENGINEER CAPABILITIES SHOWCASE BANNER */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/70 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/50 text-[10px] font-mono font-black uppercase tracking-wider flex items-center gap-1.5">
                <HardHat className="w-3.5 h-3.5" />
                Mining Engineer Operations Platform
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold">
                CSV Ingested: {fleetState?.csv_mine_location || 'Dongri Buzurg Mine'}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/50 text-[10px] font-mono font-bold flex items-center gap-1">
                <Users className="w-3 h-3" />
                Total Workforce: {fleetState?.workers_count_str || '900'}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{fleetState?.mine_name || mineName}</span>
              <span className="text-cyan-400 font-mono text-sm font-normal">Command Center</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsLivePolling(!isLivePolling)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono flex items-center gap-2 transition-all border ${
                isLivePolling 
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-lg shadow-emerald-950' 
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLivePolling ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isLivePolling ? 'Live Telemetry (2.5s)' : 'Telemetry Paused'}</span>
            </button>
          </div>
        </div>

        {/* Feature Capability Highlights */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-cyan-400 uppercase font-mono block mb-1">1. Haulage &amp; Intersections</span>
            <p className="text-[11px] text-slate-300 leading-tight">Directed graph ramps with loaded uphill right-of-way &amp; Phelps-Morgan match factor.</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-amber-400 uppercase font-mono block mb-1">2. Shortfall Predictor</span>
            <p className="text-[11px] text-slate-300 leading-tight">Hourly crusher yield gap tracking equipment downtime, SAR rain, and blasting delay.</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-emerald-400 uppercase font-mono block mb-1">3. Prescriptive Actions</span>
            <p className="text-[11px] text-slate-300 leading-tight">SciPy LP min-cost fleet redeployment, grade blending, and hot-seat meal staggering.</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-purple-400 uppercase font-mono block mb-1">4. Space &amp; InSAR Overlays</span>
            <p className="text-[11px] text-slate-300 leading-tight">Satellite bench displacement mm/yr, FoS slope stability, &amp; pit catchment hydrology.</p>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-[10px] font-bold text-pink-400 uppercase font-mono block mb-1">5. Strict CSV Integration</span>
            <p className="text-[11px] text-slate-300 leading-tight">Exact machine IDs (MOIL-DUM/EXC/SUR) &amp; worker counts ingested directly from CSV.</p>
          </div>
        </div>

        {/* Action Success Notification Toast */}
        {actionSuccessMsg && (
          <div className="mt-3 bg-emerald-900/90 border border-emerald-500 text-emerald-200 text-xs font-mono font-bold px-3 py-2 rounded-xl flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
            <span className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300">Total Recovered: +{recoveredTonnage} T</span>
          </div>
        )}
      </div>

      {/* OPERATIONAL KPI CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        
        {/* Card 1: Shift Extraction Yield & Variance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift Extraction Yield &amp; Variance</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {shortfall 
                  ? Math.round((shortfall.total_shift_yield_tons || shortfall.projected_end_shift_tons || 2719.6) + recoveredTonnage) 
                  : 2720}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ {shortfall?.target_shift_tons || 3200} Tons</span>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                {shortfall 
                  ? Math.min(100, Math.round((((shortfall.total_shift_yield_tons || shortfall.projected_end_shift_tons || 2719.6) + recoveredTonnage) / (shortfall?.target_shift_tons || 3200)) * 100)) 
                  : 85}%
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 font-mono">
                -{(shortfall ? Math.max(0, Math.round(((shortfall.projected_shortfall_tons || 480.4) - recoveredTonnage) * 10) / 10) : 480.4)} T Deficit
              </span>
              <span className="text-[10px] text-slate-500 font-mono">(Shift 1 Target: {shortfall?.target_shift_tons || 3200} T)</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden">
            <div 
              className="bg-amber-400 h-full rounded-full transition-all duration-700" 
              style={{ 
                width: `${Math.min(100, (((shortfall?.total_shift_yield_tons || shortfall?.projected_end_shift_tons || 2719.6) + recoveredTonnage) / (shortfall?.target_shift_tons || 3200)) * 100)}%` 
              }}
            />
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>Elapsed (06:00-11:00): <strong className="text-slate-200">{shortfall?.current_actual_tons || 1724} T</strong></span>
            <span>Projected (11:00-14:00): <strong className="text-cyan-300">{(shortfall?.shift_remaining_projected_tons || 995.6).toFixed(1)} T</strong></span>
          </div>
        </div>

        {/* Card 2: Phelps-Morgan Match Factor */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phelps-Morgan Match Factor</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black font-mono ${
              (matchFactor?.match_factor || 0.65) < 0.85 
                ? 'text-amber-400' 
                : (matchFactor?.match_factor || 0.65) > 1.15 
                  ? 'text-rose-400' 
                  : 'text-emerald-400'
            }`}>
              {matchFactor?.match_factor || 0.648}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {matchFactor?.status || 'UNDER_TRUCKED'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400 line-clamp-1">
            {matchFactor?.recommendation || 'Shovels starving: Deploy 2 auxiliary haulers.'}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Shovel: {matchFactor?.shovel_utilization_pct || 60}%</span>
            <span>Truck: {matchFactor?.truck_utilization_pct || 98}%</span>
          </div>
        </div>


      </div>

      {/* MAIN COMMAND NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'map'
              ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>1. Digital Twin Haulage &amp; Right-of-Way Map</span>
        </button>

        <button
          onClick={() => setActiveTab('shortfall')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'shortfall'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>2. Production Shortfall &amp; Corrective Solver</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'telemetry'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>3. Truck Telemetry &amp; TKPH HUD</span>
        </button>



        <button
          onClick={() => setActiveTab('workforce')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'workforce'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>4. Workforce &amp; Hot-Seat Roster</span>
        </button>
      </div>

      {/* TAB 1: DIGITAL TWIN HAULAGE & INTERSECTION MAP */}
      {activeTab === 'map' && (() => {
        const baseLat = fleetState?.base_lat || 21.5420;
        const baseLng = fleetState?.base_lng || 79.6780;

        const projectGPSToMap = (lat: number, lng: number) => {
          const dLat = (lat - baseLat) * 111000;
          const dLng = (lng - baseLng) * 103248;
          const mapScale = 680;
          const xPct = 50 + (dLng / mapScale) * 40;
          const yPct = 50 - (dLat / mapScale) * 40;
          return {
            x: Math.max(8, Math.min(92, xPct)),
            y: Math.max(8, Math.min(92, yPct))
          };
        };

        const gfA = geofences.find(g => g.id === 'GF-SHOVEL-A') || { lat: baseLat - 0.0035, lng: baseLng - 0.0025, name: 'Shovel Face Alpha' };
        const gfB = geofences.find(g => g.id === 'GF-SHOVEL-B') || { lat: baseLat - 0.0020, lng: baseLng + 0.0030, name: 'Shovel Face Bravo' };
        const gfInt = geofences.find(g => g.id === 'GF-RAMP-INTERSECT') || { lat: baseLat, lng: baseLng, name: 'Main Ramp Switchback' };
        const gfCrusher = geofences.find(g => g.id === 'GF-CRUSHER-1') || { lat: baseLat + 0.0040, lng: baseLng - 0.0020, name: 'Primary Crusher Plant' };
        const gfDump = geofences.find(g => g.id === 'GF-WASTE-DUMP') || { lat: baseLat + 0.0045, lng: baseLng + 0.0035, name: 'Waste Dump Yard' };

        const posA = projectGPSToMap(gfA.lat, gfA.lng);
        const posB = projectGPSToMap(gfB.lat, gfB.lng);
        const posInt = projectGPSToMap(gfInt.lat, gfInt.lng);
        const posCrusher = projectGPSToMap(gfCrusher.lat, gfCrusher.lng);
        const posDump = projectGPSToMap(gfDump.lat, gfDump.lng);

        const polygonPoints = (fleetState?.pit_polygon_coords || []).map((pt: [number, number]) => {
          const p = projectGPSToMap(pt[0], pt[1]);
          return `${p.x}%,${p.y}%`;
        }).join(' ');

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vector Haul Road Map */}
            <div className="lg:col-span-2 bg-[#060a14] border border-slate-800 rounded-2xl p-4 flex flex-col relative overflow-hidden min-h-[540px]">
              
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800/80 pb-3 mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    {fleetState?.mine_name || mineName} • {fleetState?.pit_type || 'Opencast Pit'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-300">
                    Strike: {fleetState?.strike || 'N65°E'} (Dip {fleetState?.dip || '55°'})
                  </span>
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-amber-300">
                    Pit Depth: {fleetState?.pit_depth_m || 85}m
                  </span>
                </div>
              </div>

              {/* 2D Vector Map Canvas */}
              <div className="flex-1 w-full relative bg-gradient-to-b from-[#070d1e] via-[#040814] to-[#02040a] rounded-xl border border-slate-800/80 p-4 flex items-center justify-center min-h-[440px] overflow-hidden">
                
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <linearGradient id="pitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>

                  {polygonPoints && (
                    <polygon
                      points={polygonPoints}
                      fill="url(#pitGrad)"
                      stroke="#0284c7"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                      className="opacity-70"
                    />
                  )}

                  <circle cx="50%" cy="50%" r="28%" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="5,5" />

                  {/* Road Paths */}
                  <line x1={`${posA.x}%`} y1={`${posA.y}%`} x2={`${posInt.x}%`} y2={`${posInt.y}%`} stroke="#10b981" strokeWidth="4" strokeDasharray="6,6" opacity="0.6" />
                  <line x1={`${posB.x}%`} y1={`${posB.y}%`} x2={`${posInt.x}%`} y2={`${posInt.y}%`} stroke="#06b6d4" strokeWidth="4" strokeDasharray="6,6" opacity="0.6" />
                  <line x1={`${posInt.x}%`} y1={`${posInt.y}%`} x2={`${posCrusher.x}%`} y2={`${posCrusher.y}%`} stroke="#10b981" strokeWidth="5" opacity="0.7" />
                  <line x1={`${posInt.x}%`} y1={`${posInt.y}%`} x2={`${posDump.x}%`} y2={`${posDump.y}%`} stroke="#64748b" strokeWidth="3" opacity="0.6" />
                </svg>

                {/* Switchback Intersection Node-3 with Right of Way */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-dashed border-amber-500/60 bg-amber-500/10 flex flex-col items-center justify-center p-1 text-center pointer-events-none z-10"
                  style={{ left: `${posInt.x}%`, top: `${posInt.y}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse mb-0.5" />
                  <span className="text-[8.5px] font-bold text-amber-300 font-mono">NODE-3 SWITCHBACK</span>
                  <span className="text-[7px] text-amber-400/90 font-mono font-bold bg-amber-950/80 px-1 rounded">
                    Uphill Loaded Right-of-Way
                  </span>
                </div>

                {/* Shovel Face Alpha */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-purple-500/70 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posA.x}%`, top: `${posA.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-[9px] font-bold text-purple-300">{shovels[0]?.id || 'MOIL-EXC-0040'}</span>
                  </div>
                  <span className="text-[8px] text-slate-300 line-clamp-1">{shovels[0]?.location_name || 'Bench 4 High Grade'}</span>
                  <span className="text-[7.5px] bg-purple-950 text-purple-300 px-1 py-0.2 rounded font-mono font-bold">
                    Queue: {shovels[0]?.queue_count || 1} Trucks
                  </span>
                </div>

                {/* Shovel Face Bravo */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-cyan-500/70 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posB.x}%`, top: `${posB.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-[9px] font-bold text-cyan-300">{shovels[1]?.id || 'MOIL-EXC-0048'}</span>
                  </div>
                  <span className="text-[8px] text-slate-300 line-clamp-1">{shovels[1]?.location_name || 'Bench 2 Medium Grade'}</span>
                  <span className="text-[7.5px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded font-mono font-bold">
                    Queue: {shovels[1]?.queue_count || 0} Trucks
                  </span>
                </div>

                {/* Primary Crusher */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-emerald-500/70 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posCrusher.x}%`, top: `${posCrusher.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-bold text-emerald-300">ROM Crusher Plant</span>
                  </div>
                  <span className="text-[7.5px] bg-emerald-950 text-emerald-300 px-1 py-0.2 rounded font-mono font-bold">
                    Spec: 43.5% Mn
                  </span>
                </div>

                {/* Waste Dump */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-slate-900/95 border border-slate-600 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posDump.x}%`, top: `${posDump.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-[9px] font-bold text-slate-300">Waste Overburden Dump</span>
                  </div>
                  <span className="text-[7.5px] text-slate-400 font-mono">Tip Heads Active</span>
                </div>

                {/* Live Trucks Pins (Real CSV IDs) */}
                {trucks.map((truck) => {
                  let startPos = posA;
                  let endPos = posCrusher;

                  if (truck.route === 'A_TO_CRUSHER') {
                    startPos = posA; endPos = posCrusher;
                  } else if (truck.route === 'CRUSHER_TO_A') {
                    startPos = posCrusher; endPos = posA;
                  } else if (truck.route === 'B_TO_CRUSHER') {
                    startPos = posB; endPos = posCrusher;
                  } else if (truck.route === 'CRUSHER_TO_B') {
                    startPos = posCrusher; endPos = posB;
                  } else if (truck.route === 'A_TO_WASTE') {
                    startPos = posA; endPos = posDump;
                  }

                  const p = truck.progress;
                  const posX = startPos.x + (endPos.x - startPos.x) * p;
                  const posY = startPos.y + (endPos.y - startPos.y) * p;

                  const isSelected = selectedTruck?.id === truck.id;

                  return (
                    <div
                      key={truck.id}
                      onClick={() => setSelectedTruck(truck)}
                      className={`absolute cursor-pointer transition-all duration-700 transform -translate-x-1/2 -translate-y-1/2 z-20 ${
                        isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                      }`}
                      style={{ left: `${Math.max(6, Math.min(94, posX))}%`, top: `${Math.max(6, Math.min(94, posY))}%` }}
                    >
                      <div className={`flex flex-col items-center ${isSelected ? 'animate-bounce' : ''}`}>
                        <div className={`p-1.5 rounded-full border shadow-xl ${
                          truck.status === 'LOADED_HAUL'
                            ? 'bg-emerald-500 text-black border-emerald-300'
                            : truck.status === 'EMPTY_RETURN'
                              ? 'bg-cyan-500 text-black border-cyan-300'
                              : truck.status === 'LOADING'
                                ? 'bg-amber-500 text-black border-amber-300 animate-pulse'
                                : 'bg-purple-500 text-white border-purple-300'
                        }`}>
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-[8px] font-mono font-black px-1 rounded shadow-md mt-0.5 whitespace-nowrap ${
                          isSelected ? 'bg-amber-400 text-black' : 'bg-slate-900/90 text-slate-200 border border-slate-700'
                        }`}>
                          {truck.id} • {truck.speed_kmh.toFixed(0)} km/h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Truck Telemetry HUD */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
              {selectedTruck ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-lg font-black text-white">{selectedTruck.id}</h3>
                      </div>
                      <span className="text-xs text-slate-400 font-mono">{selectedTruck.model}</span>
                    </div>
                    {getStatusBadge(selectedTruck.status)}
                  </div>

                  {/* Live Gauges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Strut Payload &amp; Carryback</span>
                        {selectedTruck.payload_compliance?.carryback_alert && (
                          <span className="text-[9px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-600/50">
                            Carryback: +{selectedTruck.payload_compliance?.tare_drift_tons}T
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">{selectedTruck.payload_t}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/ {selectedTruck.capacity_t} T</span>
                        <span className={`text-[9px] font-bold ml-auto px-1.5 py-0.5 rounded ${
                          selectedTruck.payload_compliance?.compliance_status === 'OPTIMAL'
                            ? 'text-emerald-400 bg-emerald-950'
                            : selectedTruck.payload_compliance?.compliance_status.includes('OVERLOADED')
                              ? 'text-rose-400 bg-rose-950'
                              : 'text-amber-400 bg-amber-950'
                        }`}>
                          {selectedTruck.payload_compliance?.compliance_pct || 100}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden flex">
                        <div 
                          className={`h-full rounded-full ${
                            (selectedTruck.payload_compliance?.compliance_pct || 100) > 110 
                              ? 'bg-rose-500' 
                              : (selectedTruck.payload_compliance?.compliance_pct || 100) < 90 
                                ? 'bg-amber-500' 
                                : 'bg-emerald-400'
                          }`}
                          style={{ width: `${Math.min(100, (selectedTruck.payload_t / selectedTruck.capacity_t) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">Tire TKPH (OEM Rating)</span>
                        {selectedTruck.telemetry?.thermal_throttling_active ? (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-600/60 animate-pulse">
                            Throttled 18km/h
                          </span>
                        ) : (
                          <span className="text-[9px] text-emerald-400 font-medium">Safe Zone</span>
                        )}
                      </div>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className={`text-xl font-black ${selectedTruck.telemetry?.thermal_throttling_active ? 'text-rose-400' : 'text-amber-400'}`}>
                          {selectedTruck.telemetry?.tkph || 310}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">/ 420 Max</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-mono mt-1">
                        Front: {selectedTruck.telemetry?.tkph_front || 280} • Rear: {selectedTruck.telemetry?.tkph_rear || 340} TKPH
                      </div>
                    </div>
                  </div>

                  {/* Haul Cycle Phase Breakdown */}
                  {selectedTruck.cycle_phase_times && (
                    <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl">
                      <div className="flex items-center justify-between text-[11px] mb-1.5">
                        <span className="font-bold text-slate-300 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          Haul Cycle Breakdown ({selectedTruck.cycle_phase_times.total_cycle_time_min}m)
                        </span>
                        <span className={`font-mono text-[10px] font-bold ${
                          selectedTruck.cycle_phase_times.variance_vs_baseline_pct <= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {selectedTruck.cycle_phase_times.variance_vs_baseline_pct > 0 ? '+' : ''}
                          {selectedTruck.cycle_phase_times.variance_vs_baseline_pct}% vs Baseline (6.2m)
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px]">
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block">Queue</span>
                          <span className="font-bold text-amber-400">{selectedTruck.cycle_phase_times.queue_time_shovel_min}m</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block">Spot/Load</span>
                          <span className="font-bold text-purple-400">{selectedTruck.cycle_phase_times.spot_load_time_min}m</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block">Haul Ramp</span>
                          <span className="font-bold text-cyan-400">{selectedTruck.cycle_phase_times.haul_travel_time_min}m</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                          <span className="text-slate-500 block">Dump/Wait</span>
                          <span className="font-bold text-emerald-400">{selectedTruck.cycle_phase_times.dump_wait_time_min}m</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Engine & Chassis Telemetry */}
                  <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400"><Fuel className="w-3.5 h-3.5 text-amber-400" /> Fuel Burn Rate</span>
                      <span className="font-bold text-amber-300">{selectedTruck.telemetry?.fuel_burn_rate_lph.toFixed(1) || 58.0} L/h</span>
                    </div>
                    {selectedTruck.telemetry?.fuel_cycle_state && (
                      <p className="text-[10px] text-slate-500 italic">{selectedTruck.telemetry.fuel_cycle_state}</p>
                    )}
                    <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-slate-800/60">
                      <span className="flex items-center gap-1.5 text-slate-400"><Activity className="w-3.5 h-3.5 text-cyan-400" /> ISO 10816 Vibration</span>
                      <span className={`font-bold ${
                        selectedTruck.telemetry?.vibration_status === 'NORMAL' ? 'text-emerald-400' : 'text-amber-400'
                      }`}>
                        {selectedTruck.telemetry?.vibration_rms_mms || 2.4} mm/s RMS ({selectedTruck.telemetry?.vibration_status || 'NORMAL'})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400"><Radio className="w-3.5 h-3.5 text-emerald-400" /> Collision Avoidance (CAS)</span>
                      <span className="font-bold text-emerald-400 text-[10px]">
                        {selectedTruck.intersection_status || 'CLEAR_HAUL_RAMP'}
                      </span>
                    </div>
                  </div>

                  {/* Deep Diagnostics Button */}
                  <button
                    onClick={() => {
                      setModalTruck(selectedTruck);
                      setIsModalOpen(true);
                    }}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition-all"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Open Full 6-Wheel TPMS &amp; Subsystem Diagnostics</span>
                  </button>

                  {/* Dynamic Reroute Dispatch Buttons */}
                  <div className="pt-1">
                    <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Dynamic In-Pit Dispatch Reroute</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApplyAction({
                          action_id: 'REROUTE_BENCH4',
                          priority: 'HIGH',
                          title: `Reroute ${selectedTruck.id} to Bench 4 Bypass`,
                          category: 'DISPATCH',
                          description: 'Dynamic geofenced reroute',
                          tonnage_recovery_tons: 50,
                          recovery_time_min: 10,
                          cost_impact: 'LOW',
                          status: 'ACTIVE'
                        })}
                        className="px-2.5 py-2 bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 border border-purple-600/70 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Bench 4 Bypass</span>
                      </button>
                      <button
                        onClick={() => handleApplyAction({
                          action_id: 'REROUTE_CRUSHER',
                          priority: 'HIGH',
                          title: `Reroute ${selectedTruck.id} to Crusher #1`,
                          category: 'DISPATCH',
                          description: 'Dynamic geofenced reroute',
                          tonnage_recovery_tons: 45,
                          recovery_time_min: 10,
                          cost_impact: 'LOW',
                          status: 'ACTIVE'
                        })}
                        className="px-2.5 py-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-600/70 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Crusher Plant</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 text-xs">
                  <Truck className="w-8 h-8 mb-2 opacity-50" />
                  <span>Select a truck on the map to inspect live telemetry.</span>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* TAB 2: PRODUCTION SHORTFALL & CORRECTIVE SOLVER */}
      {activeTab === 'shortfall' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Hourly Trend Bar Chart */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Hourly Extraction Yield Gap (Target vs Actual Crusher Feed)</span>
                  </h3>
                  <p className="text-xs text-slate-400">Shift 1 (06:00 - 14:00) • Real-Time Delta Tonnage</p>
                </div>
                <span className="bg-amber-950/90 text-amber-300 border border-amber-500/70 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                  Gap: -{(shortfall?.projected_shortfall_tons - recoveredTonnage) > 0 ? (shortfall?.projected_shortfall_tons - recoveredTonnage) : 0} Tons
                </span>
              </div>

              <div className="space-y-3">
                {shortfall?.hourly_trend?.map((hr: any) => (
                  <div key={hr.hour} className="flex items-center gap-3 text-xs font-mono">
                    <div className="w-24 flex items-center justify-between text-slate-400">
                      <span>{hr.hour}</span>
                      <span className={`text-[8.5px] px-1 py-0.2 rounded font-bold ${
                        hr.status === 'COMPLETED' ? 'bg-slate-800 text-slate-300' : 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                      }`}>
                        {hr.status === 'COMPLETED' ? 'Actual' : 'Proj'}
                      </span>
                    </div>
                    <div className="flex-1 flex items-center gap-2 bg-slate-950/80 rounded-lg p-2 border border-slate-800/80">
                      <div className="w-24 text-[11px] text-slate-300">
                        <span className="font-bold text-white">{hr.actual_tons}</span> / {hr.target_tons} T
                      </div>
                      <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
                        <div 
                          className={`h-full rounded-full transition-all ${
                            hr.actual_tons >= hr.target_tons 
                              ? 'bg-emerald-500' 
                              : hr.actual_tons >= hr.target_tons * 0.85 
                                ? 'bg-amber-500' 
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, (hr.actual_tons / hr.target_tons) * 100)}%` }}
                        />
                      </div>
                      <span className={`w-16 text-right text-[11px] font-bold ${
                        hr.variance_tons >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {hr.variance_tons > 0 ? `+${hr.variance_tons}` : hr.variance_tons} T
                      </span>
                    </div>
                  </div>
                ))}

                {/* Shift Cumulative Extraction Summary Footer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs font-mono bg-slate-950/90 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold uppercase text-[11px]">Shift Extraction Yield:</span>
                    <span className="text-white font-black text-sm">
                      {shortfall 
                        ? Math.round((shortfall.total_shift_yield_tons || shortfall.projected_end_shift_tons || 2719.6) + recoveredTonnage) 
                        : 2720} / {shortfall?.target_shift_tons || 3200} Tons
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                      {shortfall 
                        ? Math.min(100, Math.round((((shortfall.total_shift_yield_tons || shortfall.projected_end_shift_tons || 2719.6) + recoveredTonnage) / (shortfall?.target_shift_tons || 3200)) * 100)) 
                        : 85}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-amber-400 font-bold">
                      Deficit: -{(shortfall ? Math.max(0, Math.round(((shortfall.projected_shortfall_tons || 480.4) - recoveredTonnage) * 10) / 10) : 480.4)} Tons
                    </span>
                    <span className="text-[10px] text-slate-500">
                      (Elapsed: {shortfall?.current_actual_tons || 1724} T + Proj: {(shortfall?.shift_remaining_projected_tons || 995.6).toFixed(1)} T)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Root-Cause Bottlenecks */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Shortfall Root-Cause Constraint Attribution</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shortfall?.bottlenecks?.map((b: any, idx: number) => (
                  <div key={idx} className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{b.cause}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          b.severity === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-600/70' : 'bg-amber-950 text-amber-300 border border-amber-600/70'
                        }`}>
                          {b.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">{b.bench} • Duration: {b.duration_min} min</p>
                      {b.description && <p className="text-[10px] text-slate-500 mt-1">{b.description}</p>}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="text-rose-400 font-bold">-{b.loss_tons} T Production Loss</span>
                      <span className="text-slate-500">{b.pct_of_loss}% of Deficit</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Face-to-Crusher Ore Blending & Reconciliation */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <span>Face-to-Crusher Ore Blending &amp; Waste Diversion Log</span>
                  </h3>
                  <p className="text-xs text-slate-400">Live Weighted-Average Grade at Primary Crusher Pocket vs Contract Specification</p>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="text-xs px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    Target: <span className="text-white font-bold">{crusherBlend?.target_contract_mn_pct || 43.5}% Mn</span>
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded font-bold border ${
                    crusherBlend?.status === 'IN_SPECIFICATION' 
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600/60' 
                      : 'bg-amber-950 text-amber-300 border-amber-600/60'
                  }`}>
                    Crusher Feed: {crusherBlend?.current_crusher_feed_mn_pct || 43.8}% Mn ({crusherBlend?.variance_pct > 0 ? '+' : ''}{crusherBlend?.variance_pct || 0.3}%)
                  </span>
                </div>
              </div>

              {/* Shovel Geological Face Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                {shovels.map((s, idx) => (
                  <div key={s.id} className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-purple-400' : 'bg-cyan-400'}`} />
                        <span className="text-xs font-bold text-white">{s.id}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({s.location_name})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Face: <span className="text-slate-200 font-bold">{s.face_id || 'FACE-01'}</span> • {s.lithology || 'High-Grade Pyrolusite'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-1 rounded border border-emerald-600/50">
                      {s.face_grade_mn_pct || 44.5}% Mn
                    </span>
                  </div>
                ))}
              </div>

              {/* Real-time Diversion Logs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Time</th>
                      <th className="p-2.5">Haul Truck</th>
                      <th className="p-2.5">Excavator Face</th>
                      <th className="p-2.5">Payload</th>
                      <th className="p-2.5">Face Grade</th>
                      <th className="p-2.5">Destination Route</th>
                      <th className="p-2.5">Diversion Check</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {crusherBlend?.diversion_logs?.map((log: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5 text-slate-500">{log.tip_timestamp}</td>
                        <td className="p-2.5 font-bold text-white flex items-center gap-1">
                          <Truck className="w-3 h-3 text-cyan-400" />
                          {log.truck_id}
                        </td>
                        <td className="p-2.5 text-slate-300">{log.source_face}</td>
                        <td className="p-2.5 font-bold text-white">{log.payload_tons} T</td>
                        <td className="p-2.5 font-bold text-emerald-400">{log.face_grade_mn_pct}% Mn</td>
                        <td className="p-2.5 text-slate-300">{log.routed_destination}</td>
                        <td className="p-2.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                            log.compliance_check.includes('VERIFIED')
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-600/50'
                              : 'bg-amber-950 text-amber-300 border-amber-600/50'
                          }`}>
                            {log.compliance_check}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: 1-Click Engineering Corrective Actions & Auto-Dispatch */}
          <div className="space-y-4">
            {/* Dynamic Auto-Dispatch Shovel Pairing Card */}
            <div className="bg-slate-900/90 border border-cyan-500/50 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                  <Cpu className="w-4 h-4" />
                  <span>Dynamic Auto-Dispatch Pairing</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600/50 font-bold">
                  Active Pairing Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                Minimizes excavator hang time by actively redirecting returning haulers to the shortest queue.
              </p>

              <div className="space-y-2 mb-3 font-mono text-xs">
                {autoDispatchData?.shovel_queues?.map((sq: any) => (
                  <div key={sq.shovel_id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex justify-between items-center">
                    <div>
                      <span className="text-white font-bold">{sq.shovel_id}</span>
                      <span className="text-[10px] text-slate-400 block">{sq.bench}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-400 font-bold">{sq.queue_count} Trucks in Queue</span>
                      <span className="text-[10px] text-slate-500 block">Hang Time: {sq.hang_time_min}m</span>
                    </div>
                  </div>
                ))}
              </div>

              {autoDispatchData?.reassignments && autoDispatchData.reassignments.length > 0 && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-600/30 mb-3 text-xs font-mono">
                  <div className="flex justify-between text-cyan-300 font-bold mb-1">
                    <span>Reassign {autoDispatchData.reassignments[0].truck_id}</span>
                    <span className="text-emerald-400">+{autoDispatchData.reassignments[0].projected_cycle_efficiency_gain_pct}% Efficiency</span>
                  </div>
                  <p className="text-[10px] text-slate-400">{autoDispatchData.reassignments[0].reason}</p>
                </div>
              )}

              <button
                onClick={() => {
                  setAutoDispatchTriggered(true);
                  setTimeout(() => setAutoDispatchTriggered(false), 3000);
                }}
                disabled={autoDispatchTriggered}
                className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  autoDispatchTriggered
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950'
                }`}
              >
                {autoDispatchTriggered ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Auto-Dispatch Harmonized (-3.4m Hang Time)</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Trigger Auto-Dispatch Reassignment</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>AI Prescriptive Corrective Solver</span>
              </div>
              <h3 className="text-sm font-black text-white mb-4">Execute Tonnage Recovery Actions</h3>

              <div className="space-y-3">
                {correctiveActions.map((action) => {
                  const isApplied = appliedActions.has(action.action_id);
                  return (
                    <div 
                      key={action.action_id}
                      className={`border rounded-xl p-3.5 transition-all ${
                        isApplied 
                          ? 'bg-emerald-950/40 border-emerald-500/60' 
                          : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{action.title}</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600/60">
                          +{action.tonnage_recovery_tons} T
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">{action.description}</p>
                      
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] text-slate-500 font-mono">Impact: ~{action.recovery_time_min} mins</span>
                        
                        <button
                          onClick={() => handleApplyAction(action)}
                          disabled={isApplied}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isApplied
                              ? 'bg-emerald-600 text-white cursor-default shadow-md shadow-emerald-950'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-950'
                          }`}
                        >
                          {isApplied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Executed</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5" />
                              <span>Execute 1-Click</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* LP Optimization Solution Box */}
            {lpSolution && (
              <div className="bg-slate-900/90 border border-cyan-500/50 rounded-2xl p-4 shadow-xl">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                  SciPy Linear Programming Solution
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Min-Cost Flow Truck Flow Rebalancing</span>
                <div className="mt-3 space-y-2 text-xs font-mono">
                  {lpSolution.reassignments?.map((r: any, idx: number) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>{r.truck_id}</span>
                        <span className="text-emerald-400">{r.hourly_tonnage_gain_tph} TPH</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{r.to_target}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: TRUCK TELEMETRY & TKPH HUD */}
      {activeTab === 'telemetry' && (
        <div className="space-y-6">
          {/* HEMM Fleet OEE Decomposition Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-emerald-400" />
                  <span>HEMM Fleet Overall Equipment Effectiveness (OEE Decomposition)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  ISO / CIM Mining Standards: Mechanical Availability (MA) × Utilization of Availability (UA) × Operational Efficiency
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950 px-3 py-1 rounded-lg border border-emerald-600/50">
                Overall Fleet OEE: {hemmData?.overall_oee_decomposition?.overall_oee_pct || 68.4}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Mechanical Availability (MA)</span>
                <div className="mt-1 text-2xl font-black text-cyan-400 font-mono">
                  {hemmData?.overall_oee_decomposition?.mechanical_availability_pct || 88.5}%
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">(Op + Standby) / Calendar Hours</span>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Utilization of Availability (UA)</span>
                <div className="mt-1 text-2xl font-black text-purple-400 font-mono">
                  {hemmData?.overall_oee_decomposition?.utilization_of_availability_pct || 84.2}%
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Op Hours / (Op + Standby)</span>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold">Operational Efficiency</span>
                <div className="mt-1 text-2xl font-black text-amber-400 font-mono">
                  {hemmData?.overall_oee_decomposition?.operational_efficiency_pct || 91.8}%
                </div>
                <span className="text-[10px] text-slate-500 block mt-1">Actual / Rated Payload Moves</span>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-emerald-500/40">
                <span className="text-[10px] text-emerald-400 uppercase font-mono font-semibold">World-Class Mining OEE Target</span>
                <div className="mt-1 text-2xl font-black text-emerald-400 font-mono">
                  {hemmData?.overall_oee_decomposition?.overall_oee_pct || 68.4}%
                </div>
                <span className="text-[10px] text-emerald-400/80 block mt-1">Target Benchmark &gt; 65%</span>
              </div>
            </div>
          </div>

          {/* Full Truck Fleet Telemetry & Component Health Matrix */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>Full Haul Truck Telemetry, Payload Compliance &amp; Multi-Axle TKPH Matrix</span>
              </h3>
              <span className="text-xs text-slate-400 font-mono">Click any truck for 6-Wheel TPMS &amp; Subsystem Diagnostics</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3">Truck &amp; OEM Model</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payload Compliance</th>
                    <th className="p-3">Tray Carryback</th>
                    <th className="p-3">Haul Cycle (Total / Baseline)</th>
                    <th className="p-3">Tire TKPH (Front / Rear)</th>
                    <th className="p-3">Dynamic Fuel Burn</th>
                    <th className="p-3">ISO 10816 Vibration</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trucks.map((truck) => (
                    <tr 
                      key={truck.id} 
                      onClick={() => {
                        setSelectedTruck(truck);
                        setModalTruck(truck);
                      }}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-bold text-white flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        <div>
                          <span>{truck.id}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">{truck.model}</span>
                        </div>
                      </td>
                      <td className="p-3">{getStatusBadge(truck.status)}</td>
                      <td className="p-3">
                        <div className="font-bold text-white">{truck.payload_t} / {truck.capacity_t} T</div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                          truck.payload_compliance?.compliance_status === 'OPTIMAL'
                            ? 'text-emerald-400 bg-emerald-950'
                            : truck.payload_compliance?.compliance_status.includes('OVERLOADED')
                              ? 'text-rose-400 bg-rose-950'
                              : 'text-amber-400 bg-amber-950'
                        }`}>
                          {truck.payload_compliance?.compliance_status || 'OPTIMAL'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-bold ${truck.payload_compliance?.carryback_alert ? 'text-amber-400' : 'text-slate-300'}`}>
                          +{truck.payload_compliance?.tare_drift_tons || 1.2} T
                        </span>
                        {truck.payload_compliance?.carryback_alert && (
                          <span className="text-[8.5px] block text-amber-500 font-bold">Wash Req.</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-cyan-300">
                          {truck.cycle_phase_times?.total_cycle_time_min || 11.2}m
                          <span className="text-[10px] text-slate-500 font-normal"> / 6.2m baseline</span>
                        </div>
                        <span className={`text-[9px] font-bold ${
                          (truck.cycle_phase_times?.variance_vs_baseline_pct || 0) <= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {(truck.cycle_phase_times?.variance_vs_baseline_pct || 0) > 0 ? '+' : ''}
                          {truck.cycle_phase_times?.variance_vs_baseline_pct || 0}% variance
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${truck.telemetry?.thermal_throttling_active ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {truck.telemetry?.tkph || 310}
                          </span>
                          <span className="text-slate-500 text-[10px]">/ 420 Max</span>
                        </div>
                        {truck.telemetry?.thermal_throttling_active ? (
                          <span className="text-[8.5px] font-bold text-rose-400 bg-rose-950 px-1 py-0.2 rounded border border-rose-600/50">
                            Throttled 18km/h
                          </span>
                        ) : (
                          <span className="text-[9px] text-slate-400">
                            F: {truck.telemetry?.tkph_front || 280} • R: {truck.telemetry?.tkph_rear || 340}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="text-amber-300 font-bold">{truck.telemetry?.fuel_burn_rate_lph.toFixed(1)} L/h</div>
                        <span className="text-[8.5px] text-slate-400 block line-clamp-1">{truck.telemetry?.fuel_cycle_state || 'Nominal'}</span>
                      </td>
                      <td className="p-3">
                        <span className={`font-bold ${
                          truck.telemetry?.vibration_status === 'NORMAL' 
                            ? 'text-emerald-400' 
                            : truck.telemetry?.vibration_status === 'ALERT'
                              ? 'text-amber-400' 
                              : 'text-rose-400'
                        }`}>
                          {truck.telemetry?.vibration_rms_mms || 2.4} mm/s
                        </span>
                        <span className="text-[8.5px] text-slate-400 block">
                          {truck.telemetry?.vibration_status || 'NORMAL'}
                        </span>
                      </td>
                      <td className="p-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalTruck(truck);
                            setIsModalOpen(true);
                          }}
                          className="px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600/60 rounded text-[10px] font-bold flex items-center gap-1 shadow"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Diagnostics</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* TAB 4: MINE WORKFORCE ROSTER & STATUTORY DGMS COMPLIANCE */}
      {activeTab === 'workforce' && (
        <div className="space-y-6">
          {/* Shift Changeover Gap Tracking Banner (DGMS Lost-Time Optimizer) */}
          <div className="bg-gradient-to-r from-slate-900 via-rose-950/40 to-slate-900 border border-rose-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rose-900/40 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Hot-Seat Shift Changeover Gap Tracker</span>
                    <span className="text-[10px] bg-rose-900/80 text-rose-300 font-mono px-2 py-0.5 rounded border border-rose-600/60 font-bold">
                      DGMS Statutory Lost-Time Protocol
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Quantifies bench travel transit vs engine idle/stoppage gap to eliminate shift-handoff production dips.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-mono">Current Shift</div>
                  <div className="text-xs font-bold text-rose-300">
                    {workforceRoster?.current_shift || 'Shift-1 (Day General 06:00 - 14:00)'}
                  </div>
                </div>
                <span className="bg-rose-950 text-rose-300 border border-rose-600/50 text-xs font-mono font-bold px-3 py-1.5 rounded-lg">
                  Active On Bench: {workforceRoster?.active_shift_headcount || 142} Personnel
                </span>
              </div>
            </div>

            {/* Gap Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Lost Time at Changeover</span>
                <div className="text-xl font-extrabold text-rose-400 font-mono mt-1">
                  {workforceRoster?.changeover_gap_tracking?.lost_time_at_changeover_min || 22.5} min
                </div>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Bench Travel: {workforceRoster?.changeover_gap_tracking?.bench_travel_time_min || 14.0}m • Engine Gap: {workforceRoster?.changeover_gap_tracking?.engine_restart_gap_min || 8.5}m
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Tonnage Penalty / Shift</span>
                <div className="text-xl font-extrabold text-rose-400 font-mono mt-1">
                  -{workforceRoster?.changeover_gap_tracking?.tonnage_lost_shift || 92.0} Tons
                </div>
                <span className="text-[9px] text-slate-500 block mt-0.5">
                  Lost excavator swing capacity during uncoordinated handoff
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block">Staggered Hot-Seat Gain</span>
                <div className="text-xl font-extrabold text-emerald-400 font-mono mt-1">
                  +{workforceRoster?.changeover_gap_tracking?.staggered_hotseat_savings_tons || 78.0} Tons
                </div>
                <span className="text-[9px] text-emerald-500/80 block mt-0.5">
                  Direct recovery by overlapping relief drivers on bench
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-cyan-400 uppercase font-mono block">Active Protocol</span>
                  <p className="text-[9.5px] text-slate-300 leading-tight mt-1">
                    {workforceRoster?.changeover_gap_tracking?.recommendation || 'Deploy staggered hot-seat changeover at 11:30 to eliminate 22.5 min bench transition gap.'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActionSuccessMsg("Staggered Hot-Seat Shift Protocol Dispatched! Relief drivers routed to Bench-4 (+78 T saved).");
                    setTimeout(() => setActionSuccessMsg(null), 4000);
                  }}
                  className="mt-2 w-full py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold transition shadow"
                >
                  Authorize Staggered Relief
                </button>
              </div>
            </div>
          </div>

          {/* Main Crews & Statutory Compliance Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Statutory Safety, Operator Fatigue &amp; License Interlocks</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Enforces DGMS Vocational Training (VT Rule 1966), Form O Medical Fitness, 4-hr continuous driving limits, and In-Cab AI fatigue camera telemetry.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-emerald-950 text-emerald-300 border border-emerald-600/50 text-[11px] font-mono font-bold px-2.5 py-1 rounded">
                  DGMS Interlocks: ACTIVE
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Haulage Drivers with Fatigue & Ignition Locks */}
              <div className="lg:col-span-2 space-y-3">
                <span className="text-xs font-bold text-cyan-400 uppercase font-mono flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  <span>Haul Truck Operators ({workforceRoster?.crews?.haulage_drivers?.length || 4} Active on Wheel)</span>
                </span>

                <div className="space-y-3">
                  {workforceRoster?.crews?.haulage_drivers?.map((driver: any) => {
                    const drivingPct = Math.min(100, Math.round((driver.continuous_driving_minutes / driver.max_continuous_allowed_min) * 100));
                    const isFatigued = driver.break_required_alert || driver.fatigue_camera?.driver_fitness_status?.includes('WARNING');
                    
                    return (
                      <div 
                        key={driver.operator_id} 
                        className={`p-3.5 rounded-xl border transition-all ${
                          isFatigued 
                            ? 'bg-rose-950/30 border-rose-500/80 shadow-lg shadow-rose-950/40' 
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-cyan-400 text-xs font-mono">
                              {driver.operator_id.split('-').pop()}
                            </div>
                            <div>
                              <div className="font-bold text-white text-xs flex items-center gap-1.5">
                                <span>{driver.name} ({driver.operator_id})</span>
                                <span className="text-[10px] text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                                  {driver.assigned_truck}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Experience: {driver.experience_yrs} yrs • Relief Slot: {driver.relief_due}
                              </span>
                            </div>
                          </div>

                          {/* DGMS Ignition Lock Badge */}
                          <div className="flex items-center gap-1.5">
                            <span className="bg-emerald-950 text-emerald-300 border border-emerald-600/60 text-[9.5px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              <span>{driver.statutory_dgms?.machine_license_lock || 'AUTHORIZED (Ignition Unlocked)'}</span>
                            </span>
                          </div>
                        </div>

                        {/* Continuous Driving Countdown Bar */}
                        <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800/80 space-y-1.5 mb-2.5">
                          <div className="flex justify-between items-center text-[10px] font-mono">
                            <span className="text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Continuous Driving (DGMS 4h Limit):</span>
                            </span>
                            <span className={`font-bold ${isFatigued ? 'text-rose-400' : 'text-slate-200'}`}>
                              {Math.floor(driver.continuous_driving_minutes / 60)}h {driver.continuous_driving_minutes % 60}m / 4h 00m
                              <span className="text-slate-500 font-normal"> ({drivingPct}%)</span>
                            </span>
                          </div>
                          
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all ${
                                drivingPct >= 95 ? 'bg-rose-500 animate-pulse' : drivingPct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${drivingPct}%` }}
                            />
                          </div>

                          <div className="flex justify-between items-center text-[9.5px]">
                            <span className="text-slate-500 font-mono">
                              Mandatory 30-min break due in: <strong className={driver.mandatory_break_due_in_min < 20 ? 'text-rose-400' : 'text-amber-400'}>{driver.mandatory_break_due_in_min} min</strong>
                            </span>
                            {driver.break_required_alert && (
                              <span className="text-[9px] font-bold text-rose-400 bg-rose-950 px-1.5 py-0.2 rounded border border-rose-600/60 animate-bounce">
                                IMMEDIATE RELIEF REQUIRED
                              </span>
                            )}
                          </div>
                        </div>

                        {/* In-Cab AI Fatigue Camera & DGMS Verification Cards */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          {/* AI Fatigue Camera Telemetry */}
                          <div className={`p-2 rounded border ${
                            driver.fatigue_camera?.microsleep_events > 0 
                              ? 'bg-rose-950/40 border-rose-500/60' 
                              : 'bg-slate-900 border-slate-800'
                          }`}>
                            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                              <span className="font-bold uppercase flex items-center gap-1 text-slate-300">
                                <Eye className="w-3 h-3 text-cyan-400" />
                                In-Cab AI Camera
                              </span>
                              <span className={driver.fatigue_camera?.microsleep_events > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                                {driver.fatigue_camera?.microsleep_events > 0 ? 'FATIGUE ALERT' : 'ATTENTIVE'}
                              </span>
                            </div>
                            <div className="text-slate-300 space-y-0.5">
                              <div>Microsleep: <strong className={driver.fatigue_camera?.microsleep_events > 0 ? 'text-rose-400' : 'text-slate-400'}>{driver.fatigue_camera?.microsleep_events || 0} events</strong></div>
                              <div>Gaze Deviation: <strong className={driver.fatigue_camera?.gaze_deviation_pct > 10 ? 'text-rose-400' : 'text-slate-400'}>{driver.fatigue_camera?.gaze_deviation_pct || 3.2}%</strong></div>
                              <div>Distraction Alerts: <strong className={driver.fatigue_camera?.distraction_alerts > 0 ? 'text-amber-400' : 'text-slate-400'}>{driver.fatigue_camera?.distraction_alerts || 0}</strong></div>
                            </div>
                          </div>

                          {/* DGMS Statutory Verification */}
                          <div className="p-2 rounded bg-slate-900 border border-slate-800">
                            <div className="flex items-center justify-between text-[9px] text-slate-400 mb-1">
                              <span className="font-bold uppercase flex items-center gap-1 text-slate-300">
                                <FileCheck className="w-3 h-3 text-emerald-400" />
                                Statutory Clearance
                              </span>
                              <span className="text-emerald-400 font-bold">100% OK</span>
                            </div>
                            <div className="text-slate-300 space-y-0.5">
                              <div className="truncate">VT Rule 1966: <strong className="text-emerald-400">Form B Valid</strong></div>
                              <div className="truncate">Form O Medical: <strong className="text-emerald-400">Fit (Dec 2026)</strong></div>
                              <div className="truncate">Axle OEM Safety: <strong className="text-cyan-400">DGMS Cert.</strong></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Shovel Masters, Drill Masters & Hot-Seat Pool */}
              <div className="space-y-4">
                {/* Shovel Operators Linked to Face Grade */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <span className="text-xs font-bold text-purple-400 uppercase font-mono flex items-center gap-1.5 mb-3">
                    <Crosshair className="w-3.5 h-3.5" />
                    <span>Shovel &amp; Drill Masters</span>
                  </span>
                  
                  <div className="space-y-2.5">
                    {workforceRoster?.crews?.shovel_operators?.map((s: any) => (
                      <div key={s.operator_id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{s.operator_id}</span>
                          <span className="text-[10px] text-purple-300 font-mono bg-purple-950 px-1.5 py-0.2 rounded border border-purple-800">
                            {s.assigned_machine}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 flex justify-between">
                          <span>{s.bench}</span>
                          <span className="text-cyan-400 font-bold font-mono">{s.face_grade_mn_pct || 44.5}% Mn</span>
                        </div>
                        <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex justify-between text-[9px] text-emerald-400 font-mono">
                          <span>DGMS VT: Form B Valid</span>
                          <span>Medical Form O: FIT</span>
                        </div>
                      </div>
                    ))}

                    {workforceRoster?.crews?.drilling_masters?.map((dr: any) => (
                      <div key={dr.operator_id} className="bg-slate-900 p-2 rounded-lg border border-slate-800/80 text-[10px] font-mono flex justify-between items-center">
                        <div>
                          <span className="font-bold text-white block">{dr.operator_id} ({dr.machine_id})</span>
                          <span className="text-slate-400 text-[9px]">{dr.pattern}</span>
                        </div>
                        <span className="text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800 text-[9px] font-bold">
                          Pattern Drilling
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Hot-Seat Relief Pool */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase font-mono flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Hot-Seat Relief Pool</span>
                    </span>
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono font-bold">
                      {workforceRoster?.crews?.hot_seat_relief_pool?.length || 2} Standby
                    </span>
                  </div>

                  <div className="space-y-2">
                    {workforceRoster?.crews?.hot_seat_relief_pool?.map((rel: any) => (
                      <div key={rel.relief_id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{rel.name} ({rel.relief_id})</span>
                          <span className={`text-[9.5px] font-bold font-mono px-1.5 py-0.2 rounded ${
                            rel.current_state === 'READY_STANDBY' ? 'text-emerald-400 bg-emerald-950 border border-emerald-800' : 'text-slate-400 bg-slate-800'
                          }`}>
                            {rel.current_state}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Duty Remaining: <strong className="text-white">{rel.duty_hours_remaining} hrs</strong>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-0.5 font-mono">
                          Qualified: {rel.qualified_machines?.join(', ')}
                        </div>
                        <button
                          onClick={() => {
                            setActionSuccessMsg(`Dispatched Relief Operator ${rel.relief_id} to relieve fatigued dumper driver!`);
                            setTimeout(() => setActionSuccessMsg(null), 4000);
                          }}
                          className="mt-2 w-full py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-600/50 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1"
                        >
                          <Zap className="w-3 h-3" />
                          <span>Dispatch Hot-Seat Relief</span>
                        </button>
                      </div>
                    ))}

                    <div className="mt-3 p-2 bg-slate-900/60 rounded border border-slate-800 text-[10px] text-slate-400 space-y-1">
                      <div className="flex justify-between">
                        <span>Statutory Blasting Master:</span>
                        <strong className="text-white font-mono">{workforceRoster?.crews?.blasting_team?.certified_blaster || 'DGMS First Class'}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Explosive Handlers:</span>
                        <strong className="text-slate-200">{workforceRoster?.crews?.blasting_team?.explosive_handlers || 4} Certified</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE 6-WHEEL TPMS & SUBSYSTEM DIAGNOSTICS MODAL */}
      {isModalOpen && modalTruck && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-white">{modalTruck.id}</h2>
                    <span className="text-xs text-slate-400 font-mono">({modalTruck.model})</span>
                    {getStatusBadge(modalTruck.status)}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Assigned Shovel: {modalTruck.target_shovel || 'MOIL-EXC-0003'} • Target Geofence: {modalTruck.target_geofence || 'Crusher Hopper'} • Speed: {modalTruck.speed_kmh} km/h
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SECTION 1: 6-WHEEL TPMS & TKPH CHASSIS TELEMETRY */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase font-mono tracking-wider">
                    6-Wheel Chassis TPMS Telemetry &amp; TKPH Thermal Loading
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className={`px-2 py-0.5 rounded font-bold ${
                    modalTruck.telemetry?.thermal_throttling_active 
                      ? 'bg-rose-950 text-rose-300 border border-rose-600 animate-pulse' 
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {modalTruck.telemetry?.thermal_throttling_active ? 'THERMAL THROTTLED (<18 km/h)' : 'TKPH WITHIN SAFE ENVELOPE'}
                  </span>
                  <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300">
                    OEM Max: 420 TKPH
                  </span>
                </div>
              </div>

              {/* 6-Wheel Visual Chassis Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Left Side Wheels (FL & Dual RLO/RLI) */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block text-center md:text-left">
                    Port / Left Wheels
                  </span>
                  {/* Front Left */}
                  {modalTruck.telemetry?.tpms_wheels?.filter(w => w.pos.includes('FL')).map(w => (
                    <div key={w.pos} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span>{w.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded ${w.status === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono mt-1">
                        <span className="text-cyan-300 flex items-center gap-1"><Gauge className="w-3 h-3" /> {w.pressure_psi} PSI</span>
                        <span className="text-amber-300 flex items-center gap-1"><Thermometer className="w-3 h-3" /> {w.temp_c}°C</span>
                      </div>
                    </div>
                  ))}

                  {/* Rear Left Duals */}
                  {modalTruck.telemetry?.tpms_wheels?.filter(w => w.pos.startsWith('RL')).map(w => (
                    <div key={w.pos} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span>{w.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded ${w.status === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono mt-1">
                        <span className="text-cyan-300 flex items-center gap-1"><Gauge className="w-3 h-3" /> {w.pressure_psi} PSI</span>
                        <span className="text-amber-300 flex items-center gap-1"><Thermometer className="w-3 h-3" /> {w.temp_c}°C</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Central Chassis Graphic & Axle TKPH */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-20 h-32 border-2 border-dashed border-cyan-500/40 rounded-xl flex flex-col items-center justify-between p-2 relative bg-cyan-950/20">
                    <span className="text-[8px] font-mono text-cyan-400 font-bold">CAB FRONT</span>
                    <div className="w-12 h-1 bg-cyan-500/50 rounded" />
                    <div className="text-[8px] font-mono text-slate-400">CHASSIS</div>
                    <div className="w-14 h-1 bg-cyan-500/50 rounded" />
                    <span className="text-[8px] font-mono text-cyan-400 font-bold">DUMP TRAY</span>
                  </div>

                  <div className="space-y-1 w-full text-xs font-mono">
                    <div className="flex justify-between bg-slate-900 p-1.5 rounded">
                      <span className="text-slate-400">Front Axle TKPH:</span>
                      <strong className="text-cyan-300">{modalTruck.telemetry?.tkph_front || 280} / 380</strong>
                    </div>
                    <div className="flex justify-between bg-slate-900 p-1.5 rounded">
                      <span className="text-slate-400">Rear Axle TKPH:</span>
                      <strong className={modalTruck.telemetry?.thermal_throttling_active ? 'text-rose-400' : 'text-emerald-300'}>
                        {modalTruck.telemetry?.tkph_rear || 388} / 420
                      </strong>
                    </div>
                    <div className="flex justify-between bg-slate-900 p-1.5 rounded">
                      <span className="text-slate-400">Active Speed Throttling:</span>
                      <strong className="text-amber-300">{modalTruck.telemetry?.speed_throttled_kmh || 18} km/h Cap</strong>
                    </div>
                  </div>
                </div>

                {/* Right Side Wheels (FR & Dual RRO/RRI) */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono block text-center md:text-right">
                    Starboard / Right Wheels
                  </span>
                  {/* Front Right */}
                  {modalTruck.telemetry?.tpms_wheels?.filter(w => w.pos.includes('FR')).map(w => (
                    <div key={w.pos} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span>{w.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded ${w.status === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono mt-1">
                        <span className="text-cyan-300 flex items-center gap-1"><Gauge className="w-3 h-3" /> {w.pressure_psi} PSI</span>
                        <span className="text-amber-300 flex items-center gap-1"><Thermometer className="w-3 h-3" /> {w.temp_c}°C</span>
                      </div>
                    </div>
                  ))}

                  {/* Rear Right Duals */}
                  {modalTruck.telemetry?.tpms_wheels?.filter(w => w.pos.startsWith('RR')).map(w => (
                    <div key={w.pos} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <div className="flex justify-between text-xs font-bold text-white">
                        <span>{w.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded ${w.status === 'CRITICAL' ? 'bg-rose-950 text-rose-400' : 'bg-emerald-950 text-emerald-400'}`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs font-mono mt-1">
                        <span className="text-cyan-300 flex items-center gap-1"><Gauge className="w-3 h-3" /> {w.pressure_psi} PSI</span>
                        <span className="text-amber-300 flex items-center gap-1"><Thermometer className="w-3 h-3" /> {w.temp_c}°C</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* SECTION 2: TIMESTAMPED HAUL CYCLE PHASE BREAKDOWN */}
            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>Timestamped Haul Cycle Phase Breakdown</span>
                </span>
                <div className="text-xs font-mono">
                  <span className="text-slate-400">Total Cycle: </span>
                  <strong className="text-cyan-300">{modalTruck.cycle_phase_times?.total_cycle_time_min || 11.2} min</strong>
                  <span className="text-slate-500"> (Baseline: 6.2 min)</span>
                  <span className={`ml-2 px-2 py-0.2 rounded font-bold ${
                    (modalTruck.cycle_phase_times?.variance_vs_baseline_pct || 0) <= 0 ? 'text-emerald-400 bg-emerald-950' : 'text-rose-400 bg-rose-950'
                  }`}>
                    {(modalTruck.cycle_phase_times?.variance_vs_baseline_pct || 0) > 0 ? '+' : ''}{modalTruck.cycle_phase_times?.variance_vs_baseline_pct || 0}%
                  </span>
                </div>
              </div>

              {/* Progress Bar of Phases */}
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden flex mb-3">
                <div 
                  className="bg-amber-500 h-full" 
                  style={{ width: `${((modalTruck.cycle_phase_times?.queue_time_shovel_min || 1.8) / (modalTruck.cycle_phase_times?.total_cycle_time_min || 11.2)) * 100}%` }}
                  title="Queue at Shovel"
                />
                <div 
                  className="bg-purple-500 h-full" 
                  style={{ width: `${((modalTruck.cycle_phase_times?.spot_load_time_min || 2.4) / (modalTruck.cycle_phase_times?.total_cycle_time_min || 11.2)) * 100}%` }}
                  title="Spot & Load"
                />
                <div 
                  className="bg-emerald-500 h-full" 
                  style={{ width: `${((modalTruck.cycle_phase_times?.haul_travel_time_min || 4.5) / (modalTruck.cycle_phase_times?.total_cycle_time_min || 11.2)) * 100}%` }}
                  title="Haul & Return Travel"
                />
                <div 
                  className="bg-cyan-500 h-full" 
                  style={{ width: `${((modalTruck.cycle_phase_times?.dump_wait_time_min || 1.5) / (modalTruck.cycle_phase_times?.total_cycle_time_min || 11.2)) * 100}%` }}
                  title="Dump & Wait"
                />
              </div>

              {/* Phase Metrics 4-Box Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold mb-1">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Queue at Shovel</span>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {modalTruck.cycle_phase_times?.queue_time_shovel_min || 1.8}m
                  </div>
                  <span className="text-[9px] text-slate-400 block">Detects digger bottlenecks</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1.5 text-purple-400 font-bold mb-1">
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                    <span>Spot &amp; Load Time</span>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {modalTruck.cycle_phase_times?.spot_load_time_min || 2.4}m
                  </div>
                  <span className="text-[9px] text-slate-400 block">Digger operator efficiency</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span>Haul &amp; Return</span>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {modalTruck.cycle_phase_times?.haul_travel_time_min || 4.5}m
                  </div>
                  <span className="text-[9px] text-slate-400 block">Calibrated 6.2m baseline</span>
                </div>

                <div className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span>Dump &amp; Wait</span>
                  </div>
                  <div className="text-base font-extrabold text-white">
                    {modalTruck.cycle_phase_times?.dump_wait_time_min || 1.5}m
                  </div>
                  <span className="text-[9px] text-slate-400 block">Crusher pocket delay tracker</span>
                </div>
              </div>
            </div>

            {/* SECTION 3: PAYLOAD COMPLIANCE, TARE DRIFT & ISO VIBRATION */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Payload & Carryback */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-400" />
                    <span>Payload Compliance &amp; Carryback</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    modalTruck.payload_compliance?.compliance_status === 'OPTIMAL'
                      ? 'bg-emerald-950 text-emerald-400'
                      : modalTruck.payload_compliance?.compliance_status.includes('OVERLOADED')
                        ? 'bg-rose-950 text-rose-400'
                        : 'bg-amber-950 text-amber-400'
                  }`}>
                    {modalTruck.payload_compliance?.compliance_status || 'OPTIMAL'}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between bg-slate-900 p-2 rounded">
                    <span className="text-slate-400">Payload Loaded:</span>
                    <strong className="text-white">{modalTruck.payload_t} T / {modalTruck.capacity_t} T ({modalTruck.payload_compliance?.compliance_pct || 100}%)</strong>
                  </div>
                  <div className="flex justify-between bg-slate-900 p-2 rounded">
                    <span className="text-slate-400">Tare Weight Drift (Carryback):</span>
                    <strong className={modalTruck.payload_compliance?.carryback_alert ? 'text-amber-400' : 'text-slate-200'}>
                      +{modalTruck.payload_compliance?.tare_drift_tons || 1.2} T {modalTruck.payload_compliance?.carryback_alert && '(TRAY WASH DUE)'}
                    </strong>
                  </div>
                  <div className="flex justify-between bg-slate-900 p-2 rounded">
                    <span className="text-slate-400">DGMS Axle Safety Limit:</span>
                    <strong className={modalTruck.payload_compliance?.dgms_overload_violation ? 'text-rose-400' : 'text-emerald-400'}>
                      {modalTruck.payload_compliance?.dgms_overload_violation ? 'VIOLATION (>110% OEM)' : 'PASSED (Within 110% OEM)'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Dynamic Fuel Burn & ISO Vibration */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-xs font-bold text-white uppercase font-mono flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <span>Dynamic Fuel Burn &amp; Vibration (ISO)</span>
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    modalTruck.telemetry?.vibration_status === 'NORMAL'
                      ? 'bg-emerald-950 text-emerald-400'
                      : modalTruck.telemetry?.vibration_status === 'ALERT'
                        ? 'bg-amber-950 text-amber-400'
                        : 'bg-rose-950 text-rose-400'
                  }`}>
                    ISO: {modalTruck.telemetry?.vibration_status || 'NORMAL'}
                  </span>
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between bg-slate-900 p-2 rounded">
                    <span className="text-slate-400">Dynamic Fuel Burn:</span>
                    <strong className="text-amber-300">{modalTruck.telemetry?.fuel_burn_rate_lph.toFixed(1)} L/h</strong>
                  </div>
                  <div className="flex justify-between bg-slate-900 p-2 rounded">
                    <span className="text-slate-400">Correlated Cycle State:</span>
                    <strong className="text-white">{modalTruck.telemetry?.fuel_cycle_state || 'Nominal Haul'}</strong>
                  </div>
                  <div className="flex justify-between bg-slate-900 p-2 rounded">
                    <span className="text-slate-400">Vibration Severity (ISO 10816):</span>
                    <strong className="text-cyan-300">{modalTruck.telemetry?.vibration_rms_mms || 2.4} mm/s RMS</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Close Diagnostics
              </button>
              <button
                onClick={() => {
                  setActionSuccessMsg(`Calibration updated for ${modalTruck.id}. Thermal throttle reset dispatched.`);
                  setIsModalOpen(false);
                  setTimeout(() => setActionSuccessMsg(null), 4000);
                }}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-cyan-900/30"
              >
                Acknowledge &amp; Dispatch Fleet Telemetry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Telemetry Module from main page */}
      <LegacyFleetTelemetry zone={zone} />
    </div>
  );
}
