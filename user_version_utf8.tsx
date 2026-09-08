'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Truck, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown, 
  Gauge, 
  Compass, 
  MapPin, 
  Radio, 
  Cpu, 
  Zap, 
  ShieldAlert, 
  Clock, 
  RotateCcw, 
  Play, 
  Pause, 
  Navigation, 
  Layers, 
  Fuel, 
  Thermometer, 
  Scale, 
  Wrench, 
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Check,
  ChevronRight
} from 'lucide-react';
import { LegacyFleetTelemetry } from '@/components/LegacyFleetTelemetry';

interface TruckData {
  id: string;
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
  };
  cycle_stats: {
    completed_trips_shift: number;
    avg_cycle_time_min: number;
    tonnes_hauled_shift: number;
  };
}

interface ShovelData {
  id: string;
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
  const [selectedTruck, setSelectedTruck] = useState<TruckData | null>(null);
  const [appliedActions, setAppliedActions] = useState<Set<string>>(new Set());
  const [isLivePolling, setIsLivePolling] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'map' | 'shortfall' | 'telemetry' | 'reliability'>('map');
  const [recoveredTonnage, setRecoveredTonnage] = useState<number>(0);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Fetch all fleet & production analytics
  const fetchAllData = async () => {
    try {
      const [fleetRes, mfRes, sfRes, caRes, hemmRes] = await Promise.all([
        fetch(`http://localhost:8000/api/v1/fleet/status/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/fleet/match-factor/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/production/shortfall/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/production/corrective-actions/${currentMineId}`),
        fetch(`http://localhost:8000/api/v1/production/hemm-reliability/${currentMineId}`)
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
    } catch (err) {
      console.error('Error polling fleet telemetry:', err);
    }
  };

  // Polling loop (2.5 seconds for live real-time simulation)
  useEffect(() => {
    fetchAllData();
    if (!isLivePolling) return;
    const interval = setInterval(() => {
      fetchAllData();
    }, 2500);
    return () => clearInterval(interval);
  }, [currentMineId, isLivePolling]);

  // Execute Corrective Action
  const handleApplyAction = async (action: CorrectiveAction) => {
    setAppliedActions(prev => new Set(prev).add(action.action_id));
    setRecoveredTonnage(prev => prev + action.tonnage_recovery_tons);
    setActionSuccessMsg(`Deployed: ${action.title} (+${action.tonnage_recovery_tons} Tons Projected Recovery)`);

    // Dynamic Reroute if it's a redeployment
    if (action.action_id === 'ACT-DISPATCH-REDEPLOY') {
      try {
        await fetch(`http://localhost:8000/api/v1/fleet/reroute/${currentMineId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            truck_id: 'HT-104',
            target_destination: 'GF-SHOVEL-A'
          })
        });
      } catch (e) {
        console.error('Failed to trigger backend reroute:', e);
      }
    }

    setTimeout(() => {
      setActionSuccessMsg(null);
    }, 4500);
  };

  const trucks: TruckData[] = fleetState?.trucks || [];
  const shovels: ShovelData[] = fleetState?.shovels || [];
  const geofences: GeofenceData[] = fleetState?.geofences || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'LOADED_HAUL':
        return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-bold">Loaded Haul (Uphill)</span>;
      case 'EMPTY_RETURN':
        return <span className="bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 px-2 py-0.5 rounded text-[10px] font-bold">Empty Return</span>;
      case 'LOADING':
        return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-bold animate-pulse">Loading at Face</span>;
      case 'DUMPING':
        return <span className="bg-purple-500/20 text-purple-400 border border-purple-500/40 px-2 py-0.5 rounded text-[10px] font-bold">Dumping Crusher</span>;
      case 'QUEUED_SHOVEL':
        return <span className="bg-rose-500/20 text-rose-400 border border-rose-500/40 px-2 py-0.5 rounded text-[10px] font-bold">Queued at Shovel</span>;
      default:
        return <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-800 backdrop-blur-xl">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1.5">
            <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
            <span>Real-Time GPS Fleet Management &amp; Production Shortfall Command Center</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{mineName} Operations</h1>
            <span className="bg-slate-100/90 text-slate-600 border border-slate-300 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              {fleetState ? `${fleetState.base_lat.toFixed(4)}┬░N, ${fleetState.base_lng.toFixed(4)}┬░E` : '21.5420┬░N, 79.6780┬░E'}
            </span>
            <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Shift 1 ΓÇó Live Telemetry Stream
            </span>
          </div>
        </div>

        {/* Action Bar & Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {actionSuccessMsg && (
            <div className="bg-emerald-950/90 text-emerald-200 border border-emerald-500/80 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-950/50 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
          )}

          <button
            onClick={() => setIsLivePolling(!isLivePolling)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              isLivePolling 
                ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/40 hover:bg-cyan-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
            }`}
          >
            {isLivePolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isLivePolling ? 'Telemetry Live' : 'Paused'}</span>
          </button>

          <button
            onClick={() => fetchAllData()}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-300 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Top 4 Real-Time Operational KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Shift Production vs Shortfall */}
        <div className="bg-white/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Shift Target vs Yield</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{shortfall?.current_actual_tons || 1040}</span>
            <span className="text-xs text-slate-500 font-mono">/ {shortfall?.target_shift_tons || 2400} Tons</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5" />
              -{(shortfall?.projected_shortfall_tons - recoveredTonnage) > 0 ? (shortfall?.projected_shortfall_tons - recoveredTonnage) : 0} T Projected Gap
            </span>
            {recoveredTonnage > 0 && (
              <span className="text-emerald-400 font-bold">+{recoveredTonnage} T Recovered</span>
            )}
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (((shortfall?.current_actual_tons || 1040) + recoveredTonnage) / (shortfall?.target_shift_tons || 2400)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 2: Shovel-Truck Match Factor */}
        <div className="bg-white/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Phelps-Morgan Match Factor</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${
              (matchFactor?.match_factor || 0.65) < 0.85 
                ? 'text-amber-400' 
                : (matchFactor?.match_factor || 0.65) > 1.15 
                  ? 'text-rose-400' 
                  : 'text-emerald-400'
            }`}>
              {matchFactor?.match_factor || 0.648}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              {matchFactor?.status || 'UNDER_TRUCKED'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 line-clamp-1">
            {matchFactor?.recommendation || 'Shovels starving: Deploy 2 auxiliary haulers.'}
          </p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Shovel: {matchFactor?.shovel_utilization_pct || 60}%</span>
            <span>Truck: {matchFactor?.truck_utilization_pct || 98}%</span>
          </div>
        </div>

        {/* Card 3: Active Fleet & TKPH Telemetry */}
        <div className="bg-white/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Fleet &amp; TKPH Heat</span>
            <Truck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{trucks.length}</span>
            <span className="text-xs text-slate-500">Haul Trucks (100% In Service)</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Avg Fleet TKPH:</span>
            <span className="font-mono font-bold text-emerald-400">135.4 / 420 Max</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 text-slate-500">
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
              Avg Burn: 52.4 L/h
            </span>
            <span className="text-emerald-400 font-bold">0 Gridlocks</span>
          </div>
        </div>

        {/* Card 4: HEMM Overall Availability */}
        <div className="bg-white/80 border border-slate-200 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">HEMM Availability &amp; MTBF</span>
            <Wrench className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-400">{hemmData?.overall_fleet_availability_pct || 92.1}%</span>
            <span className="text-xs text-slate-500">Equipment Uptime</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">Mean Time To Repair:</span>
            <span className="font-mono font-bold text-slate-600">3.8 Hours</span>
          </div>
          <div className="mt-1 text-[11px] text-emerald-400 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>98.4% Preventive Maintenance Compliance</span>
          </div>
        </div>
      </div>

      {/* Main Command Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'map'
              ? 'bg-cyan-600 text-slate-900 shadow-lg shadow-cyan-900/40'
              : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Navigation className="w-4 h-4" />
          <span>Digital Twin Haulage &amp; Intersection Map</span>
        </button>

        <button
          onClick={() => setActiveTab('shortfall')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'shortfall'
              ? 'bg-amber-600 text-slate-900 shadow-lg shadow-amber-900/40'
              : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          <span>Production Shortfall &amp; Corrective Actions</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'telemetry'
              ? 'bg-emerald-600 text-slate-900 shadow-lg shadow-emerald-900/40'
              : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Truck Telemetry &amp; TKPH HUD</span>
        </button>

        <button
          onClick={() => setActiveTab('reliability')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            activeTab === 'reliability'
              ? 'bg-purple-600 text-slate-900 shadow-lg shadow-purple-900/40'
              : 'bg-white text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>HEMM Reliability &amp; MTBF</span>
        </button>
      </div>

      {/* Tab 1: Digital Twin Haulage & Intersection Map */}
      {activeTab === 'map' && (() => {
        const baseLat = fleetState?.base_lat || 21.5420;
        const baseLng = fleetState?.base_lng || 79.6780;

        // GPS to Map Percentage Converter
        const projectGPSToMap = (lat: number, lng: number) => {
          const dLat = (lat - baseLat) * 111000; // in meters north/south
          const dLng = (lng - baseLng) * 103248; // in meters east/west
          const mapScale = 680; // ┬▒680m coverage
          const xPct = 50 + (dLng / mapScale) * 40;
          const yPct = 50 - (dLat / mapScale) * 40; // Invert Y (North is top)
          return {
            x: Math.max(8, Math.min(92, xPct)),
            y: Math.max(8, Math.min(92, yPct))
          };
        };

        const gfA = geofences.find(g => g.id === 'GF-SHOVEL-A') || { lat: baseLat - 0.0035, lng: baseLng - 0.0025, name: 'Shovel Alpha' };
        const gfB = geofences.find(g => g.id === 'GF-SHOVEL-B') || { lat: baseLat - 0.0020, lng: baseLng + 0.0030, name: 'Shovel Bravo' };
        const gfInt = geofences.find(g => g.id === 'GF-RAMP-INTERSECT') || { lat: baseLat, lng: baseLng, name: 'Main Ramp Switchback' };
        const gfCrusher = geofences.find(g => g.id === 'GF-CRUSHER-1') || { lat: baseLat + 0.0040, lng: baseLng - 0.0020, name: 'Primary Crusher Plant' };
        const gfDump = geofences.find(g => g.id === 'GF-WASTE-DUMP') || { lat: baseLat + 0.0045, lng: baseLng + 0.0035, name: 'Waste Dump Yard' };

        const posA = projectGPSToMap(gfA.lat, gfA.lng);
        const posB = projectGPSToMap(gfB.lat, gfB.lng);
        const posInt = projectGPSToMap(gfInt.lat, gfInt.lng);
        const posCrusher = projectGPSToMap(gfCrusher.lat, gfCrusher.lng);
        const posDump = projectGPSToMap(gfDump.lat, gfDump.lng);

        // SVG Polygon points for pit boundary
        const polygonPoints = (fleetState?.pit_polygon_coords || []).map((pt: [number, number]) => {
          const p = projectGPSToMap(pt[0], pt[1]);
          return `${p.x}%,${p.y}%`;
        }).join(' ');

        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Interactive Vector Haul Road Map */}
            <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col relative overflow-hidden min-h-[520px]">
              {/* Map Controls Header */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-200/80 pb-3 mb-3 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {fleetState?.mine_name || mineName} ΓÇó {fleetState?.pit_type || 'Opencast Pit'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-cyan-300">
                    Strike: {fleetState?.strike || 'N65┬░E'} (Dip {fleetState?.dip || '55┬░'})
                  </span>
                  <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-amber-300">
                    Pit Depth: {fleetState?.pit_depth_m || 85}m
                  </span>
                </div>
              </div>

              {/* Simulated 2D Vector Canvas of Mine Haul Roads & Real Trucks */}
              <div className="flex-1 w-full relative bg-gradient-to-b from-[#070d1e] via-slate-50 to-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-center min-h-[420px] overflow-hidden">
                
                {/* SVG Pit Polygon & Haul Road Vectors */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <defs>
                    <linearGradient id="pitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" stopOpacity="0.08" />
                      <stop offset="100%" stopColor="#d946ef" stopOpacity="0.04" />
                    </linearGradient>
                  </defs>

                  {/* Mine-Specific Geotechnical Open-Pit Boundary Polygon */}
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

                  {/* Concentric Pit Bench Step Contours */}
                  <circle cx="50%" cy="50%" r="28%" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
                  <circle cx="50%" cy="50%" r="42%" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="5,5" />

                  {/* Dynamic Haul Road Connecting Paths (Projected from actual GPS positions) */}
                  {/* Shovel A to Ramp Intersection */}
                  <line 
                    x1={`${posA.x}%`} y1={`${posA.y}%`} 
                    x2={`${posInt.x}%`} y2={`${posInt.y}%`} 
                    stroke="#10b981" strokeWidth="4" strokeDasharray="6,6" opacity="0.6" 
                  />
                  {/* Shovel B to Ramp Intersection */}
                  <line 
                    x1={`${posB.x}%`} y1={`${posB.y}%`} 
                    x2={`${posInt.x}%`} y2={`${posInt.y}%`} 
                    stroke="#06b6d4" strokeWidth="4" strokeDasharray="6,6" opacity="0.6" 
                  />
                  {/* Ramp Intersection to Primary Crusher */}
                  <line 
                    x1={`${posInt.x}%`} y1={`${posInt.y}%`} 
                    x2={`${posCrusher.x}%`} y2={`${posCrusher.y}%`} 
                    stroke="#10b981" strokeWidth="5" opacity="0.7" 
                  />
                  {/* Ramp Intersection to Waste Dump */}
                  <line 
                    x1={`${posInt.x}%`} y1={`${posInt.y}%`} 
                    x2={`${posDump.x}%`} y2={`${posDump.y}%`} 
                    stroke="#64748b" strokeWidth="3" opacity="0.6" 
                  />
                </svg>

                {/* Central Switchback Intersection Node-3 (Right of Way Enforced) */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-dashed border-amber-500/50 bg-amber-500/10 flex flex-col items-center justify-center p-1 text-center pointer-events-none z-10"
                  style={{ left: `${posInt.x}%`, top: `${posInt.y}%` }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse mb-0.5" />
                  <span className="text-[8px] font-bold text-amber-300 font-mono">NODE-3 SWITCHBACK</span>
                  <span className="text-[6.5px] text-amber-400/90 font-mono">Loaded Right-of-Way</span>
                </div>

                {/* Waypoint 1: Shovel Pocket Alpha (Mine-Specific Bench) */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 border border-purple-500/70 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posA.x}%`, top: `${posA.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-purple-400" />
                    <span className="text-[9px] font-bold text-purple-300">{shovels[0]?.id || 'EX-01'}</span>
                  </div>
                  <span className="text-[8px] text-slate-600 line-clamp-1">{shovels[0]?.location_name || 'High Grade Face'}</span>
                  <span className="text-[7.5px] bg-purple-950 text-purple-300 px-1 py-0.2 rounded font-mono font-bold">
                    Queue: {shovels[0]?.queue_count || 1} Trucks
                  </span>
                </div>

                {/* Waypoint 2: Shovel Pocket Bravo (Mine-Specific Bench) */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 border border-cyan-500/70 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posB.x}%`, top: `${posB.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                    <span className="text-[9px] font-bold text-cyan-300">{shovels[1]?.id || 'EX-02'}</span>
                  </div>
                  <span className="text-[8px] text-slate-600 line-clamp-1">{shovels[1]?.location_name || 'Medium Grade Face'}</span>
                  <span className="text-[7.5px] bg-cyan-950 text-cyan-300 px-1 py-0.2 rounded font-mono font-bold">
                    Queue: {shovels[1]?.queue_count || 0} Trucks
                  </span>
                </div>

                {/* Waypoint 3: Primary Gyratory Crusher Plant */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 border border-emerald-500/70 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posCrusher.x}%`, top: `${posCrusher.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-[9px] font-bold text-emerald-300">ROM Crusher Plant</span>
                  </div>
                  <span className="text-[7.5px] bg-emerald-950 text-emerald-300 px-1 py-0.2 rounded font-mono font-bold">
                    Cap: 1200 tph
                  </span>
                </div>

                {/* Waypoint 4: Overburden Waste Dump Yard */}
                <div 
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 bg-white/95 border border-slate-300 rounded-xl p-2 shadow-xl flex flex-col items-start gap-0.5 z-10 hover:scale-105 transition-transform"
                  style={{ left: `${posDump.x}%`, top: `${posDump.y}%` }}
                >
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-[9px] font-bold text-slate-600">Waste Overburden Dump</span>
                  </div>
                  <span className="text-[7.5px] text-slate-500 font-mono">Tip Heads Active</span>
                </div>

                {/* Live Moving Haul Truck Pins (Projected from actual route waypoints) */}
                {trucks.map((truck, idx) => {
                  let startPos = posA;
                  let endPos = posCrusher;

                  if (truck.route === 'A_TO_CRUSHER') {
                    startPos = posA;
                    endPos = posCrusher;
                  } else if (truck.route === 'CRUSHER_TO_A') {
                    startPos = posCrusher;
                    endPos = posA;
                  } else if (truck.route === 'B_TO_CRUSHER') {
                    startPos = posB;
                    endPos = posCrusher;
                  } else if (truck.route === 'CRUSHER_TO_B') {
                    startPos = posCrusher;
                    endPos = posB;
                  } else if (truck.route === 'A_TO_WASTE') {
                    startPos = posA;
                    endPos = posDump;
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
                      <div className={`flex flex-col items-center ${
                        isSelected ? 'animate-bounce' : ''
                      }`}>
                        <div className={`p-1.5 rounded-full border shadow-xl ${
                          truck.status === 'LOADED_HAUL'
                            ? 'bg-emerald-500 text-black border-emerald-300'
                            : truck.status === 'EMPTY_RETURN'
                              ? 'bg-cyan-500 text-black border-cyan-300'
                              : truck.status === 'LOADING'
                                ? 'bg-amber-500 text-black border-amber-300 animate-pulse'
                                : 'bg-purple-500 text-slate-900 border-purple-300'
                        }`}>
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <span className={`text-[8px] font-mono font-black px-1 rounded shadow-md mt-0.5 whitespace-nowrap ${
                          isSelected ? 'bg-amber-400 text-black' : 'bg-white/90 text-slate-700 border border-slate-300'
                        }`}>
                          {truck.id} ΓÇó {truck.speed_kmh.toFixed(0)} km/h
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Col: Selected Truck Telemetry HUD */}
            <div className="bg-white/90 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between">
              {selectedTruck ? (
                <div className="space-y-4">
                  {/* Truck Header */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-lg font-black text-slate-900">{selectedTruck.id}</h3>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">{selectedTruck.model}</span>
                    </div>
                    {getStatusBadge(selectedTruck.status)}
                  </div>

                  {/* Live Gauges */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-100/80 border border-slate-300/60 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Payload</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-black text-slate-900">{selectedTruck.payload_t}</span>
                        <span className="text-[10px] text-slate-500 font-mono">/ {selectedTruck.capacity_t} T</span>
                      </div>
                      <div className="w-full bg-slate-200 h-1 rounded-full mt-2 overflow-hidden">
                        <div 
                          className="bg-emerald-400 h-full rounded-full" 
                          style={{ width: `${(selectedTruck.payload_t / selectedTruck.capacity_t) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-slate-100/80 border border-slate-300/60 rounded-xl p-3">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Tire TKPH</span>
                      <div className="mt-1 flex items-baseline gap-1">
                        <span className="text-xl font-black text-amber-400">{selectedTruck.telemetry?.tkph || 135}</span>
                        <span className="text-[10px] text-slate-500 font-mono">/ 420 Max</span>
                      </div>
                      <span className="text-[9px] text-emerald-400 font-medium">Safe Thermal Zone</span>
                    </div>
                  </div>

                  {/* Engine & Chassis Telemetry */}
                  <div className="space-y-2 bg-slate-100/60 border border-slate-200/80 rounded-xl p-3 text-xs font-mono">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500"><Thermometer className="w-3.5 h-3.5 text-rose-400" /> Coolant Temp</span>
                      <span className="font-bold">{selectedTruck.telemetry?.coolant_temp_c.toFixed(1) || 88.2}┬░C</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500"><Fuel className="w-3.5 h-3.5 text-amber-400" /> Fuel Burn Rate</span>
                      <span className="font-bold">{selectedTruck.telemetry?.fuel_burn_rate_lph.toFixed(1) || 58.0} L/h</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500"><Zap className="w-3.5 h-3.5 text-cyan-400" /> Engine RPM</span>
                      <span className="font-bold">{selectedTruck.telemetry?.engine_rpm || 1780} RPM</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1.5 text-slate-500"><Scale className="w-3.5 h-3.5 text-purple-400" /> Strut Pressure</span>
                      <span className="font-bold">{selectedTruck.telemetry?.strut_pressure_rear_psi.toFixed(0) || 310} PSI</span>
                    </div>
                  </div>

                  {/* Dynamic Reroute Dispatch Buttons */}
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Dynamic In-Pit Dispatch Reroute</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleApplyAction({
                          action_id: 'REROUTE_SHOVEL_A',
                          priority: 'HIGH',
                          title: `Reroute ${selectedTruck.id} to Bench 4`,
                          category: 'DISPATCH',
                          description: 'Dynamic dispatch',
                          tonnage_recovery_tons: 45,
                          recovery_time_min: 10,
                          cost_impact: 'LOW',
                          status: 'ACTIVE'
                        })}
                        className="px-2.5 py-2 bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 border border-purple-600/70 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Bench 4 High-Grade</span>
                      </button>
                      <button
                        onClick={() => handleApplyAction({
                          action_id: 'REROUTE_CRUSHER',
                          priority: 'HIGH',
                          title: `Reroute ${selectedTruck.id} to Crusher #1`,
                          category: 'DISPATCH',
                          description: 'Dynamic dispatch',
                          tonnage_recovery_tons: 45,
                          recovery_time_min: 10,
                          cost_impact: 'LOW',
                          status: 'ACTIVE'
                        })}
                        className="px-2.5 py-2 bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-200 border border-emerald-600/70 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>Primary Crusher Plant</span>
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

      {/* Tab 2: Production Shortfall & 1-Click Engineering Corrective Actions */}
      {activeTab === 'shortfall' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Hourly Yield Variance & Root Cause Bottlenecks */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hourly Trend Bar Chart Table */}
            <div className="bg-white/90 border border-slate-200 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>Hourly Extraction Yield Gap (Target vs Actual Crusher Feed)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Shift 1 (06:00 - 14:00) ΓÇó Real-Time Delta Tonnage</p>
                </div>
                <span className="bg-amber-950/90 text-amber-300 border border-amber-500/70 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                  Gap: -{(shortfall?.projected_shortfall_tons - recoveredTonnage) > 0 ? (shortfall?.projected_shortfall_tons - recoveredTonnage) : 0} Tons
                </span>
              </div>

              {/* Hourly Grid Bars */}
              <div className="space-y-3">
                {shortfall?.hourly_trend?.map((hr: any) => (
                  <div key={hr.hour} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-12 text-slate-500">{hr.hour}</span>
                    <div className="flex-1 flex items-center gap-2 bg-slate-100/80 rounded-lg p-2 border border-slate-200/80">
                      <div className="w-24 text-[11px] text-slate-600">
                        <span className="font-bold text-slate-900">{hr.actual_tons}</span> / {hr.target_tons} T
                      </div>
                      <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
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

            {/* Root-Cause Bottleneck Attribution Cards */}
            <div className="bg-white/90 border border-slate-200 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Shortfall Root-Cause Constraint Attribution</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {shortfall?.bottlenecks?.map((b: any, idx: number) => (
                  <div key={idx} className="bg-slate-100/70 border border-slate-200 rounded-xl p-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">{b.cause}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          b.severity === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-600/70' : 'bg-amber-950 text-amber-300 border border-amber-600/70'
                        }`}>
                          {b.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{b.bench} ΓÇó Duration: {b.duration_min} min</p>
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
            <div className="bg-white/90 border border-slate-200 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" />
                <span>AI Prescriptive Corrective Solver</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mb-4">Execute Tonnage Recovery Actions</h3>

              <div className="space-y-3">
                {correctiveActions.map((action) => {
                  const isApplied = appliedActions.has(action.action_id);
                  return (
                    <div 
                      key={action.action_id}
                      className={`border rounded-xl p-3.5 transition-all ${
                        isApplied 
                          ? 'bg-emerald-950/40 border-emerald-500/60' 
                          : 'bg-slate-100/80 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{action.title}</span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-600/60">
                          +{action.tonnage_recovery_tons} T
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{action.description}</p>
                      
                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-200/80">
                        <span className="text-[10px] text-slate-500 font-mono">Impact: ~{action.recovery_time_min} mins</span>
                        
                        <button
                          onClick={() => handleApplyAction(action)}
                          disabled={isApplied}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                            isApplied
                              ? 'bg-emerald-600 text-slate-900 cursor-default shadow-md shadow-emerald-950'
                              : 'bg-cyan-600 hover:bg-cyan-500 text-slate-900 shadow-lg shadow-cyan-950'
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

            {/* Grade Blending Status Card */}
            <div className="bg-white/90 border border-slate-200 rounded-2xl p-4 shadow-xl">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block mb-1">Contract Grade Blending Control</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs text-slate-600">Crusher Feed Grade:</span>
                <span className="text-sm font-mono font-bold text-slate-900">42.8% Mn (Target: 43.5%)</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2 bg-slate-100 p-2.5 rounded-lg border border-slate-200">
                {shortfall?.blending_status?.remedy || 'Add 25 t/h high-grade lump from Stockpile HG-01 to primary feeder.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Truck Telemetry & TKPH HUD */}
      {activeTab === 'telemetry' && (
        <div className="space-y-4">
          <div className="bg-white/90 border border-slate-200 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Full Truck Fleet Telemetry &amp; Component Health Matrix</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Truck ID</th>
                    <th className="p-3">Model</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Payload (T)</th>
                    <th className="p-3">Speed (km/h)</th>
                    <th className="p-3">Coolant Temp</th>
                    <th className="p-3">Fuel Burn (L/h)</th>
                    <th className="p-3">Tire TKPH</th>
                    <th className="p-3">Driver Fatigue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trucks.map((truck) => (
                    <tr key={truck.id} className="hover:bg-slate-100/40 transition-colors">
                      <td className="p-3 font-bold text-slate-900 flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-cyan-400" />
                        {truck.id}
                      </td>
                      <td className="p-3 text-slate-600">{truck.model}</td>
                      <td className="p-3">{getStatusBadge(truck.status)}</td>
                      <td className="p-3 font-bold text-slate-900">{truck.payload_t} / {truck.capacity_t}</td>
                      <td className="p-3 text-slate-600">{truck.speed_kmh.toFixed(1)}</td>
                      <td className="p-3 text-slate-600">{truck.telemetry?.coolant_temp_c.toFixed(1)}┬░C</td>
                      <td className="p-3 text-amber-300">{truck.telemetry?.fuel_burn_rate_lph.toFixed(1)}</td>
                      <td className="p-3 font-bold text-emerald-400">{truck.telemetry?.tkph || 135}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (truck.telemetry?.driver_fatigue_index || 0.1) > 0.4
                            ? 'bg-rose-950 text-rose-300 border border-rose-600/70'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-600/70'
                        }`}>
                          {((truck.telemetry?.driver_fatigue_index || 0.12) * 100).toFixed(0)}% (Normal)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: HEMM Reliability & MTBF */}
      {activeTab === 'reliability' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hemmData?.hemm_units?.map((unit: HemmUnit) => (
              <div key={unit.unit_id} className="bg-white/90 border border-slate-200 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-3">
                    <span className="text-sm font-black text-slate-900">{unit.unit_id}</span>
                    <span className="bg-purple-950 text-purple-300 border border-purple-600/60 px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                      {unit.availability_pct}% Avail
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-600">{unit.type}</h4>
                  
                  <div className="mt-4 space-y-2 text-xs font-mono text-slate-500">
                    <div className="flex justify-between">
                      <span>MTBF (Reliability):</span>
                      <span className="font-bold text-slate-900">{unit.mtbf_hours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MTTR (Repair Time):</span>
                      <span className="font-bold text-slate-600">{unit.mttr_hours} Hours</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operating Hours:</span>
                      <span className="font-bold text-slate-600">{unit.operating_hours} h</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Critical Subsystem</span>
                  <span className="text-[11px] font-bold text-amber-300">{unit.critical_subsystem}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legacy Telemetry Module from main page */}
      <LegacyFleetTelemetry zone={zone} />
    </div>
  );
}
