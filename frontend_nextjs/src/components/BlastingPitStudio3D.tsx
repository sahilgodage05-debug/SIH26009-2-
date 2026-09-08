'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { 
  Play, 
  Pause,
  RotateCcw, 
  Zap, 
  Sliders, 
  ShieldCheck, 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Compass, 
  Layers, 
  Flame,
  Eye,
  Camera,
  Maximize2,
  Minimize2,
  Box,
  FastForward,
  Sparkles,
  Info
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
  mn_grade_pct?: number;
  ore_density_t_m3?: number;
  zone_type?: 'HIGH_GRADE_ORE' | 'MEDIUM_GRADE_ORE' | 'WASTE_OVERBURDEN' | string;
  charge_multiplier?: number;
}

// Helper to convert local X, Y grid coordinates into exact GPS Latitude and Longitude
const BASE_PIT_LAT = 21.8502; // Balaghat default
const BASE_PIT_LNG = 80.2274;

function convertHoleToGPS(x: number, y: number, baseLat: number = 21.8502, baseLng: number = 80.2274) {
  const lat = baseLat + (y / 111000.0);
  const lng = baseLng + (x / 103248.0);
  
  const formatDMS = (val: number, isLat: boolean) => {
    const abs = Math.abs(val);
    const d = Math.floor(abs);
    const mNotTruncated = (abs - d) * 60;
    const m = Math.floor(mNotTruncated);
    const s = ((mNotTruncated - m) * 60).toFixed(1);
    const dir = isLat ? (val >= 0 ? 'N' : 'S') : (val >= 0 ? 'E' : 'W');
    return `${d}° ${m}' ${s}" ${dir}`;
  };

  return {
    latStr: `${lat.toFixed(6)}° N`,
    lngStr: `${lng.toFixed(6)}° E`,
    dms: `${formatDMS(lat, true)}, ${formatDMS(lng, false)}`
  };
}

// -------------------------------------------------------------
// CAMERA CONTROLLER COMPONENT (SMOOTH PRESET SWITCHING)
// -------------------------------------------------------------
function CameraController({ cameraPreset }: { cameraPreset: '3d' | 'top' | 'front' | 'side' }) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (cameraPreset === 'top') {
      camera.position.set(18, 48, 10.1);
    } else if (cameraPreset === 'front') {
      camera.position.set(18, 8, 38);
    } else if (cameraPreset === 'side') {
      camera.position.set(48, 8, 10);
    } else {
      camera.position.set(25, 22, 25);
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(18, 4, 10);
      controlsRef.current.update();
    }
  }, [cameraPreset, camera]);

  return (
    <OrbitControls 
      ref={controlsRef} 
      makeDefault 
      maxPolarAngle={Math.PI / 2.01} 
      maxDistance={5000} 
      minDistance={0.5} 
    />
  );
}

