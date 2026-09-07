'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RESERVE_ZONES } from '@/data/moilData';
import { ConfidenceInspector } from '@/components/ConfidenceInspector';
import { MineProcessFlowchart } from '@/components/MineProcessFlowchart';

export default function MinePage() {
  const params = useParams();
  const router = useRouter();

  const mineId = params.id as string;
  const zone = RESERVE_ZONES.find(z => z.id === mineId);

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#090d16] text-white">
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

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 p-4 px-6 border-b border-slate-800 bg-[#0c121e]">
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold flex items-center gap-2 border border-slate-700 transition-all text-xs"
        >
          <span>← Back to Dashboard</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{zone.name} Details</h1>
          <p className="text-xs text-slate-400">{zone.leaseArea} - End-to-End Operational Lifecycle</p>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Horizontal Process Flowchart */}
        <MineProcessFlowchart 
          mineId={mineId} 
          mineName={zone.name} 
        />

        {/* Mine Details Inspector Container */}
        <div className="w-full bg-[#0c121e]/98 border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden relative p-4">
          <ConfidenceInspector 
            zone={zone}
            isOpen={true}
            onClose={() => router.push('/')}
            fullScreen={true}
          />
        </div>

      </div>
    </div>
  );
}
