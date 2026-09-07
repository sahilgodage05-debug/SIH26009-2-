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
  Info
} from 'lucide-react';
import { LegacyFleetTelemetry } from '@/components/LegacyFleetTelemetry';

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
    tkph: number;
    tkph_rating_max: number;
    tire_temp_c: number;
    strut_pressure_front_psi: number;
    strut_pressure_rear_psi: number;
    driver_fatigue_index: number;
    has_fuel_sensor?: number;
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
  const [geotechData, setGeotechData] = useState<any>(null);
  const [workforceRoster, setWorkforceRoster] = useState<any>(null);
  const [lpSolution, setLpSolution] = useState<any>(null);
  
  const [selectedTruck, setSelectedTruck] = useState<TruckData | null>(null);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'map' | 'shortfall' | 'telemetry' | 'reliability' | 'geotech' | 'workforce'>('map');
  const [recoveredTonnage, setRecoveredTonnage] = useState<number>(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch all fleet & production analytics
  const fetchAllData = async () => {
    try {
      const [fleetRes, mfRes, sfRes, caRes, hemmRes, geoRes, wfRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/fleet/status/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/fleet/match-factor/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/production/shortfall/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/production/corrective-actions/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/production/hemm-reliability/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/production/geotechnical-overlay/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/fleet/workers-roster/${currentMineId}`)
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
      if (geoRes.ok) setGeotechData(await geoRes.json());
      if (wfRes.ok) setWorkforceRoster(await wfRes.json());
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
        const res = await fetch(`http://localhost:8000/api/v1/production/solve-lp-reallocation/${currentMineId}`);
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
                Total Workforce: {fleetState?.workers_count_str || '800 - 1,000'}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Cumulative Production Variance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hourly Yield Variance</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {shortfall ? Math.round(shortfall.current_actual_tons + recoveredTonnage) : 1380}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ {shortfall?.target_shift_tons || 2400} Tons</span>
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-xs font-bold text-amber-400 font-mono">
                -{(shortfall?.projected_shortfall_tons - recoveredTonnage) > 0 ? (shortfall?.projected_shortfall_tons - recoveredTonnage) : 0} T Deficit
              </span>
              <span className="text-[10px] text-slate-500">(Shift 1 Target)</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
            <div 
              className="bg-amber-400 h-full rounded-full transition-all duration-700" 
              style={{ width: `${Math.min(100, ((shortfall?.current_actual_tons || 1380) + recoveredTonnage) / (shortfall?.target_shift_tons || 2400) * 100)}%` }}
            />
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

        {/* Card 3: Active Fleet & TKPH Telemetry */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Fleet &amp; TKPH Heat</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{trucks.length}</span>
            <span className="text-xs text-slate-400">Haul Trucks (CSV Ingested)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Avg Fleet TKPH:</span>
            <span className="font-mono font-bold text-emerald-400">142.5 / 420 Max</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-400">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              Avg Burn: 54.2 L/h
            </span>
            <span className="text-emerald-400 font-bold">Loaded Right-of-Way Active</span>
          </div>
        </div>

        {/* Card 4: HEMM Overall Availability */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">HEMM Availability &amp; MTBF</span>
            <Wrench className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">{hemmData?.overall_fleet_availability_pct || 92.1}%</span>
            <span className="text-xs text-slate-400">Uptime</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-400">Unplanned Shift Downtime:</span>
            <span className="font-mono font-bold text-slate-300">{hemmData?.unplanned_downtime_hours_shift || 1.4} h</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>98.4% PM Compliance</span>
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
          onClick={() => setActiveTab('reliability')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'reliability'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>4. HEMM Reliability &amp; MTBF</span>
        </button>

        <button
          onClick={() => setActiveTab('geotech')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'geotech'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          }`}
        >
          <Satellite className="w-4 h-4" />
          <span>5. Space-Tech &amp; Geotechnical InSAR</span>
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
          <span>6. Workforce &amp; Hot-Seat Roster</span>
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
                  const posX = startPos.x + (endPos.x - startPos.x) * p + Math.sin(p * Math.PI * 2) * 2.5;
                  const posY = startPos.y + (endPos.y - startPos.y) * p + Math.cos(p * Math.PI * 2) * 2.5;

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
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Strut Payload</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">{selectedTruck.payload_t}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/ {selectedTruck.capacity_t} T</span>
                      </div>
                      <div className="w-full bg-slate-700 h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full rounded-full" 
                          style={{ width: `${(selectedTruck.payload_t / selectedTruck.capacity_t) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Tire TKPH</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-black text-amber-400">{selectedTruck.telemetry?.tkph || 142}</span>
                        <span className="text-[10px] text-slate-400 font-mono">/ 420 Max</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 font-medium">Safe Thermal Zone</span>
                    </div>
                  </div>

                  {/* Engine & Chassis Telemetry */}
                  <div className="space-y-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400"><Thermometer className="w-3.5 h-3.5 text-rose-400" /> Coolant Temp</span>
                      <span className="font-bold">{selectedTruck.telemetry?.coolant_temp_c.toFixed(1) || 88.2}°C</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400"><Fuel className="w-3.5 h-3.5 text-amber-400" /> Fuel Burn Rate</span>
                      <span className="font-bold">{selectedTruck.telemetry?.fuel_burn_rate_lph.toFixed(1) || 58.0} L/h</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400"><Zap className="w-3.5 h-3.5 text-cyan-400" /> Engine RPM</span>
                      <span className="font-bold">{selectedTruck.telemetry?.engine_rpm || 1780} RPM</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-400"><Scale className="w-3.5 h-3.5 text-purple-400" /> Rear Strut Pressure</span>
                      <span className="font-bold">{selectedTruck.telemetry?.strut_pressure_rear_psi.toFixed(0) || 310} PSI</span>
                    </div>
                  </div>

                  {/* Dynamic Reroute Dispatch Buttons */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Dynamic In-Pit Dispatch Reroute</span>
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
                    <span className="w-12 text-slate-400">{hr.hour}</span>
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
          </div>

          {/* Right Col: 1-Click Engineering Corrective Actions */}
          <div className="space-y-4">
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Full Truck Fleet Telemetry &amp; Component Health Matrix (CSV Dumpers)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3">Truck ID</th>
                  <th className="p-3">Model</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Payload (T)</th>
                  <th className="p-3">Speed (km/h)</th>
                  <th className="p-3">Coolant Temp</th>
                  <th className="p-3">Fuel Burn (L/h)</th>
                  <th className="p-3">Tire TKPH</th>
                  <th className="p-3">Intersection Rule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trucks.map((truck) => (
                  <tr key={truck.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-bold text-white flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-cyan-400" />
                      {truck.id}
                    </td>
                    <td className="p-3 text-slate-300">{truck.model}</td>
                    <td className="p-3">{getStatusBadge(truck.status)}</td>
                    <td className="p-3 font-bold text-white">{truck.payload_t} / {truck.capacity_t}</td>
                    <td className="p-3 text-slate-300">{truck.speed_kmh.toFixed(1)}</td>
                    <td className="p-3 text-slate-300">{truck.telemetry?.coolant_temp_c.toFixed(1)}°C</td>
                    <td className="p-3 text-amber-300">{truck.telemetry?.fuel_burn_rate_lph.toFixed(1)}</td>
                    <td className="p-3 font-bold text-emerald-400">{truck.telemetry?.tkph || 142}</td>
                    <td className="p-3">
                      <span className="text-[10px] font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-600/50">
                        {truck.intersection_status || 'CLEAR_HAUL_RAMP'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HEMM RELIABILITY & MTBF */}
      {activeTab === 'reliability' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {hemmData?.hemm_units?.map((unit: HemmUnit) => (
              <div key={unit.unit_id} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="text-sm font-black text-white">{unit.unit_id}</span>
                    <span className="bg-purple-950 text-purple-300 border border-purple-600/60 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {unit.availability_pct}% Avail
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-300">{unit.type}</h4>
                  
                  <div className="mt-4 space-y-2 text-xs font-mono text-slate-400">
                    <div className="flex justify-between">
                      <span>MTBF (Reliability):</span>
                      <span className="font-bold text-white">{unit.mtbf_hours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MTTR (Repair Time):</span>
                      <span className="font-bold text-slate-300">{unit.mttr_hours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operating Hours:</span>
                      <span className="font-bold text-slate-300">{unit.operating_hours} h</span>
                    </div>
                    <div className="flex justify-between">
                      <span>48h Deficit Risk:</span>
                      <span className="font-bold text-rose-400">{unit.failure_risk_48h_pct}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">CSV Maintenance Log</span>
                  <span className="text-[11px] font-bold text-amber-300">{unit.critical_subsystem}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: SPACE-TECH & GEOTECHNICAL INSAR */}
      {activeTab === 'geotech' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* InSAR Slope Displacement */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Satellite className="w-4 h-4 text-cyan-400" />
                <span>Sentinel-1 InSAR Slope Stability &amp; Subsidence</span>
              </h3>
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-600/50">
                FoS: {geotechData?.insar_monitoring?.slope_safety_factor_fos || 1.31}
              </span>
            </div>

            <div className="space-y-3">
              {geotechData?.insar_monitoring?.bench_displacement_zones?.map((zone: any, idx: number) => (
                <div key={idx} className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{zone.bench_id}</span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      zone.risk_level === 'ELEVATED' 
                        ? 'bg-rose-950 text-rose-300 border border-rose-600/50' 
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-600/50'
                    }`}>
                      {zone.displacement_rate_mm_yr} mm/yr
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">{zone.action_taken}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sump Dewatering & Weather Radar */}
          <div className="space-y-6">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span>Pit Catchment Sump Dewatering Telemetry</span>
              </h3>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Sump Level</span>
                  <div className="mt-1 text-lg font-black text-blue-400">
                    {geotechData?.pit_hydrology_sump?.sump_water_level_m || 2.8} m
                  </div>
                  <span className="text-[10px] text-slate-500">Critical: {geotechData?.pit_hydrology_sump?.sump_critical_flood_level_m || 4.5} m</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Flood Buffer</span>
                  <div className="mt-1 text-lg font-black text-amber-400">
                    {geotechData?.pit_hydrology_sump?.flood_risk_hours_to_excavator_submerge || 9.2} Hours
                  </div>
                  <span className="text-[10px] text-slate-500">To excavator submerge</span>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono">
                {geotechData?.pit_hydrology_sump?.active_dewatering_pumps?.map((p: any) => (
                  <div key={p.pump_id} className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-slate-800/80">
                    <span className="text-slate-300 font-bold">{p.pump_id} ({p.type})</span>
                    <span className="text-emerald-400 font-bold">{p.discharge_rate_lps} L/s ({p.status})</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                SAR Radar Moisture &amp; Ramp Slipperiness
              </span>
              <p className="text-[11px] text-slate-300 mt-1">
                Surface Moisture Index: <span className="font-bold text-white">{geotechData?.weather_sar_radar?.sar_surface_moisture_index || 0.69}</span> • Traction Penalty: <span className="font-bold text-amber-400">+{geotechData?.weather_sar_radar?.cycle_time_penalty_pct || 22.5}% Cycle Time</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: MINE WORKFORCE ROSTER */}
      {activeTab === 'workforce' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-400" />
                  <span>Mine Operational Workforce &amp; Hot-Seat Shift Crew</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Direct CSV Workforce Ingestion: {fleetState?.csv_mine_location} ({fleetState?.workers_count_str} Total Personnel)
                </p>
              </div>
              <span className="bg-rose-950 text-rose-300 border border-rose-600/50 text-xs font-mono font-bold px-3 py-1 rounded-lg">
                Active On Bench: {workforceRoster?.active_shift_headcount || 142} Workers
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Haulage Drivers */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs font-bold text-cyan-400 uppercase font-mono block mb-2">Haul Truck Operators</span>
                <div className="space-y-2 text-xs font-mono">
                  {workforceRoster?.crews?.haulage_drivers?.map((d: any) => (
                    <div key={d.operator_id} className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-300">{d.operator_id} ({d.assigned_truck})</span>
                      <span className="text-slate-500">Relief {d.relief_due}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shovel & Drill Operators */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs font-bold text-purple-400 uppercase font-mono block mb-2">Shovel &amp; Drill Masters</span>
                <div className="space-y-2 text-xs font-mono">
                  {workforceRoster?.crews?.shovel_operators?.map((s: any) => (
                    <div key={s.operator_id} className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-300">{s.operator_id} ({s.assigned_machine})</span>
                      <span className="text-emerald-400">Active</span>
                    </div>
                  ))}
                  {workforceRoster?.crews?.drilling_masters?.map((dr: any) => (
                    <div key={dr.operator_id} className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-300">{dr.operator_id} ({dr.machine_id})</span>
                      <span className="text-cyan-400">Pattern Drill</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hot-Seat Relief Pool */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
                <span className="text-xs font-bold text-amber-400 uppercase font-mono block mb-2">Hot-Seat Relief Pool</span>
                <div className="space-y-2 text-xs font-mono">
                  {workforceRoster?.crews?.hot_seat_relief_pool?.map((rel: any) => (
                    <div key={rel.relief_id} className="bg-slate-900 p-2 rounded border border-slate-800">
                      <div className="flex justify-between text-white font-bold">
                        <span>{rel.relief_id}</span>
                        <span className="text-emerald-400">{rel.current_state}</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{rel.qualified_machines?.join(', ')}</p>
                    </div>
                  ))}
                  <div className="pt-2 text-[11px] text-slate-400">
                    <span className="font-bold text-white">Blasting:</span> {workforceRoster?.crews?.blasting_team?.certified_blaster || 'DGMS First Class Blaster'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legacy Telemetry Module from main page */}
      <LegacyFleetTelemetry zone={zone} />
    </div>
  );
}
