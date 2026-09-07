'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RESERVE_ZONES } from '@/data/moilData';
import { ConfidenceInspector } from '@/components/ConfidenceInspector';

export default function MinePage() {
  const { id } = useParams();
  const router = useRouter();

  const zone = RESERVE_ZONES.find(z => z.id === id);

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
    <div className="flex flex-col min-h-screen bg-[#090d16]">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 p-4 border-b border-slate-800 bg-[#0c121e]">
        <button 
          onClick={() => router.push('/')}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold flex items-center gap-2 border border-slate-700 transition-all"
        >
          <span>← Back to Dashboard</span>
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">{zone.name} Details</h1>
          <p className="text-xs text-slate-400">{zone.leaseArea} - Full Analysis</p>
        </div>
      </div>
      
      {/* Container for Inspector (centered) */}
      <div className="flex-1 flex justify-center items-start p-8">
        <div className="w-[800px] max-w-full bg-[#0c121e]/98 border border-slate-800/90 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden relative">
          {/* We reuse ConfidenceInspector but since it might have fixed CSS, we override it or just render it inside */}
          {/* Note: If ConfidenceInspector has fixed positioning, it might break here. Let's assume it works or we'll adjust */}
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
