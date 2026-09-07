'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { LayerState, ReserveZone } from '@/types/moil';
import { Loader2 } from 'lucide-react';

interface MapWrapperProps {
  layers: LayerState;
  selectedZone: ReserveZone | null;
  onSelectZone: (zone: ReserveZone) => void;
  confidenceThreshold: number;
  msvOpacity?: number;
}

// Dynamically import MapComponent with SSR disabled
const DynamicLeafletMap = dynamic(
  () => import('./MapComponent').then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <div className="absolute inset-0 blur-lg bg-emerald-500/20" />
        </div>
        <div className="text-center font-mono">
          <p className="text-xs text-slate-700 font-semibold">Initializing MOIL Geospatial GIS...</p>
          <p className="text-[10px] text-slate-500">Loading Sentinel-2 & Cartosat-3 Vector Layers</p>
        </div>
      </div>
    )
  }
);

export const MapWrapper: React.FC<MapWrapperProps> = (props) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-600 gap-3">
        <div className="relative">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
          <div className="absolute inset-0 blur-lg bg-emerald-500/20" />
        </div>
        <div className="text-center font-mono">
          <p className="text-xs text-slate-700 font-semibold">Initializing MOIL Geospatial GIS...</p>
          <p className="text-[10px] text-slate-500">Loading Sentinel-2 & Cartosat-3 Vector Layers</p>
        </div>
      </div>
    );
  }

  return <DynamicLeafletMap {...props} />;
};
