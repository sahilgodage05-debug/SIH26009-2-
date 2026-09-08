'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RESERVE_ZONES } from '@/data/moilData';
import { MineProcessFlowchart } from '@/components/MineProcessFlowchart';
import { MiningSatelliteRAGStudio } from '@/components/MiningSatelliteRAGStudio';
import { 
  ArrowLeft, Activity, MapPin, Layers, Pickaxe, 
  CloudRain, Thermometer, Droplets, Leaf, 
  HardHat, Truck, AlertTriangle, CheckCircle2, TrendingUp,
  Compass, Mountain, Radio, Zap, Settings, Clock, Bot, Cpu
} from 'lucide-react';

export default function MinePage() {
  const params = useParams();
  const router = useRouter();

  const mineId = params.id as string;
  const zone = RESERVE_ZONES.find(z => z.id === mineId);

  const [fleet, setFleet] = useState<any[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(true);
  const [actions, setActions] = useState<any[]>([]);
  const [notification, setNotification] = useState<string | null>(null);
  const [isRagOpen, setIsRagOpen] = useState(false);


  useEffect(() => {
    // Fetch AI scheduling actions
    const fetchActions = async () => {
      try {
        const url = `http://${window.location.hostname}:8000/user/api/equipment_schedule`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setActions(data.actions || []);
        }
      } catch (err) {
        console.error("Failed to fetch scheduling actions:", err);
      }
    };
    fetchActions();
  }, []);

  const handleToggleAction = (actionId: string) => {
    setActions(prev => prev.map(act => {
      if (act.id === actionId) {
        const nextStatus = act.status === 'recommended' ? 'executed' : 'recommended';
        const msg = nextStatus === 'executed'
          ? `Executed corrective action: "${act.title}". Recovered +${act.recoverableTonnageMT.toLocaleString()} MT ore availability!`
          : `Reverted action: "${act.title}".`;
        setNotification(msg);
        setTimeout(() => setNotification(null), 4500);
        return { ...act, status: nextStatus };
      }
      return act;
    }));
  };

  useEffect(() => {
    if (!zone) return;
    const baseMineName = zone.name.split(' (')[0];
    
    const fetchEquipment = async () => {
      try {
        const url = `http://${window.location.hostname}:8000/user/api/equipment/${encodeURIComponent(baseMineName)}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setFleet(data);
        }
      } catch (err) {
        console.error("Failed to fetch equipment:", err);
      } finally {
        setLoadingFleet(false);
      }
    };

    fetchEquipment();
    const interval = setInterval(fetchEquipment, 10000);
    return () => clearInterval(interval);
  }, [zone]);

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
        <h1 className="text-2xl font-bold mb-4">Mine Not Found</h1>
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  // Calculate fleet stats
  const activeFleet = fleet.filter(f => f.status === 'Active').length;
  const maintenanceFleet = fleet.filter(f => f.status === 'Maintenance').length;
  const avgHealth = fleet.length > 0 ? fleet.reduce((acc, f) => acc + f.health_score, 0) / fleet.length : 0;
  const workerCount = fleet.length > 0 ? fleet[0].workers_count : 'Loading...';

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-700 overflow-y-auto custom-scrollbar">
      {/* Header with full metadata */}
      <div className="sticky top-0 z-50 flex items-center justify-between p-4 px-8 border-b border-slate-200/80 bg-slate-100/90 backdrop-blur-md">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.push('/')}
            className="p-2 rounded-xl bg-slate-200/80 hover:bg-slate-300 text-slate-700 transition-colors border border-slate-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wider">{zone.name}</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30">
                {zone.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-slate-600">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {zone.exactLocation?.tehsilVillage}, {zone.exactLocation?.districtState} - {zone.exactLocation?.pincode}</span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1"><Compass className="w-3.5 h-3.5" /> {zone.exactLocation?.dms}</span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1"><Mountain className="w-3.5 h-3.5" /> Elev: {zone.exactLocation?.elevationMeters}m</span>
              <span className="text-slate-600">|</span>
              <span>Lease: {zone.leaseArea}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Floating System Notification Toast */}
      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2.5 rounded-xl bg-slate-50/95 border border-emerald-500/40 text-xs text-slate-900 shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4">
          <Zap className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
          <span className="font-medium">{notification}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto w-full p-6 space-y-6">
        
        {/* Horizontal Process Lifecycle Flowchart (Step Navigation) */}
        <MineProcessFlowchart 
          mineId={mineId} 
          mineName={zone.name} 
        />

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          

          {/* AI Recommended Actions (Shivam Schedule) */}
          <div className="col-span-1 md:col-span-3 mb-2 space-y-3">
            {actions.map((act) => (
              <div 
                key={act.id} 
                className={`relative overflow-hidden p-4 rounded-xl border ${
                  act.status === 'executed' 
                    ? 'bg-emerald-950/20 border-emerald-900/50' 
                    : 'bg-indigo-950/20 border-indigo-500/30'
                } transition-all duration-300`}
              >
                <div className="flex gap-4 items-start relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className={`w-4 h-4 ${act.status === 'executed' ? 'text-emerald-500' : 'text-amber-400'}`} />
                      <h4 className="text-sm font-bold text-slate-900">{act.title}</h4>
                      {act.status === 'executed' && (
                        <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase font-bold tracking-wider">
                          Executed
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed mb-2 max-w-3xl">
                      {act.description}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 mt-3 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-slate-700"><span className="text-slate-500">Constraint:</span> {act.constraintAddressed}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-slate-700"><span className="text-slate-500">Timeline:</span> {act.timeToImplement}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <button
                      onClick={() => handleToggleAction(act.id)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
                        act.status === 'executed'
                          ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                          : 'bg-emerald-600 text-slate-900 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
                      }`}
                    >
                      {act.status === 'executed' ? 'Revert Action' : 'Execute Recommendation'}
                    </button>
                    {act.status === 'executed' && (
                      <div className="text-right">
                        <span className="block text-[10px] text-slate-500 uppercase">Impact</span>
                        <span className="text-sm font-mono font-bold text-emerald-400">+{act.recoverableTonnageMT.toLocaleString()} MT</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Floating AI Assistant Launcher Pill */}
      <button
        onClick={() => setIsRagOpen(true)}
        className="fixed bottom-6 right-6 z-[600] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-2xl shadow-emerald-900/40 border border-emerald-400/40 backdrop-blur-md transition-all duration-200 hover:scale-105 active:scale-95"
        title="Ask MOIL AI Assistant"
      >
        <div className="relative">
          <Bot className="w-4 h-4 text-emerald-200" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
        </div>
        <span>Ask MOIL AI</span>
      </button>


      {/* Dual-Stream RAG Intelligence Studio Modal */}
      <MiningSatelliteRAGStudio
        isOpen={isRagOpen}
        onClose={() => setIsRagOpen(false)}
      />
    </div>
  );
}

