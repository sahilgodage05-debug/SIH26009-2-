'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RESERVE_ZONES } from '@/data/moilData';
import { MINE_PROCESS_STEPS, MineProcessFlowchart } from '@/components/MineProcessFlowchart';
import { BlastingPitStudio3D } from '@/components/BlastingPitStudio3D';
import { ArrowLeft, Sparkles, Sliders, Database, AlertCircle, FileSpreadsheet, Activity } from 'lucide-react';

export default function ProcessDetailPage() {
  const params = useParams();
  const router = useRouter();

  const mineId = params.id as string;
  const processId = params.processId as string;

  const zone = RESERVE_ZONES.find(z => z.id === mineId);
  const currentProcess = MINE_PROCESS_STEPS.find(p => p.id === processId);

  const mineName = zone ? zone.name : mineId.toUpperCase() + ' Mine';

  if (!currentProcess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-white p-6">
        <h1 className="text-2xl font-bold mb-4">Process Module Not Found</h1>
        <p className="text-slate-400 mb-6 text-sm">The process step &quot;{processId}&quot; does not exist in the pipeline flow.</p>
        <button 
          onClick={() => router.push(`/mine/${mineId}`)}
          className="px-4 py-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors text-sm font-semibold"
        >
          Return to Mine Overview
        </button>
      </div>
    );
  }

  const Icon = currentProcess.icon;
  const isBlastingProcess = processId === 'operations' || processId === 'planning';

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100">
      {/* Top Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 px-6 border-b border-slate-800/80 bg-[#0c121e]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push(`/mine/${mineId}`)}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-xs flex items-center gap-2 border border-slate-700 transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {mineName}</span>
          </button>
          <button 
            onClick={() => router.push('/')}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 font-medium text-xs border border-slate-800 transition-all"
          >
            Dashboard
          </button>
        </div>

        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                Step {currentProcess.stepNumber}
              </span>
              <h1 className="text-base font-bold text-white tracking-wide">{currentProcess.title}</h1>
            </div>
            <p className="text-xs text-slate-400">{mineName} • {currentProcess.category}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Pipeline Status:</span>
          <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/30 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            {currentProcess.badge}
          </span>
        </div>
      </div>

      {/* Main Page Workspace */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Horizontal Flowchart (with current step highlighted) */}
        <MineProcessFlowchart 
          mineId={mineId} 
          mineName={mineName} 
          activeProcessId={processId} 
        />

        {/* Render 3D Drilling & Blasting Engineering Studio if in Operations or Planning Step */}
        {isBlastingProcess ? (
          <BlastingPitStudio3D />
        ) : (
          /* Blank / Reserved Template State for Other Processes */
          <div className="bg-[#0c121e]/90 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Header Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <Activity className="w-4 h-4" />
                  <span>Process ID: {currentProcess.id}</span>
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {currentProcess.title} Details & Operational Telemetry
                </h2>
                <p className="text-sm text-slate-400 max-w-2xl">
                  {currentProcess.description}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  disabled 
                  className="px-4 py-2 bg-slate-800 text-slate-500 rounded-lg text-xs font-semibold border border-slate-700 cursor-not-allowed flex items-center gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Export Telemetry CSV
                </button>
                <button 
                  disabled 
                  className="px-4 py-2 bg-emerald-600/30 text-emerald-300 rounded-lg text-xs font-semibold border border-emerald-500/30 cursor-not-allowed flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  Trigger Re-Inference
                </button>
              </div>
            </div>

            {/* Blank / Placeholder State Display */}
            <div className="my-12 py-16 flex flex-col items-center justify-center text-center rounded-xl bg-slate-900/40 border border-dashed border-slate-800 p-8 space-y-4">
              <div className="p-4 rounded-full bg-slate-800/80 text-emerald-400 border border-slate-700 shadow-inner">
                <Icon className="w-10 h-10" />
              </div>
              
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-semibold text-white">
                  {currentProcess.title} Workspace
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Detailed telemetry matrices, real-time sensor streams, and AI optimization controls for 
                  <span className="text-emerald-400 font-semibold"> {mineName} </span> 
                  in this specific process step are currently being initialized.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap justify-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Geostatistical Parameters</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
                  <Database className="w-3.5 h-3.5 text-blue-400" />
                  <span>Live PostGIS Spatial Logs</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-[11px] text-slate-300">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Operational Risk Scan</span>
                </div>
              </div>
            </div>

            {/* Footer Metadata */}
            <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-500">
              <span>Location: {mineName} ({zone?.leaseArea || 'MOIL Central Manganese Belt'})</span>
              <span>Target Framework: FastAPI Backend &amp; PyKrige / GEE Parameter Engine</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

