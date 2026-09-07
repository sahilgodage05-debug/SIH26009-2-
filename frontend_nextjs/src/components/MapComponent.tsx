'use client';

import React, { useEffect, useState, useRef } from 'react';
import Map, { Source, Layer, Marker, Popup, useMap, ViewStateChangeEvent } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  RESERVE_ZONES,
  DRILLING_SITES,
  AI_HEATMAP_CLUSTERS,
  NDVI_ANOMALY_ZONES,
  SOIL_MOISTURE_ZONES,
  LAND_TEMP_ZONES,
  MOIL_MAP_CENTER,
  DEFAULT_ZOOM,
  GEOLOGICAL_FAULT_CORRIDORS,
  IRREGULAR_PIT_POLYGONS
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
  const { current: map } = useMap();
  useEffect(() => {
    if (targetCoordinates && map) {
      const isOverview = Math.abs(targetCoordinates[0] - MOIL_MAP_CENTER[0]) < 0.01 && Math.abs(targetCoordinates[1] - MOIL_MAP_CENTER[1]) < 0.01;
      map.flyTo({
        center: [targetCoordinates[1], targetCoordinates[0]], // MapLibre uses [lng, lat]
        zoom: isOverview ? DEFAULT_ZOOM : 13,
        duration: 1300
      });
    }
  }, [targetCoordinates, map]);
  return null;
}

