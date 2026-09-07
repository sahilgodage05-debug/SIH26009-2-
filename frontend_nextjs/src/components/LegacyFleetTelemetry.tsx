import React, { useEffect, useState } from 'react';
import { Truck, AlertTriangle, CheckCircle2, Clock, HardHat } from 'lucide-react';

export function LegacyFleetTelemetry({ zone }: { zone: any }) {
  const [fleet, setFleet] = useState<any[]>([]);
  const [loadingFleet, setLoadingFleet] = useState(true);

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

  const activeFleet = fleet.filter(f => f.status === 'Active').length;
  const maintenanceFleet = fleet.filter(f => f.status === 'Maintenance').length;
  const avgHealth = fleet.length > 0 ? fleet.reduce((acc, f) => acc + f.health_score, 0) / fleet.length : 0;
  const workerCount = fleet.length > 0 ? fleet[0].workers_count : 'Loading...';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Workforce Capacity */}
      <div className="col-span-1 flex flex-col gap-6">
        <div className="p-5 rounded-2xl bg-slate-50/10 border border-slate-200 shadow-lg flex items-center gap-4 text-slate-900">
          <div className="p-4 bg-indigo-500/20 rounded-full border border-indigo-500/40 text-indigo-400">
            <HardHat className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Workforce Capacity</h3>
            <div className="text-3xl font-mono text-slate-900">{workerCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">Active Miners & Staff</div>
          </div>
        </div>
      </div>

      {/* Full Equipment Telemetry Grid */}
      <div className="col-span-1 md:col-span-3 p-6 rounded-2xl bg-slate-50/5 border border-slate-200 shadow-lg text-slate-900">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Live Fleet Telemetry & Diagnostics</h3>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-400 uppercase">Avg Fleet Health</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{avgHealth.toFixed(1)}%</span>
            </div>
            <div className="flex gap-2">
              <div className="bg-emerald-950/50 px-3 py-1.5 rounded-lg border border-emerald-900/70 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-mono text-slate-700">{activeFleet} Active</span>
              </div>
              <div className="bg-rose-950/50 px-3 py-1.5 rounded-lg border border-rose-900/70 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span className="text-sm font-mono text-slate-700">{maintenanceFleet} Maint</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fleet.map((f: any, idx) => (
            <div key={idx} className="bg-white/60 p-4 rounded-xl border border-slate-200 hover:border-slate-500 transition-colors">
              <div className="flex justify-between items-start mb-3 border-b border-slate-200/80 pb-3">
                <div>
                  <h4 className="font-mono text-emerald-400 font-bold">{f.machine_id}</h4>
                  <span className="text-[10px] text-slate-400 uppercase">{f.equipment_type}</span>
                </div>
                <div className="text-right">
                  <span className={`text-lg font-bold font-mono ${f.status === 'Active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {f.health_score}%
                  </span>
                  <span className="block text-[10px] uppercase text-slate-500">{f.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-xs">
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Engine Temp</span>
                  <span className="font-mono text-slate-700">{f.engine_temp_c}°C</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Oil Pressure</span>
                  <span className="font-mono text-slate-700">{f.oil_pressure_psi} PSI</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Vibration</span>
                  <span className="font-mono text-slate-700">{f.vibration_hz} Hz</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-500 uppercase mb-0.5">Fuel / Battery</span>
                  <span className="font-mono text-slate-700">
                    {f.equipment_type === 'Electric LHD' ? `${f.battery_voltage_v}V` : `${f.fuel_consumption_lph} L/h`}
                  </span>
                </div>
                <div className="col-span-2 flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-400">Total Ops: {f.operating_hours} hrs</span>
                </div>
              </div>
            </div>
          ))}
          
          {fleet.length === 0 && !loadingFleet && (
            <div className="col-span-3 text-center p-8 text-slate-500">
              No equipment data found for this mine.
            </div>
          )}
          {loadingFleet && (
            <div className="col-span-3 text-center p-8 text-slate-500 animate-pulse">
              Fetching secure telemetry...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
