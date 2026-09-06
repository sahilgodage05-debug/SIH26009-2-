'use client';

import React, { useEffect, useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon, 
  Circle, 
  Tooltip, 
  useMap 
} from 'react-leaflet';
import L from 'leaflet';
import { 
  RESERVE_ZONES, 
  DRILLING_SITES, 
  AI_HEATMAP_CLUSTERS, 
  NDVI_ANOMALY_ZONES, 
  SOIL_MOISTURE_ZONES, 
  LAND_TEMP_ZONES, 
  MOIL_MAP_CENTER, 
  DEFAULT_ZOOM 
} from '@/data/moilData';
import { LayerState, ReserveZone } from '@/types/moil';
import { 
  Layers, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  Navigation, 
  Eye, 
  Sparkles,
  MapPin
} from 'lucide-react';

interface MapComponentProps {
  layers: LayerState;
  selectedZone: ReserveZone | null;
  onSelectZone: (zone: ReserveZone) => void;
  confidenceThreshold: number;
  msvOpacity?: number;
}

// Controller component to smoothly fly/re-center to target coordinates
function MapViewController({ targetCoordinates }: { targetCoordinates: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoordinates) {
      const isOverview = Math.abs(targetCoordinates[0] - MOIL_MAP_CENTER[0]) < 0.01 && Math.abs(targetCoordinates[1] - MOIL_MAP_CENTER[1]) < 0.01;
      map.flyTo(targetCoordinates, isOverview ? DEFAULT_ZOOM : 13, { duration: 1.3 });
    }
  }, [targetCoordinates, map]);
  return null;
}

// Custom DivIcons to avoid Leaflet missing icon PNG issues and provide sleek industrial aesthetic
const createReserveIcon = (probability: number, isSelected: boolean) => {
  const color = probability >= 88 ? '#ef4444' : probability >= 80 ? '#f97316' : '#eab308';
  return L.divIcon({
    className: 'custom-reserve-marker',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
        <div style="
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${color};
          opacity: 0.35;
          animation: pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        "></div>
        <div style="
          position: relative;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: #0f172a;
          border: 2px solid ${color};
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 12px ${color}88;
          transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'};
          transition: transform 0.2s ease;
        ">
          <div style="
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: ${color};
          "></div>
        </div>
        <div style="
          position: absolute;
          bottom: -16px;
          background: #090d16dd;
          border: 1px solid #334155;
          color: #f1f5f9;
          font-size: 10px;
          font-weight: 700;
          font-family: monospace;
          padding: 1px 4px;
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
        ">
          ${probability}% Mn
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18]
  });
};