// -------------------------------------------------------------
// 3D OPEN-PIT BENCH MESH & BLAST HOLES
// -------------------------------------------------------------
function BenchAndBlastGrid3D({ 
  holes, 
  benchHeight, 
  burden, 
  spacing, 
  detonatingHoles,
  showWireframe,
  showDelayBadges,
  viewMode,
  hoveredHole,
  setHoveredHole,
  showOreHeatmap = true,
  useAdaptiveDensity = true,
  baseLat = 21.8502,
  baseLng = 80.2274,
  strikeLabel = 'N65°E',
  dipLabel = '55° NW',
  srLabel = '1:4.8'
}: { 
  holes: BlastHoleData[]; 
  benchHeight: number; 
  burden: number; 
  spacing: number; 
  detonatingHoles: Set<string>;
  showWireframe: boolean;
  showDelayBadges: boolean;
  viewMode: 'solid' | 'transparent_rock' | 'explosive_only';
  hoveredHole: string | null;
  setHoveredHole: (id: string | null) => void;
  showOreHeatmap?: boolean;
  useAdaptiveDensity?: boolean;
  baseLat?: number;
  baseLng?: number;
  strikeLabel?: string;
  dipLabel?: string;
  srLabel?: string;
}) {
  const meshRef = useRef<THREE.Group>(null);

  const numRows = Math.max(...holes.map(h => h.row_index), 0) + 1;
  const numCols = Math.max(...holes.map(h => h.col_index), 0) + 1;
  
  const widthX = numCols * spacing + spacing;
  const depthY = numRows * burden + burden * 2;

  const rockOpacity = viewMode === 'transparent_rock' ? 0.35 : viewMode === 'explosive_only' ? 0.05 : 0.95;
  const isRockVisible = viewMode !== 'explosive_only';

  return (
    <group ref={meshRef} position={[-widthX / 2, 0, -depthY / 2]}>
      {/* Expansive Mine Ground Plane & Open Surface (No Black Box Boundary around Pits) */}
      {isRockVisible && (
        <>
          {/* Infinite Horizon Sub-Foundation Ground Terrain Plane */}
          <mesh position={[widthX / 2, -0.2, depthY / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[4000, 4000]} />
            <meshStandardMaterial 
              color="#0f172a" 
              roughness={0.85} 
              metalness={0.15} 
              transparent={viewMode === 'transparent_rock'}
              opacity={rockOpacity}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* Mine Operating Bench Surface Plate (Fully transparent to holes) */}
          <mesh position={[widthX / 2, benchHeight, depthY / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[widthX * 3, depthY * 3]} />
            <meshStandardMaterial 
              color="#1e293b" 
              roughness={0.7} 
              metalness={0.3} 
              transparent={viewMode === 'transparent_rock'}
              opacity={rockOpacity * 0.9}
              side={THREE.DoubleSide}
            />
          </mesh>

          {/* 3D Physical Elevation & Depth Scale Ruler along Pit Bench Wall */}
          <group position={[-widthX * 0.15, 0, depthY + 3.2]}>
            {/* Vertical Scale Pole */}
            <mesh position={[0, benchHeight / 2, 0]}>
              <cylinderGeometry args={[0.08, 0.08, benchHeight, 16]} />
              <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} />
            </mesh>
            {/* Crest Marker */}
            <Html position={[0.8, benchHeight, 0]} center distanceFactor={22}>
              <div className="bg-amber-950/90 text-amber-300 border border-amber-500/80 px-2 py-0.5 rounded text-[8px] font-mono font-bold whitespace-nowrap shadow-xl">
                ▲ Crest Elevation: +{benchHeight.toFixed(1)}m
              </div>
            </Html>
            {/* Mid-Bench Marker */}
            <Html position={[0.8, benchHeight / 2, 0]} center distanceFactor={22}>
              <div className="bg-slate-900/90 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded text-[7px] font-mono whitespace-nowrap shadow-lg">
                Mid-Face ({(benchHeight / 2).toFixed(1)}m)
              </div>
            </Html>
            {/* Pit Toe Floor Marker */}
            <Html position={[0.8, 0, 0]} center distanceFactor={22}>
              <div className="bg-cyan-950/90 text-cyan-300 border border-cyan-500/80 px-2 py-0.5 rounded text-[8px] font-mono font-bold whitespace-nowrap shadow-xl">
                ▼ Pit Toe Floor: 0.0m Subgrade
              </div>
            </Html>
          </group>

          {/* 3D High-Density Manganese Mineral Ore Vein Deposit Contour (Heatmap) */}
          {showOreHeatmap && (
            <group position={[widthX * 0.45, benchHeight + 0.04, depthY * 0.5]}>
              {/* High Grade Core Zone (Dense Mn Ore 42-48% Mn) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0, Math.max(widthX, depthY) * 0.28, 64]} />
                <meshBasicMaterial color="#d946ef" transparent opacity={0.35} side={THREE.DoubleSide} />
              </mesh>
              {/* Medium Grade Halo (30-40% Mn) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[Math.max(widthX, depthY) * 0.28, Math.max(widthX, depthY) * 0.48, 64]} />
                <meshBasicMaterial color="#06b6d4" transparent opacity={0.20} side={THREE.DoubleSide} />
              </mesh>

              {/* Economic Break-Even Stripping Ratio Cutoff Boundary Line */}
              <mesh rotation={[-Math.PI / 2, 0, Math.PI / 6]}>
                <ringGeometry args={[Math.max(widthX, depthY) * 0.52, Math.max(widthX, depthY) * 0.55, 64]} />
                <meshBasicMaterial color="#ef4444" transparent opacity={0.85} side={THREE.DoubleSide} />
              </mesh>

              {/* 3D Label Badge for Break-Even Stripping Limit */}
              <Html position={[Math.max(widthX, depthY) * 0.54, 0.4, 0]} center distanceFactor={28}>
                <div className="bg-red-950/90 text-red-300 border border-red-500/80 px-2 py-1 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-xl">
                  Break-Even Cutoff Limit (SR = {srLabel}) • Pit Limit
                </div>
              </Html>

              {/* Geological Strike Lineament Vector */}
              <Html position={[-Math.max(widthX, depthY) * 0.4, 0.3, -Math.max(widthX, depthY) * 0.2]} center distanceFactor={28}>
                <div className="bg-emerald-950/90 text-emerald-300 border border-emerald-500/80 px-2 py-0.5 rounded text-[8px] font-mono font-bold whitespace-nowrap shadow-xl flex items-center gap-1">
                  <span>Geological Strike: {strikeLabel} (Dip {dipLabel})</span>
                </div>
              </Html>
            </group>
          )}
        </>
      )}

      {/* Expansive Geospatial Grid Overlay across Mining Terrain */}
      {showWireframe && (
        <>
          <gridHelper 
            args={[4000, 200, '#059669', '#1e293b']} 
            position={[widthX / 2, -0.15, depthY / 2]} 
          />
          <gridHelper 
            args={[Math.max(widthX, depthY) * 3, 30, '#10b981', '#334155']} 
            position={[widthX / 2, benchHeight + 0.05, depthY / 2]} 
          />
        </>
      )}

      {/* 3D Blast Holes */}
      {holes.map((hole) => {
        const isDetonating = detonatingHoles.has(hole.hole_id);
        const isHovered = hoveredHole === hole.hole_id;
        const stemmingLength = hole.stemming_top_z - hole.stemming_bottom_z;
        const chargeLength = hole.charge_top_z - hole.charge_bottom_z;
        const gps = convertHoleToGPS(hole.x, hole.y, baseLat, baseLng);

        // Grade-based Color Coding
        const mnGrade = hole.mn_grade_pct || 32.0;
        const zone = hole.zone_type || (mnGrade >= 40 ? 'HIGH_GRADE_ORE' : mnGrade >= 28 ? 'MEDIUM_GRADE_ORE' : 'WASTE_OVERBURDEN');
        
        let collarColor = '#10b981'; // default emerald
        let collarGlow = '#059669';
        if (zone === 'HIGH_GRADE_ORE' || mnGrade >= 40) {
          collarColor = '#d946ef'; // Magenta Purple for High Grade Mn Ore
          collarGlow = '#c084fc';
        } else if (zone === 'MEDIUM_GRADE_ORE' || mnGrade >= 28) {
          collarColor = '#06b6d4'; // Cyan for Medium Grade
          collarGlow = '#38bdf8';
        } else {
          collarColor = '#64748b'; // Slate Gray for Waste Overburden
          collarGlow = '#475569';
        }

        return (
          <group 
            key={hole.hole_id} 
            position={[hole.x + spacing / 2, 0, hole.y + burden]}
            onPointerOver={(e) => { e.stopPropagation(); setHoveredHole(hole.hole_id); }}
            onPointerOut={() => setHoveredHole(null)}
          >
            {/* Detonation Shockwave Ring Animation */}
            {isDetonating && (
              <mesh position={[0, benchHeight + 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.2, 3.2, 32]} />
                <meshBasicMaterial color="#f59e0b" transparent opacity={0.9} side={THREE.DoubleSide} />
              </mesh>
            )}

            {/* Stemming Top Column (Crushed Gravel / Gold) */}
            <mesh position={[0, benchHeight - stemmingLength / 2, 0]}>
              <cylinderGeometry args={[0.26, 0.26, stemmingLength, 16]} />
              <meshStandardMaterial 
                color={isDetonating ? '#ef4444' : isHovered ? '#facc15' : (zone === 'HIGH_GRADE_ORE' ? '#e879f9' : '#eab308')} 
                roughness={0.4} 
              />
            </mesh>

            {/* Explosive Emulsion Charge Column (Orange/Red) */}
            <mesh position={[0, (hole.charge_top_z + hole.charge_bottom_z) / 2, 0]}>
              <cylinderGeometry args={[0.24, 0.24, Math.max(0.5, chargeLength), 16]} />
              <meshStandardMaterial 
                color={isDetonating ? '#ff0000' : isHovered ? '#fb923c' : (zone === 'HIGH_GRADE_ORE' ? '#c084fc' : '#f97316')} 
                emissive={isDetonating ? '#ff4500' : isHovered ? '#ea580c' : (zone === 'HIGH_GRADE_ORE' ? '#a855f7' : '#000000')}
                emissiveIntensity={isDetonating ? 3.0 : isHovered ? 1.0 : (zone === 'HIGH_GRADE_ORE' ? 0.6 : 0)}
                roughness={0.3} 
              />
            </mesh>

            {/* Drillhole Surface Marker Collar (Color Coded by Mn Grade Density) */}
            <mesh position={[0, benchHeight + 0.1, 0]}>
              <cylinderGeometry args={[0.42, 0.42, 0.15, 16]} />
              <meshStandardMaterial color={isDetonating ? '#f59e0b' : isHovered ? '#34d399' : collarColor} />
            </mesh>

            {/* Hole Delay MS & GPS Location Badge in 3D Space */}
            {showDelayBadges && (
              <Html position={[0, benchHeight + 1.3, 0]} center distanceFactor={24}>
                <div className={`px-2 py-1 rounded-lg text-[9px] font-mono font-bold whitespace-nowrap shadow-xl border transition-all ${
                  isDetonating 
                    ? 'bg-red-500 text-slate-900 border-red-400 animate-ping' 
                    : isHovered
                      ? 'bg-purple-950 text-purple-300 border-purple-400 scale-125 z-50 shadow-purple-900/50'
                      : zone === 'HIGH_GRADE_ORE'
                        ? 'bg-purple-950/90 text-purple-300 border-purple-600/70'
                        : 'bg-slate-900/90 text-emerald-400 border-slate-700'
                }`}>
                  {isHovered ? (
                    <div className="flex flex-col items-center">
                      <span className="text-white font-bold">{hole.hole_id}</span>
                      <span className="text-purple-300 text-[8px]">{mnGrade.toFixed(1)}% Mn ({hole.ore_density_t_m3} t/m³)</span>
                      <span className="text-cyan-300 text-[8px]">{gps.latStr}, {gps.lngStr}</span>
                    </div>
                  ) : (
                    <span>{hole.delay_ms}ms</span>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

// -------------------------------------------------------------
// MAIN 3D BLASTING STUDIO COMPONENT
// -------------------------------------------------------------
export function BlastingPitStudio3D({ mineId, zone }: { mineId?: string; zone?: any }) {
  const baseLat = zone?.coordinates ? zone.coordinates[0] : 21.8502;
  const baseLng = zone?.coordinates ? zone.coordinates[1] : 80.2274;
  const mineName = zone?.name || (mineId ? mineId.replace('zone-', '').toUpperCase() + ' Mine' : 'MOIL Manganese Pit');

  // Input parameters
  const [holeDiameter, setHoleDiameter] = useState<number>(150);
  const [burden, setBurden] = useState<number>(4.2);
  const [spacing, setSpacing] = useState<number>(5.0);
  const [benchHeight, setBenchHeight] = useState<number>(10.0);
  const [powderFactor, setPowderFactor] = useState<number>(0.55);
  const [rmrRating, setRmrRating] = useState<number>(zone?.indicators?.densityAnomaly ? 72 : 65);

  // Backend response state
  const [loading, setLoading] = useState<boolean>(false);
  const [results, setResults] = useState<any>(null);

  // Simulation controls
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [detonatingHoles, setDetonatingHoles] = useState<Set<string>>(new Set());
  const [simSpeed, setSimSpeed] = useState<number>(1.0); // 0.5x, 1x, 2x

  // View & Render Display Settings
  const [cameraPreset, setCameraPreset] = useState<'3d' | 'top' | 'front' | 'side'>('3d');
  const [viewMode, setViewMode] = useState<'solid' | 'transparent_rock' | 'explosive_only'>('solid');
  const [showWireframe, setShowWireframe] = useState<boolean>(true);
  const [showDelayBadges, setShowDelayBadges] = useState<boolean>(true);
  const [useAdaptiveDensity, setUseAdaptiveDensity] = useState<boolean>(true);
  const [showOreHeatmap, setShowOreHeatmap] = useState<boolean>(true);
  const [isExpandedHeight, setIsExpandedHeight] = useState<boolean>(false);
  const [hoveredHole, setHoveredHole] = useState<string | null>(null);

  // Fetch optimization API from backend
  const fetchBlastingOptimization = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/blasting/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mine_id: mineId || 'zone-balaghat',
          lat: baseLat,
          lng: baseLng,
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
          distance_to_structure_m: 250.0,
          use_adaptive_density: useAdaptiveDensity
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
    // Mine-specific satellite & geotechnical preset profile sync (all 11 MOIL mines)
    if (mineId === 'zone-balaghat') {
      setBenchHeight(18.0); setBurden(3.8); setSpacing(4.2); setPowderFactor(0.75); setRmrRating(78); setHoleDiameter(165);
    } else if (mineId === 'zone-dongri-buzurg') {
      setBenchHeight(10.0); setBurden(4.2); setSpacing(5.0); setPowderFactor(0.55); setRmrRating(65); setHoleDiameter(150);
    } else if (mineId === 'zone-mansar') {
      setBenchHeight(8.0); setBurden(4.8); setSpacing(5.5); setPowderFactor(0.45); setRmrRating(58); setHoleDiameter(125);
    } else if (mineId === 'zone-chikla') {
      setBenchHeight(12.0); setBurden(4.0); setSpacing(4.6); setPowderFactor(0.62); setRmrRating(68); setHoleDiameter(150);
    } else if (mineId === 'zone-kandri') {
      setBenchHeight(14.0); setBurden(4.5); setSpacing(5.2); setPowderFactor(0.58); setRmrRating(62); setHoleDiameter(140);
    } else if (mineId === 'zone-ukwa') {
      setBenchHeight(16.0); setBurden(4.0); setSpacing(4.4); setPowderFactor(0.70); setRmrRating(74); setHoleDiameter(160);
    } else if (mineId === 'zone-sitapatore') {
      setBenchHeight(7.5); setBurden(5.0); setSpacing(6.0); setPowderFactor(0.38); setRmrRating(54); setHoleDiameter(115);
    } else if (mineId === 'zone-gumgaon') {
      setBenchHeight(9.5); setBurden(4.4); setSpacing(5.1); setPowderFactor(0.50); setRmrRating(60); setHoleDiameter(130);
    } else if (mineId === 'zone-tirodi') {
      setBenchHeight(11.0); setBurden(4.2); setSpacing(4.8); setPowderFactor(0.58); setRmrRating(66); setHoleDiameter(145);
    } else if (mineId === 'zone-parsoda') {
      setBenchHeight(8.5); setBurden(4.6); setSpacing(5.4); setPowderFactor(0.42); setRmrRating(56); setHoleDiameter(120);
    } else if (mineId === 'zone-ramtek') {
      setBenchHeight(9.0); setBurden(4.5); setSpacing(5.2); setPowderFactor(0.48); setRmrRating(61); setHoleDiameter(125);
    }
  }, [mineId]);

  useEffect(() => {
    fetchBlastingOptimization();
  }, [mineId, baseLat, baseLng, holeDiameter, burden, spacing, benchHeight, powderFactor, rmrRating, useAdaptiveDensity]);

  // Detonation Animation Trigger
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const clearSimTimeouts = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
  };

  const handleStartSimulation = () => {
    if (!results?.blast_pattern_3d?.holes) return;
    clearSimTimeouts();
    setIsSimulating(true);
    setDetonatingHoles(new Set());

    const holes: BlastHoleData[] = results.blast_pattern_3d.holes;
    const sortedDelays = Array.from(new Set(holes.map(h => h.delay_ms))).sort((a, b) => a - b);

    const speedMultiplier = 8.0 / simSpeed;

    sortedDelays.forEach((delay, idx) => {
      const t = setTimeout(() => {
        const active = new Set(holes.filter(h => h.delay_ms === delay).map(h => h.hole_id));
        setDetonatingHoles(active);

        if (idx === sortedDelays.length - 1) {
          const tEnd = setTimeout(() => {
            setDetonatingHoles(new Set());
            setIsSimulating(false);
          }, 600 / simSpeed);
          timeoutsRef.current.push(tEnd);
        }
      }, delay * speedMultiplier);
      timeoutsRef.current.push(t);
    });
  };

  const handleStopSimulation = () => {
    clearSimTimeouts();
    setDetonatingHoles(new Set());
    setIsSimulating(false);
  };

  const holes: BlastHoleData[] = results?.blast_pattern_3d?.holes || [];
  const kuzRam = results?.fragmentation_kuz_ram;
  const vibration = results?.vibration_ppv;
  const satProfile = results?.mine_satellite_profile;
  const geoCtx = results?.mine_geological_context;
  const hoveredData = holes.find(h => h.hole_id === hoveredHole);
  const hoveredGPS = hoveredData ? convertHoleToGPS(hoveredData.x, hoveredData.y, baseLat, baseLng) : null;

  // Find the highest grade hole to suggest digging coordinates
  const highestGradeHole = holes.length > 0 ? [...holes].sort((a, b) => (b.mn_grade_pct || 0) - (a.mn_grade_pct || 0))[0] : null;
  const bestDigGPS = highestGradeHole ? convertHoleToGPS(highestGradeHole.x, highestGradeHole.y, baseLat, baseLng) : null;

  return (
    <div className="w-full bg-slate-100/95 border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-6 text-slate-100 backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest mb-1">
            <Flame className="w-4 h-4" />
            <span>Geotechnical &amp; Satellite Parameter Studio • {mineName}</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            3D Blast Pattern &amp; Ore Body Model: {mineName}
          </h2>
          <p className="text-xs text-slate-400">
            Synthesized from Copernicus Sentinel-2 SWIR Pyrolusite index ({satProfile?.sentinel2_swir || '2.5'}), Sentinel-1 SAR dielectric density ({satProfile?.sentinel1_sar_db || '-12.5'} dB), Kuz-Ram fragmentation, and exact GPS collar coordinates ({baseLat.toFixed(4)}° N, {baseLng.toFixed(4)}° E).
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {isSimulating ? (
            <button
              onClick={handleStopSimulation}
              className="px-4 py-2 rounded-xl font-bold text-xs bg-rose-600 hover:bg-rose-500 text-slate-900 flex items-center gap-2 shadow-lg transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              <span>Pause Blast</span>
            </button>
          ) : (
            <button
              onClick={handleStartSimulation}
              disabled={loading || holes.length === 0}
              className="px-5 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-slate-900 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Simulate Detonation Sequence</span>
            </button>
          )}

          <button
            onClick={() => fetchBlastingOptimization()}
            className="p-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 transition-colors"
            title="Reset Optimization Params"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Workspace Grid: Controls + 3D WebGL Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Parameters (4 cols) */}
        <div className="lg:col-span-4 bg-slate-50/80 border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
              <Sliders className="w-4 h-4" />
              <span>Blast Design Parameters</span>
            </div>
            {loading && <span className="text-[10px] text-amber-400 font-mono animate-pulse">Calculating...</span>}
          </div>

          {/* Slider 1: Hole Diameter */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Drillhole Diameter (D):</span>
              <span className="text-emerald-400 font-mono">{holeDiameter} mm</span>
            </div>
            <input 
              type="range" min="85" max="250" step="5"
              value={holeDiameter}
              onChange={(e) => setHoleDiameter(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 2: Burden */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Burden Distance (B):</span>
              <span className="text-amber-400 font-mono">{burden} m</span>
            </div>
            <input 
              type="range" min="2.0" max="8.0" step="0.1"
              value={burden}
              onChange={(e) => setBurden(parseFloat(e.target.value))}
              className="w-full accent-amber-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 3: Spacing */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Hole Spacing (S):</span>
              <span className="text-cyan-400 font-mono">{spacing} m</span>
            </div>
            <input 
              type="range" min="2.5" max="10.0" step="0.1"
              value={spacing}
              onChange={(e) => setSpacing(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 4: Bench Height */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Bench Height (H):</span>
              <span className="text-purple-400 font-mono">{benchHeight} m</span>
            </div>
            <input 
              type="range" min="5.0" max="20.0" step="0.5"
              value={benchHeight}
              onChange={(e) => setBenchHeight(parseFloat(e.target.value))}
              className="w-full accent-purple-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 5: Powder Factor */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Powder Factor (q):</span>
              <span className="text-red-400 font-mono">{powderFactor} kg/m³</span>
            </div>
            <input 
              type="range" min="0.25" max="1.2" step="0.02"
              value={powderFactor}
              onChange={(e) => setPowderFactor(parseFloat(e.target.value))}
              className="w-full accent-red-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slider 6: Rock Mass Rating */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700">Rock Mass Rating (RMR):</span>
              <span className="text-emerald-400 font-mono">{rmrRating} (Medium-Hard)</span>
            </div>
            <input 
              type="range" min="30" max="95" step="1"
              value={rmrRating}
              onChange={(e) => setRmrRating(parseInt(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* Center Column: 3D WebGL Canvas + View Controls Overlay (8 cols) */}
        <div className={`lg:col-span-8 bg-white border border-slate-200 rounded-xl relative overflow-hidden transition-all duration-300 ${
          isExpandedHeight ? 'h-[650px]' : 'h-[480px]'
        }`}>
          
          {/* Top Bar Overlay: Legend + Camera View Presets + Viewport Expand */}
          <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            
            <div className="flex flex-col gap-2">
              {/* Target Digging Prediction Overlay */}
              {bestDigGPS && highestGradeHole && (
                <div className="pointer-events-auto bg-fuchsia-950/95 backdrop-blur border border-fuchsia-500 rounded-xl p-3 shadow-2xl animate-pulse ring-2 ring-fuchsia-400/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span className="text-[11px] font-bold text-white tracking-widest uppercase">Target Excavation Coordinate</span>
                  </div>
                  <div className="text-[10px] text-fuchsia-200 mb-1">Predictive Peak Grade: <strong>{highestGradeHole.mn_grade_pct?.toFixed(1)}% Mn</strong></div>
                  <div className="font-mono text-xs text-amber-300 font-bold bg-fuchsia-900/50 p-1.5 rounded border border-fuchsia-700">
                    <div>{bestDigGPS.latStr}, {bestDigGPS.lngStr}</div>
                    <div className="text-[10px] text-fuchsia-300 mt-0.5">{bestDigGPS.dms}</div>
                  </div>
                  <div className="text-[9px] text-slate-300 mt-1">Dig here for highest manganese reserve.</div>
                </div>
              )}
              
              {/* Legend Overlay: Ore Grade & Drillhole Density */}
              <div className="pointer-events-auto bg-slate-900/95 backdrop-blur border border-slate-800 rounded-xl p-2.5 text-[11px] space-y-1.5 shadow-xl">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-1">
                Mn Ore Mineral Density Legend
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span>Drillhole Collar</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-magenta-400 bg-fuchsia-500 ring-2 ring-fuchsia-400/50" />
                <span>High-Grade Mn Ore (&ge;40% Mn, Dense Drilling)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Medium-Grade Mn Ore (28-39% Mn)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                <span>Waste Overburden (&lt;28% Mn, Sparse Grid)</span>
              </div>
            </div>
          </div>

            {/* Camera View Presets Bar + AI Adaptive Density Toggle */}
            <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/95 backdrop-blur p-1 rounded-xl border border-slate-800 shadow-xl text-xs font-mono">
              
              {/* AI Ore-Density Adaptive Grid Toggle Button */}
              <button
                onClick={() => setUseAdaptiveDensity(!useAdaptiveDensity)}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 font-bold transition-all ${
                  useAdaptiveDensity 
                    ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-950 border border-purple-400/50' 
                    : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
                title="Toggle AI Mineral-Density Adaptive Drilling Grid (High Density over High-Grade Ore)"
              >
                <Sparkles className={`w-3.5 h-3.5 ${useAdaptiveDensity ? 'text-yellow-300 animate-spin' : ''}`} />
                <span>{useAdaptiveDensity ? 'AI Ore-Density Grid: ON' : 'Uniform Grid'}</span>
              </button>

              <div className="w-px h-4 bg-slate-800 mx-1" />
              <button
                onClick={() => setCameraPreset('3d')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  cameraPreset === '3d' ? 'bg-emerald-600 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="3D Isometric View"
              >
                <Box className="w-3.5 h-3.5" />
                <span>3D</span>
              </button>
              <button
                onClick={() => setCameraPreset('top')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  cameraPreset === 'top' ? 'bg-cyan-600 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Top Overhead Plan View"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Top</span>
              </button>
              <button
                onClick={() => setCameraPreset('front')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  cameraPreset === 'front' ? 'bg-purple-600 text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bench Face Front View"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Face</span>
              </button>

              <div className="w-px h-4 bg-slate-200 mx-1" />

              {/* Viewport Resize Toggle */}
              <button
                onClick={() => setIsExpandedHeight(!isExpandedHeight)}
                className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-200 transition-colors"
                title={isExpandedHeight ? 'Minimize Canvas' : 'Expand Viewport'}
              >
                {isExpandedHeight ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Bottom Bar Overlay: GPS Hover Tooltip & Render Display Toggles */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            
            {/* GPS Location & Mn Ore Grade Hover Badge */}
            <div className="pointer-events-auto">
              {hoveredData && hoveredGPS ? (
                <div className="bg-slate-900/95 border border-purple-500/50 rounded-xl px-3.5 py-2 text-xs text-white shadow-2xl backdrop-blur-md flex items-center gap-3 font-mono animate-in fade-in">
                  <Info className="w-4 h-4 text-fuchsia-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-fuchsia-400">{hoveredData.hole_id}</span>
                      <span className="text-[10px] bg-purple-950 px-1.5 py-0.5 rounded border border-purple-800 text-purple-300 font-bold">
                        {hoveredData.mn_grade_pct ? `${hoveredData.mn_grade_pct}% Mn` : 'Ore Zone'}
                      </span>
                      <span className="text-[10px] text-slate-400">({hoveredData.x}m, {hoveredData.y}m, {hoveredData.z_top}m)</span>
                    </div>
                    <div className="text-[11px] text-cyan-300">
                      <span>GPS: </span>
                      <strong>{hoveredGPS.latStr}, {hoveredGPS.lngStr}</strong>
                      <span className="text-amber-400 ml-2">[{hoveredGPS.dms}]</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-3 py-1.5 text-[11px] text-slate-300 backdrop-blur font-mono flex items-center gap-2">
                  <Compass className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hover over blast holes to inspect exact GPS, Mn Grade % &amp; Ore Density</span>
                </div>
              )}
            </div>

            {/* Display Mode Toggles */}
            <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-50/90 backdrop-blur p-1 rounded-xl border border-slate-200 shadow-xl text-xs">
              
              {/* Toggle Mn Ore Heatmap */}
              <button
                onClick={() => setShowOreHeatmap(!showOreHeatmap)}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono transition-all ${
                  showOreHeatmap ? 'bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/40' : 'text-slate-500'
                }`}
                title="Toggle 3D Ore Vein Deposit Heatmap Layer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>{showOreHeatmap ? 'Mn Heatmap ON' : 'Heatmap OFF'}</span>
              </button>

              {/* Rock Transparency Mode */}
              <button
                onClick={() => setViewMode(v => v === 'solid' ? 'transparent_rock' : v === 'transparent_rock' ? 'explosive_only' : 'solid')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 font-mono transition-all ${
                  viewMode !== 'solid' ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Toggle Rock Opacity (See Underground Charge)"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{viewMode === 'solid' ? 'Solid' : viewMode === 'transparent_rock' ? 'Translucent' : 'Charge Only'}</span>
              </button>

              {/* Speed Multiplier */}
              <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-[10px] font-mono">
                <FastForward className="w-3 h-3 text-slate-600" />
                {[0.5, 1.0, 2.0].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded transition-all ${
                      simSpeed === spd ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Show Wireframe */}
              <button
                onClick={() => setShowWireframe(!showWireframe)}
                className={`p-1.5 rounded-lg transition-colors ${showWireframe ? 'text-emerald-400 bg-slate-200' : 'text-slate-500'}`}
                title="Toggle Grid Wireframe"
              >
                <Layers className="w-4 h-4" />
              </button>

              {/* Show Badges */}
              <button
                onClick={() => setShowDelayBadges(!showDelayBadges)}
                className={`p-1.5 rounded-lg transition-colors ${showDelayBadges ? 'text-cyan-400 bg-slate-200' : 'text-slate-500'}`}
                title="Toggle Delay MS Badges"
              >
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

          </div>

          {/* 3D WebGL Canvas */}
          <Canvas camera={{ position: [25, 20, 25], fov: 45, near: 0.1, far: 100000 }}>
            <color attach="background" args={['#090d16']} />
            <ambientLight intensity={0.85} />
            <directionalLight position={[20, 35, 15]} intensity={1.3} castShadow />
            
            <CameraController cameraPreset={cameraPreset} />

            <BenchAndBlastGrid3D
              holes={holes}
              benchHeight={benchHeight}
              burden={burden}
              spacing={spacing}
              detonatingHoles={detonatingHoles}
              showWireframe={showWireframe}
              showDelayBadges={showDelayBadges}
              viewMode={viewMode}
              hoveredHole={hoveredHole}
              setHoveredHole={setHoveredHole}
              showOreHeatmap={showOreHeatmap}
              useAdaptiveDensity={useAdaptiveDensity}
              baseLat={baseLat}
              baseLng={baseLng}
              strikeLabel={geoCtx?.strike || 'N65°E'}
              dipLabel={geoCtx?.dip || '55° NW'}
              srLabel={geoCtx?.overburden_ratio || '1:4.8'}
            />
          </Canvas>
        </div>

      </div>

      {/* Bottom KPI Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2">
        {/* Card 1: P80 Passing Fragment Size */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Kuz-Ram P80 Size</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {kuzRam ? `${kuzRam.p80_passing_size_mm} mm` : '---'}
          </div>
          <p className="text-[10px] text-emerald-400">
            Target Crusher Feed &le; 250mm
          </p>
        </div>

        {/* Card 2: Effective Powder Factor */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Powder Factor &amp; Charge</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {kuzRam ? `${kuzRam.powder_factor_kg_m3} kg/m³` : '---'}
          </div>
          <p className="text-[10px] text-amber-400">
            {kuzRam ? `${kuzRam.explosive_mass_per_hole_kg} kg/hole` : '---'}
          </p>
        </div>

        {/* Card 3: USBM PPV Ground Vibration */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>PPV Ground Vibration</span>
            <ShieldCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {vibration ? `${vibration.peak_particle_velocity_ppv_mm_s} mm/s` : '---'}
          </div>
          <p className="text-[10px] text-purple-400 truncate">
            {vibration ? vibration.dgms_safety_status : '---'}
          </p>
        </div>

        {/* Card 4: Economic Stripping Ratio & Geology (Mine-Specific) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Stripping Ratio &amp; Dip</span>
            <Compass className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300">
            {geoCtx?.overburden_ratio || '1:2.8'} <span className="text-xs font-normal text-slate-400">(Mn {geoCtx?.mn_grade_pct || 44}%)</span>
          </div>
          <p className="text-[10px] text-cyan-400 truncate">
            Strike {geoCtx?.strike || 'N65°E'} • Dip {geoCtx?.dip || '55° NW'}
          </p>
        </div>

        {/* Card 5: Comminution Crushing Savings */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Crushing Energy Savings</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {kuzRam ? `+$${kuzRam.net_crushing_savings_per_t}/t` : '---'}
          </div>
          <p className="text-[10px] text-slate-400">
            {kuzRam ? `Base: $${kuzRam.comminution_crushing_cost_per_t}/t` : '---'}
          </p>
        </div>
      </div>
    </div>
  );
}