export const MapComponent: React.FC<MapComponentProps> = ({
  layers,
  selectedZone,
  onSelectZone,
  confidenceThreshold,
  msvOpacity
}) => {
  const [basemap, setBasemap] = useState<'light' | 'dark' | 'satellite'>('satellite');
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const [liveScores, setLiveScores] = useState<Record<string, number>>({});
  const mapRef = useRef(null);

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

  const getMapStyle = () => {
    switch (basemap) {
      case 'satellite':
        return {
          version: 8,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256
            }
          },
          layers: [{
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            minzoom: 0,
            maxzoom: 22
          }]
        };
      case 'light':
        return 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
      case 'dark':
      default:
        return 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
    }
  };

  useEffect(() => {
    if (selectedZone) {
      setFlyTarget(selectedZone.coordinates as [number, number]);
    }
  }, [selectedZone]);

  const handleReset = () => {
    setFlyTarget([...MOIL_MAP_CENTER] as [number, number]);
  };

  const [hoveredZone, setHoveredZone] = useState<ReserveZone | null>(null);

  return (
    <div className="relative w-full h-full bg-slate-100">
      <Map
        initialViewState={{
          longitude: MOIL_MAP_CENTER[1],
          latitude: MOIL_MAP_CENTER[0],
          zoom: DEFAULT_ZOOM
        }}
        mapStyle={getMapStyle() as any}
        interactiveLayerIds={['reserve-zones']}
      >
        <MapViewController targetCoordinates={flyTarget} />

        {/* --- Layer: Geological Fault Lineament Corridor (Strike N65°E) --- */}
        {GEOLOGICAL_FAULT_CORRIDORS.map(corridor => {
          const geojson = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: corridor.coordinates
              }
            }]
          };
          return (
            <Source key={corridor.id} type="geojson" data={geojson as any}>
              <Layer
                id={`fault-line-${corridor.id}`}
                type="line"
                paint={{
                  'line-color': '#c084fc',
                  'line-width': 3,
                  'line-dasharray': [3, 2]
                }}
              />
            </Source>
          );
        })}

        {/* --- Layer: Irregular Organic Pit Cluster Polygons (SR <= 1:4.8) --- */}
        {IRREGULAR_PIT_POLYGONS.map(pit => {
          const geojson = {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [pit.coordinates]
              }
            }]
          };
          return (
            <Source key={pit.id} type="geojson" data={geojson as any}>
              <Layer
                id={`pit-fill-${pit.id}`}
                type="fill"
                paint={{
                  'fill-color': '#06b6d4',
                  'fill-opacity': 0.25
                }}
              />
              <Layer
                id={`pit-outline-${pit.id}`}
                type="line"
                paint={{
                  'line-color': '#22d3ee',
                  'line-width': 2
                }}
              />
            </Source>
          );
        })}

        {/* --- Layers: AI Heatmap --- */}
        {layers.aiHeatmap && AI_HEATMAP_CLUSTERS.map(cluster => {
          const conf = liveScores[cluster.id] || cluster.probability || 80;
          if (conf < confidenceThreshold) return null;

          const geojson = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [cluster.coordinates.map(c => [c[1], c[0]])]
                }
              }
            ]
          };

          return (
            <Source key={`ai-${cluster.id}`} type="geojson" data={geojson as any}>
              <Layer
                id={`ai-layer-${cluster.id}`}
                type="fill"
                paint={{
                  'fill-color': '#ef4444',
                  'fill-opacity': (msvOpacity || 100) / 100 * 0.4
                }}
              />
            </Source>
          );
        })}

        {/* --- Layers: NDVI --- */}
        {layers.ndvi && NDVI_ANOMALY_ZONES.map((zone: any, idx) => {
          const geojson = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: [zone.center[1], zone.center[0]]
                },
                properties: {
                  radius: zone.radius || 10,
                  type: zone.type
                }
              }
            ]
          };
          return (
            <Source key={`ndvi-${idx}`} type="geojson" data={geojson as any}>
              <Layer
                id={`ndvi-layer-${idx}`}
                type="circle"
                paint={{
                  'circle-color': zone.type === 'High Stress' ? '#ef4444' : '#10b981',
                  'circle-opacity': 0.3,
                  'circle-radius': 50
                }}
              />
            </Source>
          );
        })}

        {/* --- Layers: Reserve Zones Markers --- */}
        {RESERVE_ZONES.map(zone => {
          const isSelected = selectedZone?.id === zone.id;
          const prob = zone.manganeseProbability;
          const color = prob >= 88 ? '#ef4444' : prob >= 80 ? '#f97316' : '#eab308';

          return (
            <Marker
              key={zone.id}
              longitude={zone.coordinates[1]}
              latitude={zone.coordinates[0]}
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onSelectZone(zone);
              }}
            >
              <div 
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredZone(zone)}
                onMouseLeave={() => setHoveredZone(null)}
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }}
              >
                <div style={{
                  position: 'absolute', width: '32px', height: '32px', borderRadius: '50%',
                  background: color, opacity: 0.35, animation: 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite'
                }}></div>
                <div style={{
                  position: 'relative', width: '26px', height: '26px', borderRadius: '50%', background: '#0f172a',
                  border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 0 12px ${color}88`, transform: isSelected ? 'scale(1.2)' : 'scale(1)', transition: 'transform 0.2s ease'
                }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }}></div>
                </div>
                <div style={{
                  position: 'absolute', bottom: '-16px', background: '#090d16dd', border: '1px solid #334155',
                  color: '#f1f5f9', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace', padding: '1px 4px',
                  borderRadius: '4px', whiteSpace: 'nowrap', pointerEvents: 'none'
                }}>
                  {prob}% Mn
                </div>
              </div>
            </Marker>
          );
        })}

        {/* --- Hover GPS Location Popup --- */}
        {hoveredZone && (
          <Popup
            longitude={hoveredZone.coordinates[1]}
            latitude={hoveredZone.coordinates[0]}
            closeButton={false}
            closeOnClick={false}
            anchor="bottom"
            offset={25}
          >
            <div className="p-2.5 bg-slate-900/95 border border-emerald-500/50 rounded-xl text-white font-mono shadow-2xl backdrop-blur-md space-y-1 text-xs">
              <div className="font-bold text-emerald-400 border-b border-slate-800 pb-1 flex items-center justify-between gap-3">
                <span>{hoveredZone.name}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 border border-emerald-500/30">
                  {hoveredZone.manganeseProbability}% Mn
                </span>
              </div>
              <div className="text-[11px] text-slate-200">
                <span className="text-slate-400">Lat/Lng: </span>
                <strong className="text-cyan-300">{hoveredZone.coordinates[0].toFixed(4)}° N, {hoveredZone.coordinates[1].toFixed(4)}° E</strong>
              </div>
              <div className="text-[10px] text-slate-400">
                <span>DMS: </span>
                <span className="text-amber-300 font-bold">{hoveredZone.exactLocation?.dms || 'N/A'}</span>
              </div>
              <div className="text-[10px] text-cyan-300 pt-0.5 border-t border-slate-800 flex justify-between">
                <span>Stripping Ratio: <strong className="text-white">{hoveredZone.overburdenRatio}</strong></span>
                <span>Break-Even Limit: <strong className="text-emerald-400">1:4.8</strong></span>
              </div>
              <div className="text-[9px] text-purple-300">
                <span>Geological Strike: </span>
                <strong>N65°E • Dip 55° NW</strong>
              </div>
            </div>
          </Popup>
        )}

        {/* --- Layers: Drilling Sites --- */}
        {layers.historicalDrilling && DRILLING_SITES.map(site => (
          <Marker
            key={site.id}
            longitude={site.coordinates[1]}
            latitude={site.coordinates[0]}
          >
            <div style={{
              width: '14px', height: '14px', background: '#f59e0b',
              border: '2px solid #ffffff', borderRadius: '3px',
              boxShadow: '0 0 8px #f59e0b', transform: 'rotate(45deg)'
            }}></div>
          </Marker>
        ))}

      </Map>

      {/* Crosshair / Overlay UI */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-16 h-16 border-2 border-slate-200/30 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-emerald-500/50 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" />
        </div>
      </div>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <div className="bg-slate-50/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 shadow-xl flex flex-col gap-1 pointer-events-auto">
          <button onClick={() => setBasemap('light')} className={`p-2 rounded-lg transition-colors ${basemap === 'light' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'}`} title="Vector Light Map">
            <Layers className="w-4 h-4" />
          </button>
          <button onClick={() => setBasemap('satellite')} className={`p-2 rounded-lg transition-colors ${basemap === 'satellite' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-800'}`} title="Satellite / Earth Observation">
            <Eye className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-slate-50/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/80 shadow-xl flex flex-col gap-1 pointer-events-auto">
          <button onClick={handleReset} className="p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-lg transition-colors" title="Recenter to Central India">
            <Navigation className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
