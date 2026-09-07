'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Html } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Play, 
  RotateCcw, 
  Zap, 
  Sliders, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Compass, 
  Layers, 
  Flame 
} from 'lucide-react';

interface BlastHoleData {
  hole_id: string;
  row_index: number;
  col_index: number;
  x: number;
  y: number;
  z_top: number;
  z_bottom: number;
  stemming_top_z: number;
  stemming_bottom_z: number;
  charge_top_z: number;
  charge_bottom_z: number;
  delay_ms: number;
}

// -------------------------------------------------------------
// 3D OPEN-PIT BENCH MESH & BLAST HOLES
// -------------------------------------------------------------
function BenchAndBlastGrid3D({ 
  holes, 
  benchHeight, 
  burden, 
  spacing, 
  detonatingHoles 
}: { 
  holes: BlastHoleData[]; 
  benchHeight: number; 
  burden: number; 
  spacing: number; 
  detonatingHoles: Set<string>;
}) {
  const meshRef = useRef<THREE.Group>(null);

  // Calculate grid dimensions
  const numRows = Math.max(...holes.map(h => h.row_index), 0) + 1;
  const numCols = Math.max(...holes.map(h => h.col_index), 0) + 1;
  
  const widthX = numCols * spacing + spacing;
  const depthY = numRows * burden + burden * 2;

  return (
    <group ref={meshRef} position={[-widthX / 2, 0, -depthY / 2]}>
      {/* Open-Pit Bench Rock Mass (Terraced Geometry) */}
      {/* Top Operating Bench Surface */}
      <mesh position={[widthX / 2, benchHeight / 2, depthY / 2]} receiveShadow castShadow>
        <boxGeometry args={[widthX + 6, benchHeight, depthY + 6]} />
        <meshStandardMaterial color="#2d3748" roughness={0.85} metalness={0.2} />
      </mesh>

      {/* Pit Bench Slope Wall */}
      <mesh position={[widthX / 2, benchHeight / 4, -2]} rotation={[Math.PI / 6, 0, 0]}>
        <boxGeometry args={[widthX + 6, benchHeight * 0.7, 4]} />
        <meshStandardMaterial color="#1a202c" roughness={0.9} />
      </mesh>

      {/* Bench Grid Coordinates / Wireframe Overlay */}
      <gridHelper 
        args={[Math.max(widthX, depthY) * 1.5, 20, '#10b981', '#334155']} 
        position={[widthX / 2, benchHeight + 0.05, depthY / 2]} 
      />

      {/* 3D Blast Holes */}
      {holes.map((hole) => {
        const isDetonating = detonatingHoles.has(hole.hole_id);
        const stemmingLength = hole.stemming_top_z - hole.stemming_bottom_z;
        const chargeLength = hole.charge_top_z - hole.charge_bottom_z;

        return (
          <group key={hole.hole_id} position={[hole.x + spacing / 2, 0, hole.y + burden]}>
            {/* Detonation Shockwave Ring Animation */}
            {isDetonating && (
              <mesh position={[0, benchHeight + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 2.5, 32]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.85} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Stemming Top Column (Crushed Gravel / Gold) */}
            <mesh position={[0, benchHeight - stemmingLength / 2, 0]}>
              <cylinderGeometry args={[0.25, 0.25, stemmingLength, 16]} />
              <meshStandardMaterial color={isDetonating ? '#ef4444' : '#eab308'} roughness={0.4} />
            </mesh>

            {/* Explosive Emulsion Charge Column (Orange/Red) */}
            <mesh position={[0, (hole.charge_top_z + hole.charge_bottom_z) / 2, 0]}>
              <cylinderGeometry args={[0.22, 0.22, Math.max(0.5, chargeLength), 16]} />
              <meshStandardMaterial 
                color={isDetonating ? '#ff0000' : '#f97316'} 
                emissive={isDetonating ? '#ff4500' : '#000000'}
                emissiveIntensity={isDetonating ? 2.5 : 0}
                roughness={0.3} 
              />
            </mesh>

            {/* Drillhole Surface Marker Collar */}
            <mesh position={[0, benchHeight + 0.1, 0]}>
              <cylinderGeometry args={[0.4, 0.4, 0.15, 16]} />
              <meshStandardMaterial color={isDetonating ? '#f59e0b' : '#10b981'} />
            </mesh>

            {/* Hole Delay MS Badge in 3D Space */}
            <Html position={[0, benchHeight + 1.2, 0]} center distanceFactor={25}>
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-md border ${
                isDetonating 
                  ? 'bg-red-500 text-white border-red-400 animate-ping' 
                  : 'bg-slate-900/90 text-emerald-400 border-slate-700'
              }`}>
                {hole.delay_ms}ms
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// -------------------------------------------------------------
// MAIN 3D BLASTING STUDIO COMPONENT
// -------------------------------------------------------------
export function BlastingPitStudio3D() {
  // Input parameters
  const [holeDiameter, setHoleDiameter] = useState<number>(150);
  const [burden, setBurden] = useState<number>(4.2);
  const [spacing, setSpacing] = useState<number>(5.0);
  const [benchHeight, setBenchHeight] = useState<number>(10.0);
  const [powderFactor, setPowderFactor] = useState<number>(0.55);
  const [rmrRating, setRmrRating] = useState<number>(65);

  // Backend response state
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);

  // Detonation Animation Simulation
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [detonatingHoles, setDetonatingHoles] = useState<Set<string>>(new Set());

  // Fetch optimization API from backend
  const fetchBlastingOptimization = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/v1/blasting/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hole_diameter_mm: holeDiameter,
          burden_m: burden,
          spacing_m: spacing,
          bench_height_m: benchHeight,
          sub_drilling_m: 1.2,
          stemming_m: 3.2,
          powder_factor_target: powderFactor,
          explosive_relative_strength: 115.0,
          rmr_rating: rmrRating,
          ucs_mpa: 120.0,
          distance_to_structure_m: 250.0
        })
      });

      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (err) {
      console.error('Failed to fetch blasting optimization:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlastingOptimization();
  }, [holeDiameter, burden, spacing, benchHeight, powderFactor, rmrRating]);

  // Detonation Animation Trigger
  const handleStartSimulation = () => {
    if (!results?.blast_pattern_3d?.holes) return;
    setIsSimulating(true);
    setDetonatingHoles(new Set());

    const holes: BlastHoleData[] = results.blast_pattern_3d.holes;
    const sortedDelays = Array.from(new Set(holes.map(h => h.delay_ms))).sort((a, b) => a - b);

    sortedDelays.forEach((delay, idx) => {
      setTimeout(() => {
        const active = new Set(holes.filter(h => h.delay_ms === delay).map(h => h.hole_id));
        setDetonatingHoles(active);

        if (idx === sortedDelays.length - 1) {
          setTimeout(() => {
            setDetonatingHoles(new Set());
            setIsSimulating(false);
          }, 600);
        }
      }, delay * 8); // Scale milliseconds for visual clarity
    });
  };

  const holes: BlastHoleData[] = results?.blast_pattern_3d?.holes || [];
  const kuzRam = results?.fragmentation_kuz_ram;
  const vibration = results?.vibration_ppv;

  return (
    <div className="w-full bg-[#0c121e]/95 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">
            <Flame className="w-4 h-4" />
            <span>Step 02: Geotechnical Drilling &amp; Blasting Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Open-Pit Bench Blast Pattern &amp; Kuz-Ram Fragmentation Optimization
          </h2>
          <p className="text-xs text-slate-400">
            Fuses Kuz-Ram rock fragmentation models, 3D WebGL drillhole grid design, and USBM ground vibration safety limits.
          </p>
        </div>

        <button
          onClick={handleStartSimulation}
          disabled={isSimulating || loading}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
            isSimulating
              ? 'bg-amber-500 text-slate-950 animate-pulse'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
          }`}
        >
          {isSimulating ? <Zap className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{isSimulating ? 'Detonating Sequence...' : 'Simulate Detonation Sequence'}</span>
        </button>
      </div>

      {/* Main Grid: Controls + 3D WebGL Canvas + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Parameters (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4" />
            <span>Blast Design Parameters</span>
          </div>

          {/* Slider 1: Hole Diameter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Drillhole Diameter (D):</span>
              <span className="text-emerald-400 font-mono">{holeDiameter} mm</span>
            </div>
            <input 
              type="range" min="85" max="250" step="5"
              value={holeDiameter}
              onChange={(e) => setHoleDiameter(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 2: Burden */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Burden Distance (B):</span>
              <span className="text-amber-400 font-mono">{burden} m</span>
            </div>
            <input 
              type="range" min="2.0" max="8.0" step="0.1"
              value={burden}
              onChange={(e) => setBurden(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 3: Spacing */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Hole Spacing (S):</span>
              <span className="text-cyan-400 font-mono">{spacing} m</span>
            </div>
            <input 
              type="range" min="2.5" max="10.0" step="0.1"
              value={spacing}
              onChange={(e) => setSpacing(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 4: Bench Height */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Bench Height (H):</span>
              <span className="text-purple-400 font-mono">{benchHeight} m</span>
            </div>
            <input 
              type="range" min="5.0" max="20.0" step="0.5"
              value={benchHeight}
              onChange={(e) => setBenchHeight(parseFloat(e.target.value))}
              className="w-full accent-purple-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 5: Powder Factor */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Powder Factor (q):</span>
              <span className="text-red-400 font-mono">{powderFactor} kg/m³</span>
            </div>
            <input 
              type="range" min="0.25" max="1.2" step="0.02"
              value={powderFactor}
              onChange={(e) => setPowderFactor(parseFloat(e.target.value))}
              className="w-full accent-red-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 6: Rock Mass Rating */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-300">Rock Mass Rating (RMR):</span>
              <span className="text-emerald-400 font-mono">{rmrRating} (Medium-Hard)</span>
            </div>
            <input 
              type="range" min="30" max="95" step="1"
              value={rmrRating}
              onChange={(e) => setRmrRating(parseInt(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Center Column: 3D WebGL Canvas (8 cols) */}
        <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-xl relative h-[450px] overflow-hidden">
          {/* Canvas Legend Overlay */}
          <div className="absolute top-3 left-3 z-10 bg-slate-900/80 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-[11px] space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Drillhole Collar</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span>Stemming Column (Gravel)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span>Bulk Emulsion Charge Column</span>
            </div>
          </div>

          <Canvas camera={{ position: [25, 20, 25], fov: 45 }}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[20, 30, 10]} intensity={1.2} castShadow />
            <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />

            <BenchAndBlastGrid3D
              holes={holes}
              benchHeight={benchHeight}
              burden={burden}
              spacing={spacing}
              detonatingHoles={detonatingHoles}
            />
          </Canvas>
        </div>

      </div>

      {/* Bottom KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: P80 Passing Fragment Size */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Kuz-Ram P80 Fragment Size</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {kuzRam ? `${kuzRam.p80_passing_size_mm} mm` : '---'}
          </div>
          <p className="text-[10px] text-emerald-400">
            Target Crusher Feed &le; 250mm
          </p>
        </div>

        {/* Card 2: Effective Powder Factor */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Powder Factor &amp; Charge</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {kuzRam ? `${kuzRam.powder_factor_kg_m3} kg/m³` : '---'}
          </div>
          <p className="text-[10px] text-amber-400">
            {kuzRam ? `${kuzRam.explosive_mass_per_hole_kg} kg/hole` : '---'}
          </p>
        </div>

        {/* Card 3: USBM PPV Ground Vibration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Peak Particle Velocity (PPV)</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {vibration ? `${vibration.peak_particle_velocity_ppv_mm_s} mm/s` : '---'}
          </div>
          <p className="text-[10px] text-purple-400">
            {vibration ? vibration.dgms_safety_status : '---'}
          </p>
        </div>

        {/* Card 4: Comminution Crushing Savings */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Crushing Energy Savings</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {kuzRam ? `+$${kuzRam.net_crushing_savings_per_t}/t` : '---'}
          </div>
          <p className="text-[10px] text-slate-400">
            {kuzRam ? `Base Crushing: $${kuzRam.comminution_crushing_cost_per_t}/tonne` : '---'}
          </p>
        </div>
      </div>
    </div>
  );
}
