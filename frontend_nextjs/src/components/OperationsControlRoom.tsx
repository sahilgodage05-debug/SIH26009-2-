'use client';

import React, { useState, useMemo } from 'react';
import { 
  FLEET_DATA, 
  OPERATIONAL_ALERTS, 
  OPERATIONS_KPIS,
  RESERVE_ZONES
} from '@/data/moilData';
import { FleetEquipment, OperationalAlert } from '@/types/moil';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Truck, 
  Wrench, 
  Zap, 
  Droplets, 
  ShieldAlert, 
  Activity, 
  ArrowRight, 
  Gauge, 
  Clock, 
  RefreshCw, 
  Layers, 
  Fuel, 
  Cpu, 
  Satellite, 
  Flame, 
  Compass, 
  Box, 
  Sparkles, 
  BarChart3, 
  Calendar,
  CloudRain,
  Radio,
  Thermometer,
  Trees,
  MapPin,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Mountain
} from 'lucide-react';

interface CorrectiveActionItem {
  id: string;
  category: 'fleet' | 'blasting' | 'schedule';
  title: string;
  description: string;
  constraintAddressed: string;
  recoverableTonnageMT: number;
  timeToImplement: string;
  status: 'recommended' | 'executed';
  assignedAsset: string;
}

export const OperationsControlRoom: React.FC<{
  onOpen2DMap?: () => void;
}> = ({ onOpen2DMap }) => {
  const [fleet, setFleet] = useState<FleetEquipment[]>(FLEET_DATA);
  const [activeFilter, setActiveFilter] = useState<'all' | 'warning' | 'operational'>('all');
  const [notification, setNotification] = useState<string | null>(null);
  const [debugMsg, setDebugMsg] = useState<string>('');
  const [selectedStateFilter, setSelectedStateFilter] = useState<'ALL' | 'MH' | 'MP'>('ALL');
  const [expandedMineId, setExpandedMineId] = useState<string | null>(null);
  const [showMinesRoster, setShowMinesRoster] = useState<boolean>(true);

  // Corrective Actions State (Directly answering Problem Statement 26009)
  const [actions, setActions] = useState<CorrectiveActionItem[]>([
    {
      id: 'action-fleet',      category: 'fleet',
      title: 'Re-deploy Equipment: Reroute 3 Tipper Dumpers to Dongri Pit B',
      description: 'Transfer 3 BEML 85T trucks from Gumgaon transit siding to Dongri Buzurg Pit B bench 2 to bypass EX-03 slowdown.',
      constraintAddressed: 'Equipment Downtime (EX-03 bearing vibration spike 8.7 mm/s)',
      recoverableTonnageMT: 6200,
      timeToImplement: '45 mins (Shift handover)',
      status: 'recommended',
      assignedAsset: 'BEML 85T (DT-08, DT-11, DT-14)'
    },
    {
      id: 'action-blasting',
      category: 'blasting',
      title: 'Optimize Blasting: Deploy Electronic Delay Detonators (EDD)',
      description: 'Switch from shock-tube non-el to precision 25ms electronic delay timing with adjusted 3.2m x 3.8m pattern at Tirodi Bench 2 to suppress ground vibration below DGMS 10 mm/s limit.',
      constraintAddressed: 'Blasting Delays (Ground vibration limit & ANFO column moisture)',
      recoverableTonnageMT: 3800,
      timeToImplement: '2.5 hrs (Next blast window)',
      status: 'recommended',
      assignedAsset: 'Sandvik DI550 (DR-02)'
    },
    {
      id: 'action-schedule',
      category: 'schedule',
      title: 'Adjust Mine Schedule & Rain Mitigation: Activate South Highwall Ramp',
      description: 'Reroute primary ore haulage to hard-rock South all-weather ramp (+3% grade) and deploy P-04 submersible dewatering pumps to drain waterlogged bench face.',
      constraintAddressed: 'Weather Impact (GPM radar: 48mm/hr rainfall & 78.4% pit moisture)',
      recoverableTonnageMT: 7100,
      timeToImplement: 'Immediate (Telemetry active)',
      status: 'recommended',
      assignedAsset: 'Pump Unit P-04 & South Haul Road'
    }
  ]);

  // Fetch Real Backend Data (User's Equipment + Shivam's Schedule AI)
  React.useEffect(() => {
    // 1. Fetch User's Equipment Data
    const fetchEquipment = async () => {
      try {
        const url = `http://${window.location.hostname}:8000/user/api/equipment/Balaghat%20Mine`;
        setDebugMsg(prev => prev + `\nFetching: ${url}`);
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setDebugMsg(prev => prev + `\nSuccess: fetched ${data.length} items`);
          const mappedFleet = data.map((eq: any) => ({
            id: eq.id.toString(),
            name: eq.machine_id,
            type: eq.type,
            assignedPit: eq.mine_location,
            vibrationMmSec: eq.vibration_level || 2.5,
            vibrationAnomaly: eq.vibration_level > 6.0,
            hydraulicTempC: eq.engine_temperature || 85,
            healthScore: Math.round(eq.health_score * 100),
            status: eq.status,
            hasFuelSensor: eq.has_fuel_sensor === 1,
            currentFuelLevel: eq.current_fuel_level,
            fuelCapacity: eq.fuel_capacity,
          }));
          setFleet(mappedFleet);
        } else {
          setDebugMsg(prev => prev + `\nError: HTTP ${response.status}`);
        }
      } catch (err: any) {
        setDebugMsg(prev => prev + `\nException: ${err.message}`);
        console.error("Failed to fetch equipment:", err);
      }
    };
    
    // 2. Fetch Shivam's Scheduling & Weather AI Data
    const fetchShivamAI = async () => {
      try {
        const url = `http://${window.location.hostname}:8000/shivam/api/get-schedule?location=Balaghat`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.Requires_Rescheduling) {
            setActions(prev => prev.map(act => {
              if (act.id === 'action-schedule') {
                return {
                  ...act,
                  title: 'AI Weather Rescheduling (Shivam API)',
                  description: data.Recommendation,
                  constraintAddressed: data.Alert || 'Heavy Rain Alert',
                };
              }
              return act;
            }));
          }
        }
      } catch (err) {
        console.error("Failed to fetch Shivam AI:", err);
      }
    };
    
    fetchEquipment();
    fetchShivamAI();
    const interval = setInterval(fetchEquipment, 5000);
    return () => clearInterval(interval);
  }, []);

  // Production Metrics Computation
  const monthlyTargetMT = 145000;
  const baselinePredictedMT = 126600; // Baseline before actions (-18,400 MT shortfall)
  
  // Dynamic calculation based on executed actions
  const totalRecoveredMT = useMemo(() => {
    return actions
      .filter(a => a.status === 'executed')
      .reduce((sum, a) => sum + a.recoverableTonnageMT, 0);
  }, [actions]);

  const currentPredictedMT = baselinePredictedMT + totalRecoveredMT;
  const currentShortfallMT = monthlyTargetMT - currentPredictedMT;
  const currentShortfallPct = ((currentShortfallMT / monthlyTargetMT) * 100).toFixed(1);

  // Toggle Action Execution
  const handleToggleAction = (actionId: string) => {
    setActions(prev => prev.map(act => {
      if (act.id === actionId) {
        const nextStatus = act.status === 'recommended' ? 'executed' : 'recommended';
        const msg = nextStatus === 'executed'
          ? `Executed corrective action: "${act.title}". Recovered +${act.recoverableTonnageMT.toLocaleString()} MT ore availability!`
          : `Reverted action: "${act.title}".`;
        setNotification(msg);
        setTimeout(() => setNotification(null), 4500);

        // Update fleet equipment assignment if fleet action
        if (act.id === 'action-fleet' && nextStatus === 'executed') {
          setFleet(f => f.map(eq => eq.id === 'eq-dt-14' ? { ...eq, assignedPit: 'Dongri Pit B (Re-routed)', status: 'Operational', healthScore: 88 } : eq));
        }

        return { ...act, status: nextStatus };
      }
      return act;
    }));
  };

  const handleExecuteAll = () => {
    setActions(prev => prev.map(a => ({ ...a, status: 'executed' })));
    setFleet(f => f.map(eq => ({ ...eq, status: 'Operational', healthScore: Math.max(85, eq.healthScore) })));
    setNotification('All 3 prescriptive corrective actions deployed! Recovered +17,100 MT ore supply. Production restored to 99.1% of target.');
    setTimeout(() => setNotification(null), 5000);
  };

  const filteredFleet = fleet.filter(eq => {
    if (activeFilter === 'warning') return eq.status === 'Warning' || eq.status === 'Critical Shortfall';
    if (activeFilter === 'operational') return eq.status === 'Operational';
    return true;
  });

  return (
    <div className="flex-1 bg-[#090d16] overflow-y-auto p-4 sm:p-6 space-y-6 select-none">
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 0. PROBLEM STATEMENT 26009 OFFICIAL HEADER BANNER */}
      {/* ───────────────────────────────────────────────────────────── */}
      {debugMsg && (
        <div className="bg-red-900/80 text-white p-4 font-mono text-xs whitespace-pre-wrap rounded">
          DEBUG INFO: {debugMsg}
        </div>
      )}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/40 to-slate-900 border border-emerald-500/40 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 tracking-wider uppercase">
                Problem Statement 26009
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                Ministry of Steel • MOIL Limited
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/30">
                AI/ML & Space Technology
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Manganese Reserve Predictor & Production Shortfall Mitigation Command
            </h2>

            <p className="text-xs text-slate-300 max-w-4xl leading-relaxed">
              Integrates multi-spectral satellite inputs (rainfall, soil moisture, vegetation index, land temperature) with geological Kriging and real-time fleet telemetry to predict production shortfalls and prescribe corrective operational actions.
            </p>
          </div>
        </div>

        {/* Live Space Technology Indicators Ribbon */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <CloudRain className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">Rainfall (GPM / IMERG)</div>
              <div className="font-mono text-[11px] font-bold text-cyan-300">48.2 mm/hr (High Monsoon)</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <Droplets className="w-4 h-4 text-blue-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">Soil Moisture (SMAP)</div>
              <div className="font-mono text-[11px] font-bold text-blue-300">78.4% Saturation</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <Trees className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">Vegetation Index (NDVI)</div>
              <div className="font-mono text-[11px] font-bold text-emerald-300">-0.22 Chlorosis Anomaly</div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
            <Thermometer className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="text-[10px] text-slate-400">Land Temp (Landsat-9 LST)</div>
              <div className="font-mono text-[11px] font-bold text-amber-300">35.4°C / 308.5 K</div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-3 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{notification}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. CORE EXPECTED SOLUTION CARDS: RESERVES & SHORTFALL STATUS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Predicted Reserves */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Total Predicted Reserves</span>
            <span className="font-mono text-emerald-400 text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/30">
              UNFC 111 / 122
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold font-mono text-white">90.9</span>
            <span className="text-sm text-slate-300 font-mono">Million Tonnes</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Avg Grade: <strong className="text-emerald-400 font-mono">42.8% Mn</strong></span>
            <span className="text-emerald-400 font-bold">11 Operating Mines (India)</span>
          </div>
        </div>

        {/* Card 2: Monthly Production Target */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-medium">Monthly Production Target</span>
            <span className="font-mono text-slate-400 text-[10px]">Sep 2026</span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold font-mono text-white">145,000</span>
            <span className="text-sm text-slate-400 font-mono">MT</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Daily Quota: <strong className="text-white font-mono">4,833 MT/day</strong></span>
            <span>Customer Supply Quota</span>
          </div>
        </div>

        {/* Card 3: AI Predicted Actual vs Shortfall Risk */}
        <div className={`p-4 rounded-2xl border shadow-xl transition-all ${
          currentShortfallMT > 2000 
            ? 'bg-rose-950/20 border-rose-500/40' 
            : 'bg-emerald-950/20 border-emerald-500/40'
        }`}>
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-medium text-slate-300">AI-Forecasted Actual</span>
            <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-bold ${
              currentShortfallMT > 2000
                ? 'bg-rose-950 text-rose-300 border border-rose-500/30'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
            }`}>
              {currentShortfallMT > 2000 ? `Shortfall -${currentShortfallPct}%` : 'Normal (99.1%)'}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className={`text-3xl font-bold font-mono ${currentShortfallMT > 2000 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {currentPredictedMT.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-mono">/ 145,000 MT</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-1.5">
            <div 
              className={`h-full transition-all duration-500 ${currentShortfallMT > 2000 ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (currentPredictedMT / monthlyTargetMT) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 4: Corrective Actions Recovery Status */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border border-emerald-500/40 shadow-xl hover:border-emerald-500/60 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span className="font-medium">Corrective Actions Recovery</span>
            <span className="font-mono text-emerald-400 text-[10px] font-bold">
              {actions.filter(a => a.status === 'executed').length}/3 Deployed
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold font-mono text-emerald-400">
              +{totalRecoveredMT.toLocaleString()}
            </span>
            <span className="text-sm text-slate-400 font-mono">MT Saved</span>
          </div>
          <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Residual Gap: <strong className="text-white font-mono">-{Math.max(0, currentShortfallMT).toLocaleString()} MT</strong></span>
            <span className="text-emerald-400">92.9% Mitigated</span>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1.5. ALL 11 OPERATING MINES OF INDIA ROSTER (PROBLEM STATEMENT 26009) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/85 border border-slate-800 shadow-xl space-y-4 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                MOIL Operating Mines Roster (All 11 Mines of India)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  11/11 Active
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Official portfolio across Maharashtra (6) & Madhya Pradesh (5) • 90.9M Tonnes in-situ manganese ore reserves under active UNFC-111 / DGMS compliance
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter by State */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs font-mono">
              <button
                onClick={() => setSelectedStateFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedStateFilter === 'ALL'
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All 11 Mines
              </button>
              <button
                onClick={() => setSelectedStateFilter('MH')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedStateFilter === 'MH'
                    ? 'bg-blue-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Maharashtra (6)
              </button>
              <button
                onClick={() => setSelectedStateFilter('MP')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedStateFilter === 'MP'
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Madhya Pradesh (5)
              </button>
            </div>

            {/* Collapse/Expand Toggle */}
            <button
              onClick={() => setShowMinesRoster(!showMinesRoster)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors"
              title={showMinesRoster ? 'Collapse Roster' : 'Expand Roster'}
            >
              {showMinesRoster ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showMinesRoster && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {RESERVE_ZONES.filter(mine => {
              if (selectedStateFilter === 'MH') return mine.leaseArea.includes('-MH');
              if (selectedStateFilter === 'MP') return mine.leaseArea.includes('-MP');
              return true;
            }).map((mine) => {
              const isMH = mine.leaseArea.includes('-MH');
              const isExpanded = expandedMineId === mine.id;
              const isUnderground = mine.name.toLowerCase().includes('underground');
              const isOpencast = mine.name.toLowerCase().includes('opencast');
              
              return (
                <div
                  key={mine.id}
                  className={`rounded-xl border transition-all duration-200 p-4 bg-slate-950/60 flex flex-col justify-between ${
                    isExpanded 
                      ? 'border-emerald-500/60 ring-1 ring-emerald-500/20 bg-slate-900/90' 
                      : 'border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                            isMH 
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {isMH ? 'Maharashtra' : 'Madhya Pradesh'}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {isUnderground && isOpencast ? 'Mixed (OC + UG)' : isUnderground ? 'Underground' : 'Opencast'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                          {mine.name.replace(/\s*\([^)]*\)/g, '')}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-mono mt-0.5">
                          <MapPin className="w-3 h-3 shrink-0 text-emerald-400" />
                          <span className="font-bold">{mine.exactLocation?.dms || `${mine.coordinates[0]}°N, ${mine.coordinates[1]}°E`}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 flex-wrap">
                          <span>{mine.exactLocation?.tehsilVillage || mine.leaseArea}</span>
                          <span>•</span>
                          <span className="text-amber-400">{mine.exactLocation?.districtState}</span>
                          <span>•</span>
                          <span className="text-slate-300">[{mine.coordinates[0].toFixed(4)}, {mine.coordinates[1].toFixed(4)}]</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold font-mono text-emerald-400">
                          {mine.manganeseProbability}% Mn
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {mine.confidenceInterval}
                        </span>
                      </div>
                    </div>

                    {/* Reserve Volume & Value Stats */}
                    <div className="grid grid-cols-2 gap-2 my-2.5 p-2 rounded-lg bg-slate-900/70 border border-slate-800/70 text-xs font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400">In-Situ Reserve</div>
                        <div className="font-bold text-slate-100">{mine.estimatedReserveVolume}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Average Grade</div>
                        <div className="font-bold text-amber-300 truncate" title={mine.averageGrade}>
                          {mine.averageGrade.split('(')[0]}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Resource Value</div>
                        <div className="font-bold text-emerald-400">{mine.estimatedValueINR}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Status</div>
                        <div className="font-semibold text-cyan-300 text-[11px] truncate">
                          {mine.status.replace('Deposit', '')}
                        </div>
                      </div>
                    </div>

                    {/* Space Technology Telemetry (PS 26009 Inputs) */}
                    <div className="grid grid-cols-2 gap-1.5 text-[10px] text-slate-300 py-1.5 border-y border-slate-800/60 font-mono">
                      <div className="flex items-center gap-1">
                        <CloudRain className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>Rain: {mine.spaceTelemetry?.rainfall_mm_hr ?? 42.5} mm/h</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-400 shrink-0" />
                        <span>Moist: {mine.spaceTelemetry?.soilMoisturePercent ?? Math.round((mine.satelliteTelemetry?.sarCoherence ?? 0.8) * 85)}%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trees className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>NDVI: {mine.spaceTelemetry?.ndviVegetationIndex ?? -Number((mine.satelliteTelemetry?.ndviAnomalyScore ?? 0.3).toFixed(2))}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Thermometer className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>LST: {mine.spaceTelemetry?.surfaceTempKelvin ?? mine.satelliteTelemetry?.surfaceTempKelvin ?? 308} K</span>
                      </div>
                    </div>

                    {/* Expanded Stratigraphy & AI Recommendation */}
                    {isExpanded && (
                      <div className="mt-3 pt-2 space-y-2 border-t border-slate-800 text-xs animate-in fade-in">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                            Subsurface Stratigraphy (PyKrige)
                          </span>
                          <div className="space-y-1 mt-1 font-mono text-[11px]">
                            {mine.stratigraphy.map((layer, lIdx) => (
                              <div key={lIdx} className="flex items-center justify-between px-2 py-1 rounded bg-slate-900/90 border border-slate-800">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: layer.color }} />
                                  <span className="text-slate-200">{layer.depth} - {layer.rockType}</span>
                                </div>
                                <span className="text-emerald-400 font-bold">{layer.mnGrade}% Mn</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/20 text-[11px] text-emerald-300">
                          <strong>AI Action:</strong> {mine.aiRecommendation}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stratigraphy & AI Recommendation Drill-down */}
                  <div className="mt-3 pt-2 border-t border-slate-800/80">
                    <button
                      onClick={() => setExpandedMineId(isExpanded ? null : mine.id)}
                      className="w-full text-xs text-slate-300 hover:text-white py-1.5 px-3 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{isExpanded ? 'Collapse Stratigraphy' : 'View Stratigraphy & AI Plan'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-emerald-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. PRODUCTION TRENDS & SHORTFALL TRAJECTORY (INTERACTIVE CHART) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Production Trends & Forecast Trajectory (April - September 2026)
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Historical actuals vs Target Baseline vs Unmitigated Shortfall Forecast vs Post-Corrective Recovery
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-blue-500/80" />
              <span className="text-slate-300 text-[11px]">Historical Actuals</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-amber-400 border-t border-dashed" />
              <span className="text-slate-300 text-[11px]">Target (145k MT)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-500/80" />
              <span className="text-slate-300 text-[11px]">Predicted Shortfall</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-300 text-[11px]">Recovered Actual</span>
            </div>
          </div>
        </div>

        {/* Visual Multi-Month Trend Chart */}
        <div className="grid grid-cols-6 gap-3 pt-2">
          {[
            { month: 'Apr 26', actual: 138000, target: 140000, status: 'normal' },
            { month: 'May 26', actual: 142000, target: 140000, status: 'normal' },
            { month: 'Jun 26', actual: 144500, target: 145000, status: 'normal' },
            { month: 'Jul 26', actual: 139000, target: 145000, status: 'rain' },
            { month: 'Aug 26', actual: 131500, target: 145000, status: 'monsoon' },
            { month: 'Sep 26 (Current)', actual: currentPredictedMT, target: 145000, status: 'forecast' }
          ].map((item, idx) => {
            const heightPct = (item.actual / 160000) * 100;
            const targetPct = (item.target / 160000) * 100;
            const isCurrent = idx === 5;
            return (
              <div key={item.month} className="flex flex-col items-center gap-2">
                <div className="relative w-full h-40 bg-slate-950/60 rounded-xl border border-slate-800/80 flex items-end justify-center p-2 group hover:border-slate-700 transition-all">
                  {/* Target reference dashed line */}
                  <div 
                    className="absolute left-0 right-0 border-t border-dashed border-amber-400/50 z-10" 
                    style={{ bottom: `${targetPct}%` }}
                    title={`Target: ${item.target.toLocaleString()} MT`}
                  />

                  {/* Production Bar */}
                  <div 
                    className={`w-full max-w-[40px] rounded-t-lg transition-all duration-500 relative flex flex-col justify-between p-1 ${
                      isCurrent
                        ? currentShortfallMT > 2000
                          ? 'bg-gradient-to-t from-rose-950 via-rose-600 to-amber-500'
                          : 'bg-gradient-to-t from-emerald-950 via-teal-600 to-emerald-400 shadow-lg shadow-emerald-950/60'
                        : 'bg-gradient-to-t from-slate-900 via-blue-700 to-cyan-500'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  >
                    <span className="text-[10px] font-mono font-bold text-white text-center block">
                      {Math.round(item.actual / 1000)}k
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <span className={`text-[11px] font-mono block ${isCurrent ? 'font-bold text-emerald-400' : 'text-slate-400'}`}>
                    {item.month}
                  </span>
                  <span className="text-[9px] text-slate-400 block font-mono">
                    {item.actual.toLocaleString()} MT
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3 & 4. TWO-COLUMN: SHORTFALL CONSTRAINTS VS CORRECTIVE ACTIONS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Root-Cause Shortfall Constraints (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Identified Shortfall Risks & Constraints</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-500/30">
              Total Risk: -18,400 MT
            </span>
          </div>

          <div className="space-y-3">
            {/* Constraint 1: Weather Conditions */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <CloudRain className="w-3 h-3" />
                  Constraint A: Weather Conditions
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">-8,200 MT</span>
              </div>
              <h4 className="text-xs font-bold text-white">
                Monsoon Cloudburst & Bench Waterlogging (Dongri Buzurg & Tirodi)
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                GPM/IMERG radar identifies 48.2 mm/hr cloud cell with SMAP pit moisture at 78.4%. Water accumulation at Dongri Pit A footwall causes haul road traction loss, slowing dumper cycle time by 42%.
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <span>Satellite Feed: GPM + SMAP</span>
                <span className="text-cyan-400 font-bold">Severity: Critical</span>
              </div>
            </div>

            {/* Constraint 2: Equipment Downtime */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  Constraint B: Equipment Downtime
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">-6,400 MT</span>
              </div>
              <h4 className="text-xs font-bold text-white">
                CAT 390F Excavator EX-03 Bearing Vibration Anomaly
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                IoT vibration sensor records 8.7 mm/s (threshold: 6.5 mm/s) on main slewing ring bearing, and BEML 85T dump truck DT-14 hydraulic oil temperature reached 104°C, reducing face loading capacity.
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <span>Asset Telemetry: 4 / 38 Alert</span>
                <span className="text-amber-400 font-bold">Severity: High</span>
              </div>
            </div>

            {/* Constraint 3: Blasting Delays */}
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  Constraint C: Blasting Delays
                </span>
                <span className="text-xs font-mono font-bold text-rose-400">-3,800 MT</span>
              </div>
              <h4 className="text-xs font-bold text-white">
                Moisture Saturation & DGMS Vibration Thresholds (Tirodi Bench 2)
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Water-saturated blast holes threaten conventional ANFO charge dissolution, while nearby village corridor requires strictly capped peak particle velocity (&lt;10 mm/s), causing a 3.5 hr blast delay.
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 pt-1 border-t border-slate-800">
                <span>Compliance: DGMS Vibration Rule</span>
                <span className="text-purple-400 font-bold">Severity: Medium</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prescriptive Corrective Steps (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">
                Recommended Corrective Steps (AI Prescriptions)
              </h3>
            </div>
            <button
              onClick={handleExecuteAll}
              className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 transition-colors"
            >
              Deploy All Actions
            </button>
          </div>

          <div className="space-y-3.5">
            {actions.map(act => {
              const isExecuted = act.status === 'executed';
              return (
                <div 
                  key={act.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isExecuted
                      ? 'bg-emerald-950/20 border-emerald-500/50 shadow-md shadow-emerald-950/30'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        isExecuted
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {isExecuted ? '✓ ACTION DEPLOYED' : 'RECOMMENDED STEP'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        Target: {act.assignedAsset}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                        +{act.recoverableTonnageMT.toLocaleString()} MT
                      </span>
                    </div>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1">
                    {act.title}
                  </h4>

                  <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                    {act.description}
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80 text-[11px]">
                    <div className="text-slate-400">
                      <span>Mitigates:</span> <strong className="text-slate-200">{act.constraintAddressed}</strong>
                    </div>

                    <button
                      onClick={() => handleToggleAction(act.id)}
                      className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        isExecuted
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                          : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/50'
                      }`}
                    >
                      {isExecuted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Action Active (Click to Revert)</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5 text-amber-300" />
                          <span>Execute Corrective Action</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Fleet Telemetry Live Table */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-3 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-teal-400" />
                  <span>Heavy Earthmoving Assets (HEMM) Telemetry</span>
                </h4>
                <p className="text-[10px] text-slate-400">Live IoT telemetry stream monitoring vibration and hydraulic temperatures</p>
              </div>

              <div className="flex gap-1 text-[10px] font-mono">
                <button 
                  onClick={() => setActiveFilter('all')}
                  className={`px-2 py-0.5 rounded ${activeFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                >
                  All ({fleet.length})
                </button>
                <button 
                  onClick={() => setActiveFilter('warning')}
                  className={`px-2 py-0.5 rounded ${activeFilter === 'warning' ? 'bg-rose-950 text-rose-300 border border-rose-500/30' : 'text-slate-400'}`}
                >
                  Alerts ({fleet.filter(f => f.status !== 'Operational').length})
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                    <th className="pb-1.5">Asset Code</th>
                    <th className="pb-1.5">Assigned Pit</th>
                    <th className="pb-1.5">Vibration</th>
                    <th className="pb-1.5">Engine Temp</th>
                    <th className="pb-1.5">Fuel Level</th>
                    <th className="pb-1.5">Health</th>
                    <th className="pb-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-[11px]">
                  {filteredFleet.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2">
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-[9px] text-slate-400 font-mono">{item.type}</div>
                      </td>
                      <td className="py-2 text-slate-300 font-mono text-[10px]">
                        {item.assignedPit}
                      </td>
                      <td className="py-2 font-mono">
                        <span className={item.vibrationAnomaly ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {item.vibrationMmSec} mm/s
                        </span>
                      </td>
                      <td className="py-2 font-mono">
                        <span className={item.hydraulicTempC > 100 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          {item.hydraulicTempC}°C
                        </span>
                      </td>
                      <td className="py-2">
                        {item.hasFuelSensor ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${item.currentFuelLevel! < 20 ? 'bg-rose-500' : item.currentFuelLevel! < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(100, Math.max(0, (item.currentFuelLevel! / item.fuelCapacity!) * 100))}%` }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono">{Math.round((item.currentFuelLevel! / item.fuelCapacity!) * 100)}%</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-500 font-mono">N/A</span>
                        )}
                      </td>
                      <td className="py-2">
                        <span className={`font-mono font-bold ${item.healthScore > 80 ? 'text-emerald-400' : item.healthScore > 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                          {item.healthScore}%
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded-full ${
                          item.status === 'Operational' || item.status === 'Idle'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950 text-rose-300 border border-rose-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
