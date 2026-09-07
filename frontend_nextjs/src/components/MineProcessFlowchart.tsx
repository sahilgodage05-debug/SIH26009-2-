'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { 
  Compass, 
  Layers, 
  Pickaxe, 
  TrendingUp, 
  Factory, 
  ShieldAlert, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  ChevronRight
} from 'lucide-react';

export interface ProcessStep {
  id: string;
  stepNumber: string;
  title: string;
  category: string;
  status: 'completed' | 'active' | 'scheduled';
  description: string;
  icon: any;
  color: string;
  badge: string;
}

export const MINE_PROCESS_STEPS: ProcessStep[] = [
  {
    id: 'exploration',
    stepNumber: '01',
    title: 'Geological & Remote Sensing',
    category: 'Exploration Phase',
    status: 'completed',
    description: 'Sentinel-2 multi-spectral, Sentinel-1 SAR & ERT/IP inversion anomaly mapping.',
    icon: Compass,
    color: 'emerald',
    badge: 'Completed'
  },

  {
    id: 'planning',
    stepNumber: '02',
    title: 'Mine Planning & Pit Design',
    category: 'Optimization',
    status: 'active',
    description: 'Geotechnical pit slope analysis, cut-off grade optimization & benches.',
    icon: Pickaxe,
    color: 'amber',
    badge: 'Active AI Scanning'
  },
  {
    id: 'operations',
    stepNumber: '03',
    title: 'Drilling, Blasting & Heavy Fleet',
    category: 'Extraction Ops',
    status: 'active',
    description: 'HEMM fleet tracking, powder factor optimization & downtime telemetry.',
    icon: Factory,
    color: 'blue',
    badge: 'Telemetry Active'
  }
];

interface MineProcessFlowchartProps {
  mineId: string;
  mineName: string;
  activeProcessId?: string;
}

export function MineProcessFlowchart({ mineId, mineName, activeProcessId }: MineProcessFlowchartProps) {
  const router = useRouter();

  const handleProcessClick = (processId: string) => {
    router.push(`/mine/${mineId}/process/${processId}`);
  };

  return (
    <div className="w-full bg-slate-100/90 border border-slate-200/80 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sequential Operational Pipeline</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            {mineName} <span className="text-slate-500 font-normal">| Process Lifecycle Flowchart</span>
          </h2>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-600 bg-slate-50/60 px-3 py-1.5 rounded-lg border border-slate-200">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Click any process box to open detailed analysis workspace
          </span>
        </div>
      </div>

      {/* Horizontal Flowchart Scroll Container */}
      <div className="overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div className="flex items-stretch gap-3 min-w-[1100px]">
          {MINE_PROCESS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeProcessId === step.id;

            let statusBg = 'bg-slate-200/60 text-slate-600 border-slate-300';
            let iconColor = 'text-slate-600';
            let borderHover = 'hover:border-slate-400';

            if (step.status === 'completed') {
              statusBg = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
              iconColor = 'text-emerald-400';
              borderHover = 'hover:border-emerald-500/60 hover:shadow-emerald-500/10';
            } else if (step.status === 'active') {
              statusBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
              iconColor = 'text-amber-400';
              borderHover = 'hover:border-amber-500/60 hover:shadow-amber-500/10';
            }

            return (
              <React.Fragment key={step.id}>
                {/* Process Box */}
                <div
                  onClick={() => handleProcessClick(step.id)}
                  className={`flex-1 min-w-[170px] max-w-[210px] group relative cursor-pointer rounded-xl p-4 transition-all duration-300 border bg-slate-50/90 shadow-md ${
                    isSelected 
                      ? 'border-emerald-400 ring-2 ring-emerald-400/20 bg-emerald-950/20 scale-[1.02]' 
                      : `border-slate-200 ${borderHover} hover:scale-[1.02] hover:-translate-y-0.5`
                  }`}
                >
                  {/* Top Bar with Step Index & Status Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono font-bold text-slate-500 group-hover:text-slate-700 transition-colors">
                      {step.stepNumber}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBg}`}>
                      {step.badge}
                    </span>
                  </div>

                  {/* Icon & Category */}
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-2 rounded-lg bg-slate-50 border border-slate-200 ${iconColor} group-hover:scale-110 transition-transform`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-600 uppercase tracking-wider line-clamp-1">
                      {step.category}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xs font-bold text-slate-900 mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                    {step.description}
                  </p>

                  {/* Bottom Action Link Indicator */}
                  <div className="mt-4 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-semibold text-slate-600 group-hover:text-emerald-400 transition-colors">
                    <span>View Module</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>

                {/* Connecting Arrow between steps */}
                {idx < MINE_PROCESS_STEPS.length - 1 && (
                  <div className="flex items-center justify-center text-slate-700 px-0.5">
                    <div className="w-5 h-5 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                      <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