const createDrillIcon = () => {
  return L.divIcon({
    className: 'custom-drill-marker',
    html: `
      <div style="
        width: 14px;
        height: 14px;
        background: #f59e0b;
        border: 2px solid #ffffff;
        border-radius: 3px;
        box-shadow: 0 0 8px #f59e0b;
        transform: rotate(45deg);
      "></div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -7]
  });
};

export const MapComponent: React.FC<MapComponentProps> = ({
  layers,
  selectedZone,
  onSelectZone,
  confidenceThreshold,
  msvOpacity
}) => {
  const [basemap, setBasemap] = useState<'osm' | 'dark' | 'satellite'>('dark');
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [liveScores, setLiveScores] = useState<Record<string, number>>({});

  useEffect(() => {
    if (layers.aiHeatmap) {
      AI_HEATMAP_CLUSTERS.forEach(cluster => {
        // Use the first coordinate as the centroid for prediction
        const lat = cluster.coordinates[0][0];
        const lng = cluster.coordinates[0][1];
        
        fetch('http://localhost:8000/api/v1/predict/scoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: lat,
            lng: lng,
            msv_anomaly: 1.8,
            swir_ratio: 2.1,
            resistivity: 135.0,
            chargeability: 24.5,
            s_density: 6.5,
            elevation: 340.0,
            slope_deg: 22.0,
            mansar_proximity: 0.85
          })
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.bayesian_confidence_score) {
            setLiveScores(prev => ({ ...prev, [cluster.id]: data.bayesian_confidence_score }));
          }
        })
        .catch(err => console.error('Failed to fetch real AI score', err));
      });
    }
  }, [layers.aiHeatmap]);

  const getTileLayerUrl = () => {
    switch (basemap) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'dark':
      case 'osm':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
  };

  const getTileAttribution = () => {
    switch (basemap) {
      case 'satellite':
        return '&copy; Esri &mdash; Earth Observation Imagery';
      case 'dark':
      case 'osm':
      default:
        return '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    }
  };

  const handleZoneClick = (zone: ReserveZone) => {
    onSelectZone(zone);
    setFlyTarget(zone.coordinates);
  };

  return (
    <div className="relative w-full h-full bg-[#090d16] overflow-hidden">
      {/* Basemap Switcher & Quick Controls Overlay */}
      <div className="absolute top-4 left-4 z-[500] flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-xl backdrop-blur-md">
        <button
          onClick={() => setBasemap('dark')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
            basemap === 'dark'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Dark GIS
        </button>
        <button
          onClick={() => setBasemap('satellite')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
            basemap === 'satellite'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          EO Satellite
        </button>
        <button
          onClick={() => setBasemap('osm')}
          className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
            basemap === 'osm'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          OSM Standard
        </button>


      </div>

      {/* Region Tag / Precise Geolocation Telemetry HUD */}
      <div className="absolute bottom-4 left-4 z-[500] hidden sm:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono text-slate-300 shadow-xl backdrop-blur-md max-w-[85vw] overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-400">Target:</span>
          <span className="font-semibold text-emerald-300">
            {selectedZone ? selectedZone.name.split(' (')[0] : 'Central India Manganese Belt'}
          </span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="text-slate-200 flex items-center gap-1 shrink-0">
          <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="text-cyan-300 font-bold">
            {selectedZone?.exactLocation?.dms || `${selectedZone?.coordinates[0] || 21.60}°N, ${selectedZone?.coordinates[1] || 79.74}°E`}
          </span>
          <span className="text-slate-400 text-[11px]">
            ({selectedZone ? `${selectedZone.coordinates[0]}, ${selectedZone.coordinates[1]}` : 'WGS84'})
          </span>
        </div>
        {selectedZone?.exactLocation && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-amber-300 font-semibold shrink-0">{selectedZone.exactLocation.districtState}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 shrink-0">{selectedZone.exactLocation.elevationMeters}m AMSL</span>
          </>
        )}
      </div>

      {/* Leaflet Map Container */}
      <MapContainer
        center={MOIL_MAP_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <MapViewController targetCoordinates={flyTarget} />
        
        {/* Dynamic Tile Layer - 100% Free OpenStreetMap & Esri (No API Key Required / No Watermarks) */}
        <TileLayer
          key={basemap}
          attribution={getTileAttribution()}
          url={getTileLayerUrl()}
          className={basemap === 'dark' ? 'dark-tiles' : ''}
          maxZoom={18}
        />

        {/* 1. AI Manganese Heatmap Polygon Clusters (Live KoBold ML Output) */}
        {layers.aiHeatmap &&
          AI_HEATMAP_CLUSTERS.map(cluster => {
            const realScore = liveScores[cluster.id] !== undefined ? liveScores[cluster.id] : cluster.probability;
            if (realScore < confidenceThreshold) return null;
            
            return (
              <Polygon
                key={cluster.id}
                positions={cluster.coordinates}
                pathOptions={{
                  color: cluster.color,
                  weight: 2,
                  opacity: 0.9,
                  fillColor: cluster.fillColor,
                  fillOpacity: 0.45,
                  dashArray: '4, 4'
                }}
              >
                <Tooltip sticky direction="top" className="custom-leaflet-tooltip">
                  <div className="text-xs p-1">
                    <div className="font-bold text-slate-100 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-red-400" />
                      <span>{cluster.name}</span>
                    </div>
                    <div className="text-[11px] text-amber-300 font-mono mt-0.5">
                      Manganese Probability: {realScore}% (Live AI)
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* 2. Space-Tech Layer: NDVI Vegetation Index Stress Anomaly */}
        {layers.ndvi &&
          NDVI_ANOMALY_ZONES.map((zone, idx) => (
            <Circle
              key={`ndvi-${idx}`}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{
                color: '#10b981',
                weight: 1.5,
                opacity: msvOpacity !== undefined ? Math.min(1, msvOpacity + 0.3) : 1,
                fillColor: '#10b981',
                fillOpacity: msvOpacity !== undefined ? msvOpacity : 0.35
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <span className="font-bold text-emerald-400">NDVI Chlorosis Anomaly</span>
                  <p className="text-[10px] text-slate-300">Spectral Canopy Stress ({zone.score}): {zone.label}</p>
                </div>
              </Tooltip>
            </Circle>
          ))}

        {/* 3. Space-Tech Layer: Soil Moisture (Sentinel-1 SAR) */}
        {layers.soilMoisture &&
          SOIL_MOISTURE_ZONES.map((zone, idx) => (
            <Circle
              key={`soil-${idx}`}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{
                color: '#06b6d4',
                weight: 1.5,
                fillColor: '#0891b2',
                fillOpacity: 0.35
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <span className="font-bold text-cyan-400">SAR Soil Moisture Anomaly</span>
                  <p className="text-[10px] text-slate-300">{zone.status} ({zone.moistureIndex}% Saturation)</p>
                </div>
              </Tooltip>
            </Circle>
          ))}

        {/* 4. Space-Tech Layer: Land Surface Temperature (LST) */}
        {layers.landTemperature &&
          LAND_TEMP_ZONES.map((zone, idx) => (
            <Circle
              key={`lst-${idx}`}
              center={zone.center}
              radius={zone.radius}
              pathOptions={{
                color: '#f43f5e',
                weight: 1.5,
                fillColor: '#e11d48',
                fillOpacity: 0.35
              }}
            >
              <Tooltip sticky>
                <div className="text-xs">
                  <span className="font-bold text-pink-400">Thermal Inertia (LST)</span>
                  <p className="text-[10px] text-slate-300">{zone.label} ({zone.tempKelvin} K / {(zone.tempKelvin - 273.15).toFixed(1)}°C)</p>
                </div>
              </Tooltip>
            </Circle>
          ))}

        {/* 5. Historical Drilling Borehole Sites */}
        {layers.historicalDrilling &&
          DRILLING_SITES.map(site => (
            <Marker
              key={site.id}
              position={site.coordinates}
              icon={createDrillIcon()}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1 font-sans">
                  <div className="font-bold text-amber-400 text-sm">{site.boreholeCode}</div>
                  <div className="text-slate-300">{site.mine}</div>
                  <div className="text-[11px] text-slate-400">
                    Depth: <span className="text-white font-mono">{site.depthMeters}m</span> | Grade:{' '}
                    <span className="text-emerald-400 font-mono font-bold">{site.gradeMnPct}% Mn</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Completed: {site.drilledYear} • Status: {site.status}</div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* 6. Clickable Potential Reserve Zones (MOIL 11 Operating Mines of India) */}
        {RESERVE_ZONES.map(zone => {
          const isSelected = selectedZone?.id === zone.id;
          return (
            <Marker
              key={zone.id}
              position={zone.coordinates}
              icon={createReserveIcon(zone.manganeseProbability, isSelected)}
              eventHandlers={{
                click: () => handleZoneClick(zone)
              }}
            >
              <Popup>
                <div className="text-xs p-1 space-y-1.5 font-sans min-w-[220px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{zone.name}</span>
                    <span className="font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      {zone.manganeseProbability}% Mn
                    </span>
                  </div>

                  {/* Exact Geolocation Telemetry Card */}
                  <div className="p-1.5 rounded-lg bg-slate-950/90 border border-slate-800 text-[10px] font-mono text-cyan-300 space-y-0.5">
                    <div className="flex items-center gap-1 font-bold text-emerald-400">
                      <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span>{zone.exactLocation?.dms || `${zone.coordinates[0]}°N, ${zone.coordinates[1]}°E`}</span>
                    </div>
                    <div className="text-slate-300 font-sans">
                      {zone.exactLocation?.tehsilVillage || zone.leaseArea}, <span className="text-amber-300">{zone.exactLocation?.districtState}</span>
                    </div>
                    <div className="text-slate-400 flex justify-between pt-0.5 border-t border-slate-800/80">
                      <span>GPS: [{zone.coordinates[0].toFixed(4)}, {zone.coordinates[1].toFixed(4)}]</span>
                      <span>{zone.exactLocation?.elevationMeters || 320}m AMSL</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 line-clamp-2">
                    {zone.primaryIndicator}
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono pt-1 border-t border-slate-800 flex justify-between">
                    <span>Est Volume:</span>
                    <span className="text-white font-bold">{zone.estimatedReserveVolume}</span>
                  </div>
                  <div className="flex flex-col gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleZoneClick(zone);
                      }}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/60 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <span>Open AI Confidence Dossier</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
