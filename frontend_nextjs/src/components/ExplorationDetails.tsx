import React from 'react';
import { Activity, Pickaxe, TrendingUp, CloudRain, Droplets, Thermometer, Leaf, Radio, Layers, Zap } from 'lucide-react';

export function ExplorationDetails({ zone }: { zone: any }) {
  if (!zone) return <div>No zone selected or data unavailable.</div>;
  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* ROW 1 */}
      {/* Core AI & Reserve Specs */}
      <div className="col-span-1 md:col-span-2 grid grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-200 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider">AI Manganese Probability</h3>
          </div>
          <div className="flex items-baseline gap-3">
            <span className={`text-5xl font-extrabold ${getScoreColor(zone.manganeseProbability)}`}>
              {zone.manganeseProbability}%
            </span>
            <span className="text-xs font-mono text-slate-500">CI: {zone.confidenceInterval}</span>
          </div>
          <p className="mt-3 text-xs text-slate-700 leading-relaxed bg-white/50 p-2.5 rounded-lg border border-slate-200/50">
            <strong className="text-emerald-400 block mb-1">Primary Indicator:</strong>
            {zone.primaryIndicator}
          </p>
        </div>

        <div className="grid grid-rows-2 gap-4">
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200 shadow-lg flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-600 uppercase mb-1">Estimated Reserve Volume</span>
            <span className="text-2xl font-mono text-slate-900">{zone.estimatedReserveVolume}</span>
            <span className="text-xs text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <Pickaxe className="w-3.5 h-3.5" /> Grade: {zone.averageGrade}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50/60 border border-slate-200 shadow-lg flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-600 uppercase mb-1">Estimated Valuation</span>
            <span className="text-2xl font-mono text-emerald-400">{zone.estimatedValueINR}</span>
            <span className="text-xs text-slate-600 mt-1 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Strip Ratio: {zone.overburdenRatio}
            </span>
          </div>
        </div>
      </div>

      {/* Weather & Space Telemetry Column */}
      <div className="col-span-1 flex flex-col gap-6">
        <div className="p-5 rounded-2xl bg-slate-50/60 border border-slate-200 shadow-lg">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-4">Live Earth Observation (GEE)</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/50 p-3 rounded-xl border border-slate-200/50 text-center">
              <CloudRain className="w-5 h-5 text-blue-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-slate-900">{zone.spaceTelemetry?.rainfall_mm_hr || 'N/A'}</div>
              <div className="text-[10px] text-slate-600 uppercase mt-1">Rainfall (mm/hr)</div>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border border-slate-200/50 text-center">
              <Droplets className="w-5 h-5 text-cyan-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-slate-900">{zone.spaceTelemetry?.soilMoisturePercent || 'N/A'}%</div>
              <div className="text-[10px] text-slate-600 uppercase mt-1">Soil Moisture</div>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border border-slate-200/50 text-center">
              <Thermometer className="w-5 h-5 text-orange-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-slate-900">{zone.spaceTelemetry?.surfaceTempKelvin || 'N/A'}</div>
              <div className="text-[10px] text-slate-600 uppercase mt-1">Surface Temp (K)</div>
            </div>
            <div className="bg-white/50 p-3 rounded-xl border border-slate-200/50 text-center">
              <Leaf className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
              <div className="text-lg font-mono text-slate-900">{zone.spaceTelemetry?.ndviVegetationIndex || 'N/A'}</div>
              <div className="text-[10px] text-slate-600 uppercase mt-1">NDVI Anomaly</div>
            </div>
          </div>
        </div>

        <div className="flex-1 p-5 rounded-2xl bg-slate-50/60 border border-slate-200 shadow-lg">
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">Satellite Telemetry</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Pass Date</span>
              <span className="text-slate-700 font-mono">{zone.satelliteTelemetry?.sentinelPassDate}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">SAR Coherence</span>
              <span className="text-emerald-400 font-mono font-bold">{zone.satelliteTelemetry?.sarCoherence}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">NDVI Score</span>
              <span className="text-slate-700 font-mono">{zone.satelliteTelemetry?.ndviAnomalyScore}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ROW 2 */}
      {/* Geophysical Indicators */}
      <div className="col-span-1 md:col-span-3 p-6 rounded-2xl bg-slate-50/60 border border-slate-200 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Radio className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Geophysical & Structural Indicators</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(zone.indicators || {}).map(([key, ind]: [string, any]) => (
            <div key={key} className="bg-white/50 p-4 rounded-xl border border-slate-200/50">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-600 uppercase">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {ind.status}
                </span>
              </div>
              <div className="text-lg font-mono text-slate-900 mb-1">{ind.value}</div>
              <p className="text-[11px] text-slate-500 leading-relaxed">{ind.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ROW 3 */}
      {/* Stratigraphy / Geological Profile */}
      <div className="col-span-1 md:col-span-3 p-6 rounded-2xl bg-slate-50/60 border border-slate-200 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Geological Stratigraphy Log</h3>
          </div>
          {/* AI Recommendation Badge */}
          <div className="max-w-xl p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-500/30 text-indigo-200 text-xs flex gap-2 items-start">
            <Zap className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <p>{zone.aiRecommendation}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {zone.stratigraphy.map((layer: any, idx: number) => (
            <div key={idx} className="flex items-center bg-white/50 rounded-xl p-3 border border-slate-200/50 hover:bg-slate-200 transition-colors">
              <div 
                className="w-2 h-10 rounded-full mr-4 shrink-0" 
                style={{ backgroundColor: layer.color }}
              />
              <div className="w-24 shrink-0 text-sm font-mono text-slate-600">{layer.depth}</div>
              <div className="flex-1">
                <div className="text-sm font-bold text-slate-800">{layer.rockType}</div>
                <div className="text-xs text-slate-500">{layer.layerName}</div>
              </div>
              <div className="w-24 shrink-0 text-right font-mono text-emerald-400 text-base font-bold">{layer.mnGrade.toFixed(1)}% Mn</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
