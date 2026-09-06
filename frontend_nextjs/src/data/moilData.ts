import { ReserveZone, DrillingSite, HeatmapPolygon, FleetEquipment, OperationalAlert } from '@/types/moil';

// MOIL Belt Center: Central India Manganese Belt (Nagpur - Bhandara - Balaghat)
// Latitude: 21.6011° N, Longitude: 79.7427° E
export const MOIL_MAP_CENTER: [number, number] = [21.60, 79.74];
export const DEFAULT_ZOOM = 9;

// ALL 11 OPERATING MINES OF MOIL LIMITED IN INDIA
// (6 Mines in Maharashtra + 5 Mines in Madhya Pradesh)
// With Exact Field-Survey GPS Coordinates & Mining Lease Georeferences
export const RESERVE_ZONES: ReserveZone[] = [
  {
    id: 'zone-balaghat',
    name: 'Balaghat Mine (Deep Underground)',
    leaseArea: 'ML-0482/Balaghat-MP',
    coordinates: [21.8502, 80.2274],
    exactLocation: {
      dms: "21° 51' 01\" N, 80° 13' 39\" E",
      districtState: 'Balaghat District, Madhya Pradesh',
      tehsilVillage: 'Bharweli, Balaghat',
      pincode: '481102',
      elevationMeters: 335
    },
    manganeseProbability: 94,
    confidenceInterval: '± 1.8%',
    estimatedReserveVolume: '32.5M Tonnes',
    averageGrade: '46.2% Mn (Super Metallurgical & Dioxide)',
    estimatedValueINR: '₹28,400 Cr',
    overburdenRatio: '1 : 1.8',
    status: 'Verified Deposit',
    primaryIndicator: 'Deepest manganese mine in Asia (>385m depth) • High positive Bouguer gravity anomaly (+0.62 mGal)',
    indicators: {
      densityAnomaly: {
        value: '+0.62 g/cm³',
        status: 'optimal',
        desc: 'Massive braunite/pyrolusite ore body dipping 74° NW in Mansar formation.'
      },
      vegetationStress: {
        value: '-0.38 NDVI Anomaly',
        status: 'optimal',
        desc: 'Pronounced canopy chlorosis in surrounding Sal and Teak forest corridor.'
      },
      thermalInertia: {
        value: '19.2 K·m²/W',
        status: 'optimal',
        desc: 'High thermal inertia signature along gondite-quartzite ridge.'
      },
      structuralTrap: {
        value: 'Overturned Syncline (Dip 74° NW)',
        status: 'optimal',
        desc: 'Sausar Group Mansar formation syncline trapping thick high-grade ore horizon.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-02 (Sentinel-2 L2A)',
      sarCoherence: 0.92,
      ndviAnomalyScore: 0.91,
      surfaceTempKelvin: 308.2
    },
    spaceTelemetry: {
      rainfall_mm_hr: 46.5,
      soilMoisturePercent: 74.2,
      ndviVegetationIndex: -0.38,
      surfaceTempKelvin: 308.2
    },
    stratigraphy: [
      { depth: '0 - 25m', layerName: 'Laterite & Weathered Schist', rockType: 'Laterite/Schist', mnGrade: 4.8, color: '#b45309' },
      { depth: '25 - 65m', layerName: 'Mica-Schist with Quartz Lenses', rockType: 'Schist', mnGrade: 9.2, color: '#64748b' },
      { depth: '65 - 180m', layerName: 'Massive High-Grade Braunite Bed', rockType: 'Braunite Ore', mnGrade: 48.6, color: '#10b981' },
      { depth: '180 - 340m', layerName: 'Dioxide Ore Horizon (Battery Grade)', rockType: 'Cryptomelane-Pyrolusite', mnGrade: 45.2, color: '#059669' },
      { depth: '340m+', layerName: 'Biotite Gneiss Basement', rockType: 'Basement Gneiss', mnGrade: 1.2, color: '#334155' }
    ],
    aiRecommendation: 'Core production asset. Shaft deepening and sub-level stoping optimization recommended to unlock 14M Tonnes deeper reserve.'
  },
  {
    id: 'zone-dongri-buzurg',
    name: 'Dongri Buzurg Mine (Opencast)',
    leaseArea: 'ML-0294/Bhandara-MH',
    coordinates: [21.5420, 79.6780],
    exactLocation: {
      dms: "21° 32' 31\" N, 79° 40' 41\" E",
      districtState: 'Bhandara District, Maharashtra',
      tehsilVillage: 'Dongri Buzurg, Tumsar',
      pincode: '441907',
      elevationMeters: 310
    },
    manganeseProbability: 89,
    confidenceInterval: '± 2.5%',
    estimatedReserveVolume: '18.5M Tonnes',
    averageGrade: '44.1% Mn (Electrolytic Battery Dioxide)',
    estimatedValueINR: '₹16,200 Cr',
    overburdenRatio: '1 : 2.4',
    status: 'Verified Deposit',
    primaryIndicator: 'Battery grade peroxide ore • Pronounced chlorosis anomaly and low resistivity',
    indicators: {
      densityAnomaly: {
        value: '+0.51 g/cm³',
        status: 'optimal',
        desc: 'Subsurface density contrast indicating cryptomelane and pyrolusite enrichment.'
      },
      vegetationStress: {
        value: '-0.33 NDVI Anomaly',
        status: 'optimal',
        desc: 'Intense canopy stress over shallow opencast benches.'
      },
      thermalInertia: {
        value: '16.8 K·m²/W',
        status: 'optimal',
        desc: 'Rapid thermal dissipation during nighttime radiometer scans.'
      },
      structuralTrap: {
        value: 'Isoclinal Fold Limb (Strike N65°E)',
        status: 'optimal',
        desc: 'Thickened fold crest with continuous ore continuity along 1.8km strike length.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-08-30 (Landsat-9 TIR)',
      sarCoherence: 0.88,
      ndviAnomalyScore: 0.86,
      surfaceTempKelvin: 310.2
    },
    spaceTelemetry: {
      rainfall_mm_hr: 52.0,
      soilMoisturePercent: 82.5,
      ndviVegetationIndex: -0.33,
      surfaceTempKelvin: 310.2
    },
    stratigraphy: [
      { depth: '0 - 15m', layerName: 'Alluvial Cap & Loam', rockType: 'Alluvium', mnGrade: 3.2, color: '#b45309' },
      { depth: '15 - 45m', layerName: 'Pyrolusite Peroxide Lode', rockType: 'Battery Grade Ore', mnGrade: 45.8, color: '#10b981' },
      { depth: '45 - 95m', layerName: 'Braunite-Cryptomelane Bed', rockType: 'Dioxide Ore', mnGrade: 42.4, color: '#059669' },
      { depth: '95m+', layerName: 'Sillimanite Quartzite', rockType: 'Quartzite', mnGrade: 2.1, color: '#334155' }
    ],
    aiRecommendation: 'Opencast bench optimization with slope geotechnical feasibility analysis. Deploy dewatering pumps along south footwall.'
  },
  {
    id: 'zone-chikla',
    name: 'Chikla Mine (Underground)',
    leaseArea: 'ML-0560/Bhandara-MH',
    coordinates: [21.5336, 79.7437],
    exactLocation: {
      dms: "21° 32' 01\" N, 79° 44' 37\" E",
      districtState: 'Bhandara District, Maharashtra',
      tehsilVillage: 'Sitasaongi / Chikla, Tumsar',
      pincode: '441920',
      elevationMeters: 305
    },
    manganeseProbability: 86,
    confidenceInterval: '± 2.8%',
    estimatedReserveVolume: '9.8M Tonnes',
    averageGrade: '43.6% Mn (Standard Metallurgical Grade)',
    estimatedValueINR: '₹8,450 Cr',
    overburdenRatio: '1 : 2.2',
    status: 'Verified Deposit',
    primaryIndicator: 'Linear gravity ridge connecting Chikla to Sitasaongi ore body',
    indicators: {
      densityAnomaly: {
        value: '+0.48 g/cm³',
        status: 'optimal',
        desc: 'Continuous high-density corridor along regional fold hinge.'
      },
      vegetationStress: {
        value: '-0.28 NDVI Anomaly',
        status: 'optimal',
        desc: 'Moderate canopy chlorosis along ridge slopes.'
      },
      thermalInertia: {
        value: '15.4 K·m²/W',
        status: 'optimal',
        desc: 'Clear thermal contrast against country mica schist.'
      },
      structuralTrap: {
        value: 'Doubly Plunging Anticline',
        status: 'optimal',
        desc: 'Underlying competent quartzite protecting manganese bed from tectonic shearing.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-03 (Sentinel-2 L2A)',
      sarCoherence: 0.89,
      ndviAnomalyScore: 0.84,
      surfaceTempKelvin: 309.1
    },
    spaceTelemetry: {
      rainfall_mm_hr: 44.0,
      soilMoisturePercent: 71.0,
      ndviVegetationIndex: -0.28,
      surfaceTempKelvin: 309.1
    },
    stratigraphy: [
      { depth: '0 - 20m', layerName: 'Quartzite Regolith', rockType: 'Regolith', mnGrade: 2.8, color: '#b45309' },
      { depth: '20 - 55m', layerName: 'Ferruginous Schist', rockType: 'Schist', mnGrade: 10.4, color: '#64748b' },
      { depth: '55 - 110m', layerName: 'High-Grade Braunite Ore Band', rockType: 'Braunite Ore', mnGrade: 44.8, color: '#10b981' },
      { depth: '110m+', layerName: 'Gondite Silicate Bed', rockType: 'Gondite', mnGrade: 17.5, color: '#0284c7' }
    ],
    aiRecommendation: 'High confidence underground expansion. Recommend transverse drifting toward Sitasaongi fault boundary.'
  },
  {
    id: 'zone-tirodi',
    name: 'Tirodi Mine (Opencast)',
    leaseArea: 'ML-0312/Balaghat-MP',
    coordinates: [21.6835, 79.7246],
    exactLocation: {
      dms: "21° 41' 01\" N, 79° 43' 29\" E",
      districtState: 'Balaghat District, Madhya Pradesh',
      tehsilVillage: 'Tirodi, Katangi',
      pincode: '481449',
      elevationMeters: 345
    },
    manganeseProbability: 88,
    confidenceInterval: '± 2.2%',
    estimatedReserveVolume: '6.5M Tonnes',
    averageGrade: '45.2% Mn (Braunite Ore Bed)',
    estimatedValueINR: '₹5,750 Cr',
    overburdenRatio: '1 : 2.8',
    status: 'Verified Deposit',
    primaryIndicator: 'Tirodi Gneiss complex contact zone with massive gondite braunite lodes',
    indicators: {
      densityAnomaly: {
        value: '+0.49 g/cm³',
        status: 'optimal',
        desc: 'Strong gravimetric high aligned with North-South opencast benches.'
      },
      vegetationStress: {
        value: '-0.31 NDVI Anomaly',
        status: 'optimal',
        desc: 'Chlorosis signature prominent over bench 2 and bench 3.'
      },
      thermalInertia: {
        value: '16.0 K·m²/W',
        status: 'optimal',
        desc: 'High thermal inertia indicative of dense compact braunite.'
      },
      structuralTrap: {
        value: 'Synclinal Keel Trap',
        status: 'optimal',
        desc: 'Fold axis plunge creating thick accumulation at bench pit bottom.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-01 (Cartosat-3 DEM)',
      sarCoherence: 0.87,
      ndviAnomalyScore: 0.86,
      surfaceTempKelvin: 311.0
    },
    spaceTelemetry: {
      rainfall_mm_hr: 41.5,
      soilMoisturePercent: 68.4,
      ndviVegetationIndex: -0.31,
      surfaceTempKelvin: 311.0
    },
    stratigraphy: [
      { depth: '0 - 18m', layerName: 'Overburden Weathered Gneiss', rockType: 'Tirodi Gneiss', mnGrade: 1.9, color: '#b45309' },
      { depth: '18 - 50m', layerName: 'Manganiferous Schist', rockType: 'Schist', mnGrade: 12.1, color: '#64748b' },
      { depth: '50 - 92m', layerName: 'Primary Braunite Ore Body', rockType: 'Braunite Lode', mnGrade: 45.9, color: '#10b981' },
      { depth: '92m+', layerName: 'Basement Tirodi Gneiss', rockType: 'Gneiss', mnGrade: 0.9, color: '#334155' }
    ],
    aiRecommendation: 'Deploy precision electronic delay detonators to optimize blasting and control flyrock near boundary.'
  },
  {
    id: 'zone-gumgaon',
    name: 'Gumgaon Mine (Underground)',
    leaseArea: 'ML-0118/Nagpur-MH',
    coordinates: [21.4078, 78.9833],
    exactLocation: {
      dms: "21° 24' 28\" N, 78° 58' 60\" E",
      districtState: 'Nagpur District, Maharashtra',
      tehsilVillage: 'Gumgaon / Khapa, Saoner',
      pincode: '441107',
      elevationMeters: 320
    },
    manganeseProbability: 82,
    confidenceInterval: '± 3.2%',
    estimatedReserveVolume: '4.2M Tonnes',
    averageGrade: '41.5% Mn (Blast Furnace Grade)',
    estimatedValueINR: '₹3,420 Cr',
    overburdenRatio: '1 : 3.2',
    status: 'High Potential',
    primaryIndicator: 'Sentinel-1 SAR coherence + Structural fold hinge near Khapa',
    indicators: {
      densityAnomaly: {
        value: '+0.39 g/cm³',
        status: 'optimal',
        desc: 'Linear gravity crest continuing westward toward Parseoni.'
      },
      vegetationStress: {
        value: '-0.24 NDVI Anomaly',
        status: 'neutral',
        desc: 'Agricultural canopy background partially masking outcrop.'
      },
      thermalInertia: {
        value: '13.8 K·m²/W',
        status: 'neutral',
        desc: 'Pre-dawn thermal difference observed in radiometric TIR.'
      },
      structuralTrap: {
        value: 'Plunging Synclinal Hinge',
        status: 'optimal',
        desc: 'Thickened hinge zone containing massive braunite lens.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-08-29 (Sentinel-1 SAR)',
      sarCoherence: 0.81,
      ndviAnomalyScore: 0.76,
      surfaceTempKelvin: 312.4
    },
    spaceTelemetry: {
      rainfall_mm_hr: 38.0,
      soilMoisturePercent: 64.2,
      ndviVegetationIndex: -0.24,
      surfaceTempKelvin: 312.4
    },
    stratigraphy: [
      { depth: '0 - 24m', layerName: 'Black Cotton Soil & Alluvium', rockType: 'Soil/Clay', mnGrade: 1.5, color: '#78350f' },
      { depth: '24 - 60m', layerName: 'Mica Schist & Amphibolite', rockType: 'Schist', mnGrade: 8.4, color: '#64748b' },
      { depth: '60 - 105m', layerName: 'Braunite-Jacobsite Ore Body', rockType: 'Braunite Ore', mnGrade: 41.8, color: '#10b981' },
      { depth: '105m+', layerName: 'Granitic Gneiss Basement', rockType: 'Gneiss', mnGrade: 0.8, color: '#334155' }
    ],
    aiRecommendation: 'High potential for deep drilling down to 180m level to double reserve life.'
  },
  {
    id: 'zone-kandri',
    name: 'Kandri Mine (Opencast & Underground)',
    leaseArea: 'ML-0205/Nagpur-MH',
    coordinates: [21.4230, 79.2885],
    exactLocation: {
      dms: "21° 25' 23\" N, 79° 17' 19\" E",
      districtState: 'Nagpur District, Maharashtra',
      tehsilVillage: 'Kandri, Ramtek',
      pincode: '441401',
      elevationMeters: 330
    },
    manganeseProbability: 85,
    confidenceInterval: '± 2.6%',
    estimatedReserveVolume: '3.8M Tonnes',
    averageGrade: '44.5% Mn (High Grade Braunite)',
    estimatedValueINR: '₹3,250 Cr',
    overburdenRatio: '1 : 2.7',
    status: 'Verified Deposit',
    primaryIndicator: 'Prominent circular hill outcrop with classical Mansar-Kandri nappe fold',
    indicators: {
      densityAnomaly: {
        value: '+0.46 g/cm³',
        status: 'optimal',
        desc: 'Distinctive gravitational high over the Kandri horseshoe fold structure.'
      },
      vegetationStress: {
        value: '-0.30 NDVI Anomaly',
        status: 'optimal',
        desc: 'Canopy chlorosis clearly tracing the fold hinge around the pit rim.'
      },
      thermalInertia: {
        value: '15.6 K·m²/W',
        status: 'optimal',
        desc: 'Thermal inertia contrast matching gondite and braunite core.'
      },
      structuralTrap: {
        value: 'Horseshoe Fold Hinge',
        status: 'optimal',
        desc: 'Recumbent fold axis preserving high-grade ore from erosion.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-02 (Sentinel-2 L2A)',
      sarCoherence: 0.89,
      ndviAnomalyScore: 0.83,
      surfaceTempKelvin: 309.8
    },
    spaceTelemetry: {
      rainfall_mm_hr: 43.0,
      soilMoisturePercent: 72.8,
      ndviVegetationIndex: -0.30,
      surfaceTempKelvin: 309.8
    },
    stratigraphy: [
      { depth: '0 - 16m', layerName: 'Quartzite & Schist Overburden', rockType: 'Quartzite/Schist', mnGrade: 2.1, color: '#b45309' },
      { depth: '16 - 48m', layerName: 'Manganiferous Gondite', rockType: 'Gondite', mnGrade: 14.8, color: '#64748b' },
      { depth: '48 - 88m', layerName: 'Massive Braunite Bed', rockType: 'Braunite Ore', mnGrade: 45.2, color: '#10b981' },
      { depth: '88m+', layerName: 'Muscovite-Biotite Schist', rockType: 'Schist', mnGrade: 1.4, color: '#334155' }
    ],
    aiRecommendation: 'Opencast transition to underground incline shaft progressing ahead of target schedule.'
  },
  {
    id: 'zone-mansar',
    name: 'Mansar Mine (Opencast & Underground)',
    leaseArea: 'ML-0174/Nagpur-MH',
    coordinates: [21.3965, 79.2725],
    exactLocation: {
      dms: "21° 23' 47\" N, 79° 16' 21\" E",
      districtState: 'Nagpur District, Maharashtra',
      tehsilVillage: 'Mansar, Ramtek',
      pincode: '441106',
      elevationMeters: 325
    },
    manganeseProbability: 84,
    confidenceInterval: '± 2.9%',
    estimatedReserveVolume: '5.4M Tonnes',
    averageGrade: '39.8% Mn (Mansar Formation Type Locality)',
    estimatedValueINR: '₹4,180 Cr',
    overburdenRatio: '1 : 2.9',
    status: 'Verified Deposit',
    primaryIndicator: 'Type locality of Mansar Formation (Sausar Group) • Historical producer since 1899',
    indicators: {
      densityAnomaly: {
        value: '+0.43 g/cm³',
        status: 'optimal',
        desc: 'Broad density crest along Mansar ridge.'
      },
      vegetationStress: {
        value: '-0.27 NDVI Anomaly',
        status: 'optimal',
        desc: 'Clear chlorosis signature along unworked eastern strike.'
      },
      thermalInertia: {
        value: '14.5 K·m²/W',
        status: 'neutral',
        desc: 'Consistent with dense manganese phyllite bedrock.'
      },
      structuralTrap: {
        value: 'Asymmetric Anticlinal Hinge',
        status: 'optimal',
        desc: 'Fold limb thickening providing favorable mining widths.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-01 (Landsat-9 TIR)',
      sarCoherence: 0.85,
      ndviAnomalyScore: 0.81,
      surfaceTempKelvin: 310.5
    },
    spaceTelemetry: {
      rainfall_mm_hr: 42.0,
      soilMoisturePercent: 70.5,
      ndviVegetationIndex: -0.27,
      surfaceTempKelvin: 310.5
    },
    stratigraphy: [
      { depth: '0 - 20m', layerName: 'Weathered Schistose Overburden', rockType: 'Schist', mnGrade: 2.6, color: '#b45309' },
      { depth: '20 - 52m', layerName: 'Ferruginous Manganese Ore', rockType: 'Low-Grade Ore', mnGrade: 28.5, color: '#ca8a04' },
      { depth: '52 - 95m', layerName: 'Metallurgical Grade Braunite', rockType: 'Braunite Ore', mnGrade: 41.2, color: '#10b981' },
      { depth: '95m+', layerName: 'Chorbaoli Quartzite', rockType: 'Quartzite', mnGrade: 0.6, color: '#334155' }
    ],
    aiRecommendation: 'Underground shaft haulage modernization recommended to reduce per-tonne OPEX by 18%.'
  },
  {
    id: 'zone-ukwa',
    name: 'Ukwa Mine (Underground)',
    leaseArea: 'ML-0621/Balaghat-MP',
    coordinates: [21.9685, 80.4680],
    exactLocation: {
      dms: "21° 58' 07\" N, 80° 28' 05\" E",
      districtState: 'Balaghat District, Madhya Pradesh',
      tehsilVillage: 'Ukwa, Baihar',
      pincode: '481449',
      elevationMeters: 620
    },
    manganeseProbability: 81,
    confidenceInterval: '± 3.4%',
    estimatedReserveVolume: '3.4M Tonnes',
    averageGrade: '38.5% Mn (Low-Phosphorus Ore)',
    estimatedValueINR: '₹2,680 Cr',
    overburdenRatio: '1 : 2.5',
    status: 'Verified Deposit',
    primaryIndicator: 'Famous low-phosphorus metallurgical manganese ore bed extending over 5.5 km strike',
    indicators: {
      densityAnomaly: {
        value: '+0.41 g/cm³',
        status: 'optimal',
        desc: 'Continuous sheet-like gravity anomaly along plateau margin.'
      },
      vegetationStress: {
        value: '-0.26 NDVI Anomaly',
        status: 'optimal',
        desc: 'Canopy phytotoxicity anomalies in dense Sal forest canopy.'
      },
      thermalInertia: {
        value: '14.0 K·m²/W',
        status: 'neutral',
        desc: 'Consistent thermal inertia along plateau scarp.'
      },
      structuralTrap: {
        value: 'Monoclinal Sheet Dip (15°-25° NW)',
        status: 'optimal',
        desc: 'Gentle uniform dip allowing highly mechanized adit and breast stoping.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-08-31 (Sentinel-2 L2A)',
      sarCoherence: 0.83,
      ndviAnomalyScore: 0.79,
      surfaceTempKelvin: 307.8
    },
    spaceTelemetry: {
      rainfall_mm_hr: 48.0,
      soilMoisturePercent: 78.0,
      ndviVegetationIndex: -0.26,
      surfaceTempKelvin: 307.8
    },
    stratigraphy: [
      { depth: '0 - 30m', layerName: 'Laterite Plateau Cap', rockType: 'Laterite', mnGrade: 1.8, color: '#b45309' },
      { depth: '30 - 70m', layerName: 'Sericitic Phyllite', rockType: 'Phyllite', mnGrade: 6.5, color: '#64748b' },
      { depth: '70 - 105m', layerName: 'Low-Phosphorus Braunite Bed', rockType: 'Low-P Braunite', mnGrade: 39.8, color: '#10b981' },
      { depth: '105m+', layerName: 'Granitic Gneiss Basement', rockType: 'Gneiss', mnGrade: 0.5, color: '#334155' }
    ],
    aiRecommendation: 'Low-phosphorus ore commands premium pricing in steel manufacturing. Mechanized adit extension advised.'
  },
  {
    id: 'zone-beldongri',
    name: 'Beldongri Mine (Underground)',
    leaseArea: 'ML-0143/Nagpur-MH',
    coordinates: [21.4315, 79.3140],
    exactLocation: {
      dms: "21° 25' 53\" N, 79° 18' 50\" E",
      districtState: 'Nagpur District, Maharashtra',
      tehsilVillage: 'Satuk / Beldongri, Ramtek',
      pincode: '441105',
      elevationMeters: 328
    },
    manganeseProbability: 78,
    confidenceInterval: '± 3.6%',
    estimatedReserveVolume: '2.1M Tonnes',
    averageGrade: '42.0% Mn (Gondite Horizon Ore)',
    estimatedValueINR: '₹1,720 Cr',
    overburdenRatio: '1 : 3.1',
    status: 'High Potential',
    primaryIndicator: 'High-grade braunite lenses associated with spessartine-bearing gondites',
    indicators: {
      densityAnomaly: {
        value: '+0.37 g/cm³',
        status: 'optimal',
        desc: 'Discrete density high east of Kandri fold axis.'
      },
      vegetationStress: {
        value: '-0.22 NDVI Anomaly',
        status: 'neutral',
        desc: 'Moderate canopy variation.'
      },
      thermalInertia: {
        value: '13.2 K·m²/W',
        status: 'neutral',
        desc: 'Thermal signature present along strike.'
      },
      structuralTrap: {
        value: 'Tight Drag Fold',
        status: 'optimal',
        desc: 'Secondary drag fold thickening ore lenses locally up to 8m thickness.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-02 (Sentinel-1 SAR)',
      sarCoherence: 0.82,
      ndviAnomalyScore: 0.75,
      surfaceTempKelvin: 311.2
    },
    spaceTelemetry: {
      rainfall_mm_hr: 40.5,
      soilMoisturePercent: 67.2,
      ndviVegetationIndex: -0.22,
      surfaceTempKelvin: 311.2
    },
    stratigraphy: [
      { depth: '0 - 22m', layerName: 'Mica Schist Weathered Zone', rockType: 'Schist', mnGrade: 2.2, color: '#b45309' },
      { depth: '22 - 58m', layerName: 'Gondite with Braunite Bands', rockType: 'Gondite', mnGrade: 24.5, color: '#0284c7' },
      { depth: '58 - 85m', layerName: 'Massive Braunite Lens', rockType: 'Braunite Ore', mnGrade: 43.1, color: '#10b981' },
      { depth: '85m+', layerName: 'Amphibolite Country Rock', rockType: 'Amphibolite', mnGrade: 1.0, color: '#334155' }
    ],
    aiRecommendation: 'Target confirmation drilling at 75m depth along strike to prove reserves under UNFC 122 category.'
  },
  {
    id: 'zone-sitapatore',
    name: 'Sitapatore Mine (Opencast)',
    leaseArea: 'ML-0402/Balaghat-MP',
    coordinates: [21.7180, 79.7610],
    exactLocation: {
      dms: "21° 43' 05\" N, 79° 45' 40\" E",
      districtState: 'Balaghat District, Madhya Pradesh',
      tehsilVillage: 'Sitapatore, Tirodi',
      pincode: '481449',
      elevationMeters: 350
    },
    manganeseProbability: 80,
    confidenceInterval: '± 3.3%',
    estimatedReserveVolume: '2.8M Tonnes',
    averageGrade: '40.5% Mn (Synclinal Limb Deposit)',
    estimatedValueINR: '₹2,240 Cr',
    overburdenRatio: '1 : 2.6',
    status: 'High Potential',
    primaryIndicator: 'Opencast braunite reef along northern flank of Sausar Belt',
    indicators: {
      densityAnomaly: {
        value: '+0.40 g/cm³',
        status: 'optimal',
        desc: 'Positive Bouguer gravity trend correlating with Tirodi-Sukli corridor.'
      },
      vegetationStress: {
        value: '-0.25 NDVI Anomaly',
        status: 'optimal',
        desc: 'Clear bio-marker anomaly tracing mineralized reef.'
      },
      thermalInertia: {
        value: '13.9 K·m²/W',
        status: 'neutral',
        desc: 'Consistent radiometric thermal profile.'
      },
      structuralTrap: {
        value: 'Synclinal Limb Inversion',
        status: 'optimal',
        desc: 'Tilted fold limb providing stable opencast highwall conditions.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-03 (Landsat-9 TIR)',
      sarCoherence: 0.84,
      ndviAnomalyScore: 0.78,
      surfaceTempKelvin: 310.8
    },
    spaceTelemetry: {
      rainfall_mm_hr: 43.5,
      soilMoisturePercent: 70.0,
      ndviVegetationIndex: -0.25,
      surfaceTempKelvin: 310.8
    },
    stratigraphy: [
      { depth: '0 - 15m', layerName: 'Lateritic Soil & Boulders', rockType: 'Laterite', mnGrade: 3.0, color: '#b45309' },
      { depth: '15 - 42m', layerName: 'Weathered Quartz-Mica Schist', rockType: 'Schist', mnGrade: 9.8, color: '#64748b' },
      { depth: '42 - 78m', layerName: 'Braunite-Pyrolusite Reef', rockType: 'Manganese Ore', mnGrade: 41.5, color: '#10b981' },
      { depth: '78m+', layerName: 'Gneissose Country Rock', rockType: 'Gneiss', mnGrade: 1.1, color: '#334155' }
    ],
    aiRecommendation: 'Opencast pit expansion planned with geotechnical bench safety factor exceeding 1.4.'
  },
  {
    id: 'zone-sukli',
    name: 'Sukli Mine (Opencast)',
    leaseArea: 'ML-0388/Balaghat-MP',
    coordinates: [21.6580, 79.7085],
    exactLocation: {
      dms: "21° 39' 29\" N, 79° 42' 31\" E",
      districtState: 'Balaghat District, Madhya Pradesh',
      tehsilVillage: 'Sukli, Tirodi',
      pincode: '481449',
      elevationMeters: 338
    },
    manganeseProbability: 79,
    confidenceInterval: '± 3.5%',
    estimatedReserveVolume: '1.9M Tonnes',
    averageGrade: '39.2% Mn (Limonitic-Braunite Complex)',
    estimatedValueINR: '₹1,480 Cr',
    overburdenRatio: '1 : 2.9',
    status: 'High Potential',
    primaryIndicator: 'Sitapatore-Sukli manganese complex with shallow workable ore beds',
    indicators: {
      densityAnomaly: {
        value: '+0.36 g/cm³',
        status: 'optimal',
        desc: 'Localized gravity high indicating shallow residual manganese pockets.'
      },
      vegetationStress: {
        value: '-0.23 NDVI Anomaly',
        status: 'neutral',
        desc: 'Canopy chlorosis visible in multispectral Sentinel-2 false color composite.'
      },
      thermalInertia: {
        value: '13.0 K·m²/W',
        status: 'neutral',
        desc: 'Moderate thermal anomaly.'
      },
      structuralTrap: {
        value: 'Shallow Synclinal Trough',
        status: 'optimal',
        desc: 'Flat-lying trough ideal for low stripping ratio opencast excavation.'
      }
    },
    satelliteTelemetry: {
      sentinelPassDate: '2026-09-01 (Sentinel-2 L2A)',
      sarCoherence: 0.81,
      ndviAnomalyScore: 0.74,
      surfaceTempKelvin: 311.6
    },
    spaceTelemetry: {
      rainfall_mm_hr: 39.5,
      soilMoisturePercent: 65.5,
      ndviVegetationIndex: -0.23,
      surfaceTempKelvin: 311.6
    },
    stratigraphy: [
      { depth: '0 - 12m', layerName: 'Surface Soil & Schist Regolith', rockType: 'Regolith', mnGrade: 2.2, color: '#b45309' },
      { depth: '12 - 38m', layerName: 'Manganiferous Gondite', rockType: 'Gondite', mnGrade: 18.0, color: '#0284c7' },
      { depth: '38 - 68m', layerName: 'Braunite-Cryptomelane Bed', rockType: 'Braunite Ore', mnGrade: 40.2, color: '#10b981' },
      { depth: '68m+', layerName: 'Basement Schist', rockType: 'Schist', mnGrade: 0.7, color: '#334155' }
    ],
    aiRecommendation: 'Ideal for short-cycle opencast extraction to blend with Balaghat high-grade concentrates.'
  }
];

// Comprehensive Drilling Boreholes Across all 11 Mines (Accurate Field Collars)
export const DRILLING_SITES: DrillingSite[] = [
  { id: 'dh-bg-101', boreholeCode: 'BH-BG-101', mine: 'Balaghat Mine', coordinates: [21.8480, 80.2250], depthMeters: 145, gradeMnPct: 46.8, drilledYear: 2024, status: 'Productive Core' },
  { id: 'dh-bg-102', boreholeCode: 'BH-BG-102', mine: 'Balaghat Mine', coordinates: [21.8530, 80.2290], depthMeters: 180, gradeMnPct: 48.2, drilledYear: 2025, status: 'Productive Core' },
  { id: 'dh-db-204', boreholeCode: 'BH-DB-204', mine: 'Dongri Buzurg Mine', coordinates: [21.5400, 79.6760], depthMeters: 85, gradeMnPct: 44.7, drilledYear: 2023, status: 'Productive Core' },
  { id: 'dh-db-209', boreholeCode: 'BH-DB-209', mine: 'Dongri Buzurg Mine', coordinates: [21.5440, 79.6800], depthMeters: 110, gradeMnPct: 45.1, drilledYear: 2025, status: 'Productive Core' },
  { id: 'dh-ck-412', boreholeCode: 'BH-CK-412', mine: 'Chikla Mine', coordinates: [21.5320, 79.7420], depthMeters: 130, gradeMnPct: 44.0, drilledYear: 2024, status: 'Productive Core' },
  { id: 'dh-tr-605', boreholeCode: 'BH-TR-605', mine: 'Tirodi Mine', coordinates: [21.6820, 79.7230], depthMeters: 105, gradeMnPct: 45.9, drilledYear: 2024, status: 'Productive Core' },
  { id: 'dh-gm-301', boreholeCode: 'BH-GM-301', mine: 'Gumgaon Mine', coordinates: [21.4060, 78.9810], depthMeters: 95, gradeMnPct: 41.8, drilledYear: 2023, status: 'Productive Core' },
  { id: 'dh-kd-701', boreholeCode: 'BH-KD-701', mine: 'Kandri Mine', coordinates: [21.4215, 79.2870], depthMeters: 115, gradeMnPct: 44.5, drilledYear: 2024, status: 'Productive Core' },
  { id: 'dh-ms-502', boreholeCode: 'BH-MS-502', mine: 'Mansar Mine', coordinates: [21.3950, 79.2710], depthMeters: 75, gradeMnPct: 40.2, drilledYear: 2023, status: 'Productive Core' },
  { id: 'dh-uk-801', boreholeCode: 'BH-UK-801', mine: 'Ukwa Mine', coordinates: [21.9670, 80.4660], depthMeters: 125, gradeMnPct: 39.1, drilledYear: 2024, status: 'Productive Core' },
  { id: 'dh-bd-901', boreholeCode: 'BH-BD-901', mine: 'Beldongri Mine', coordinates: [21.4300, 79.3120], depthMeters: 80, gradeMnPct: 42.4, drilledYear: 2025, status: 'Productive Core' },
  { id: 'dh-sp-1001', boreholeCode: 'BH-SP-1001', mine: 'Sitapatore Mine', coordinates: [21.7165, 79.7595], depthMeters: 90, gradeMnPct: 40.9, drilledYear: 2024, status: 'Productive Core' },
  { id: 'dh-sk-1101', boreholeCode: 'BH-SK-1101', mine: 'Sukli Mine', coordinates: [21.6565, 79.7070], depthMeters: 70, gradeMnPct: 39.5, drilledYear: 2025, status: 'Productive Core' }
];

// Multi-Mine AI Manganese Anomaly Clusters (GeoJSON polygons across MOIL Belt)
export const AI_HEATMAP_CLUSTERS: HeatmapPolygon[] = [
  {
    id: 'poly-balaghat-supercluster',
    name: 'Balaghat Northeast High-Probability Anomaly (94%)',
    probability: 94,
    color: '#ef4444',
    fillColor: '#ef4444',
    coordinates: [
      [21.840, 80.170],
      [21.850, 80.220],
      [21.815, 80.245],
      [21.790, 80.210],
      [21.800, 80.160]
    ]
  },
  {
    id: 'poly-dongri-cluster',
    name: 'Dongri-Sitasaongi Syncline Anomaly (89%)',
    probability: 89,
    color: '#f97316',
    fillColor: '#f97316',
    coordinates: [
      [21.580, 79.660],
      [21.590, 79.720],
      [21.550, 79.730],
      [21.535, 79.670]
    ]
  },
  {
    id: 'poly-chikla-tirodi',
    name: 'Chikla-Tirodi Mineral Ridge Corridor (87%)',
    probability: 87,
    color: '#f97316',
    fillColor: '#f97316',
    coordinates: [
      [21.635, 79.720],
      [21.650, 79.760],
      [21.605, 79.770],
      [21.590, 79.730]
    ]
  },
  {
    id: 'poly-kandri-mansar',
    name: 'Kandri-Mansar Horseshoe Fold Complex (85%)',
    probability: 85,
    color: '#f59e0b',
    fillColor: '#f59e0b',
    coordinates: [
      [21.430, 79.260],
      [21.435, 79.310],
      [21.390, 79.320],
      [21.385, 79.265]
    ]
  },
  {
    id: 'poly-gumgaon-cluster',
    name: 'Gumgaon-Khapa Structural Axis (82%)',
    probability: 82,
    color: '#eab308',
    fillColor: '#eab308',
    coordinates: [
      [21.410, 78.980],
      [21.415, 79.025],
      [21.370, 79.030],
      [21.365, 78.985]
    ]
  },
  {
    id: 'poly-ukwa-plateau',
    name: 'Ukwa Plateau Low-Phosphorus Sheet (81%)',
    probability: 81,
    color: '#eab308',
    fillColor: '#eab308',
    coordinates: [
      [21.985, 80.440],
      [21.995, 80.490],
      [21.950, 80.505],
      [21.940, 80.445]
    ]
  }
];

export const NDVI_ANOMALY_ZONES = [
  { id: 'ndvi-1', center: [21.8100, 80.1900] as [number, number], radius: 1800, score: -0.38, label: 'Balaghat Sal Canopy Chlorosis' },
  { id: 'ndvi-2', center: [21.5580, 79.6850] as [number, number], radius: 1400, score: -0.33, label: 'Dongri Teak Canopy Chlorosis' },
  { id: 'ndvi-3', center: [21.6850, 79.7120] as [number, number], radius: 1200, score: -0.31, label: 'Tirodi Forest Mineral Stress' },
  { id: 'ndvi-4', center: [21.4150, 79.2850] as [number, number], radius: 1100, score: -0.30, label: 'Kandri Hill Vegetation Shift' },
  { id: 'ndvi-5', center: [21.9650, 80.4650] as [number, number], radius: 1500, score: -0.26, label: 'Ukwa Plateau Forest Stress' }
];

export const SOIL_MOISTURE_ZONES = [
  { id: 'sm-1', center: [21.5540, 79.6970] as [number, number], radius: 2400, moistureIndex: 82.4, status: 'Critical Bench Saturation (Dongri Pit A)' },
  { id: 'sm-2', center: [21.6880, 79.7180] as [number, number], radius: 1900, moistureIndex: 76.8, status: 'Blast Hole Moisture Alert (Tirodi Bench 2)' },
  { id: 'sm-3', center: [21.3920, 79.0040] as [number, number], radius: 1600, moistureIndex: 68.5, status: 'Moderate Moisture (Gumgaon Siding)' }
];

export const LAND_TEMP_ZONES = [
  { id: 'lt-1', center: [21.8150, 80.2000] as [number, number], radius: 2200, tempKelvin: 308.2, label: 'Balaghat Ore Thermal Inertia Crest' },
  { id: 'lt-2', center: [21.5650, 79.6800] as [number, number], radius: 1800, tempKelvin: 310.4, label: 'Dongri West Opencast Thermal Peak' },
  { id: 'lt-3', center: [21.4000, 79.2750] as [number, number], radius: 1500, tempKelvin: 310.8, label: 'Mansar Ridge Radiometric Anomaly' }
];

// HEMM Fleet Distributed Across MOIL Mines
export const FLEET_DATA: FleetEquipment[] = [
  {
    id: 'eq-exc-03',
    name: 'Hydraulic Excavator EX-03 (CAT 390F)',
    type: 'Excavator',
    location: 'Dongri Buzurg Pit A Bench 3',
    status: 'Warning',
    vibrationAnomaly: true,
    vibrationMmSec: 8.7, // High (threshold > 6.5)
    hydraulicTempC: 98,
    utilizationRate: 64,
    assignedPit: 'Dongri Buzurg Opencast',
    healthScore: 61
  },
  {
    id: 'eq-exc-01',
    name: 'Hydraulic Excavator EX-01 (CAT 390F)',
    type: 'Excavator',
    location: 'Balaghat Underground Shaft #2',
    status: 'Operational',
    vibrationAnomaly: false,
    vibrationMmSec: 2.8,
    hydraulicTempC: 72,
    utilizationRate: 94,
    assignedPit: 'Balaghat Deep Underground',
    healthScore: 96
  },
  {
    id: 'eq-dt-14',
    name: 'Off-Highway Dump Truck DT-14 (BEML 85T)',
    type: 'Haul Truck',
    location: 'Gumgaon Transit Haul Road',
    status: 'Critical Shortfall',
    vibrationAnomaly: true,
    vibrationMmSec: 9.4,
    hydraulicTempC: 104,
    utilizationRate: 38,
    assignedPit: 'Gumgaon Underground',
    healthScore: 48
  },
  {
    id: 'eq-dt-08',
    name: 'Off-Highway Dump Truck DT-08 (BEML 85T)',
    type: 'Haul Truck',
    location: 'Dongri Buzurg Secondary Crusher',
    status: 'Operational',
    vibrationAnomaly: false,
    vibrationMmSec: 3.1,
    hydraulicTempC: 75,
    utilizationRate: 88,
    assignedPit: 'Dongri Buzurg Opencast',
    healthScore: 92
  },
  {
    id: 'eq-bd-02',
    name: 'Blast-Hole Drill Rig DR-02 (Sandvik DI550)',
    type: 'Blast Drill',
    location: 'Tirodi North Bench 2',
    status: 'Operational',
    vibrationAnomaly: false,
    vibrationMmSec: 4.0,
    hydraulicTempC: 79,
    utilizationRate: 91,
    assignedPit: 'Tirodi Opencast',
    healthScore: 89
  },
  {
    id: 'eq-cr-01',
    name: 'Primary Jaw Crusher CR-01 (Metso C160)',
    type: 'Crusher',
    location: 'Balaghat Surface Processing Plant',
    status: 'Operational',
    vibrationAnomaly: false,
    vibrationMmSec: 3.4,
    hydraulicTempC: 68,
    utilizationRate: 95,
    assignedPit: 'Balaghat Surface Hub',
    healthScore: 94
  },
  {
    id: 'eq-exc-05',
    name: 'Face Excavator EX-05 (Komatsu PC1250)',
    type: 'Excavator',
    location: 'Kandri Opencast Western Limb',
    status: 'Operational',
    vibrationAnomaly: false,
    vibrationMmSec: 3.6,
    hydraulicTempC: 74,
    utilizationRate: 92,
    assignedPit: 'Kandri Opencast',
    healthScore: 91
  },
  {
    id: 'eq-dt-21',
    name: 'Dump Truck DT-21 (Caterpillar 777E)',
    type: 'Haul Truck',
    location: 'Mansar Central Haulage Ramp',
    status: 'Operational',
    vibrationAnomaly: false,
    vibrationMmSec: 3.2,
    hydraulicTempC: 76,
    utilizationRate: 89,
    assignedPit: 'Mansar Opencast',
    healthScore: 93
  },
  {
    id: 'eq-bd-06',
    name: 'Rotary Drill Rig DR-06 (Atlas Copco D65)',
    type: 'Blast Drill',
    location: 'Sitapatore Opencast Pit',
    status: 'Operational',
    vibrationAnomaly: false,
    vibrationMmSec: 3.8,
    hydraulicTempC: 77,
    utilizationRate: 86,
    assignedPit: 'Sitapatore Opencast',
    healthScore: 90
  }
];

export const OPERATIONAL_ALERTS: OperationalAlert[] = [
  {
    id: 'alert-1',
    timestamp: '12 mins ago',
    severity: 'Critical',
    category: 'Weather Impact',
    title: 'Monsoon Saturation & EX-03 Vibration Anomaly (Dongri Buzurg)',
    description: 'High soil moisture saturation (78.4%) from GPM satellite radar cell combined with EX-03 bearing vibration spikes (8.7 mm/s) risks slope slippage in Dongri Pit A footwall.',
    impact: 'Potential 8,200 MT production shortfall in battery dioxide quota if unmitigated.',
    recommendedAction: 'Reroute active tipper fleet to Dongri Pit B bench 2. Deploy submersible pump P-04.'
  },
  {
    id: 'alert-2',
    timestamp: '28 mins ago',
    severity: 'Warning',
    category: 'Blasting Delay',
    title: 'Blasting Delay & DGMS Vibration Restriction (Tirodi Bench 2)',
    description: 'Subsurface capacitive sensors indicate blast hole water logging. Proximity to boundary village requires peak particle velocity strictly under 10 mm/s.',
    impact: 'Estimated 3.5 hour delay in primary face clearing (-3,800 MT delay).',
    recommendedAction: 'Deploy electronic delay detonators (EDDs) with 25ms staggered timing to optimize blast energy without exceeding vibration thresholds.'
  },
  {
    id: 'alert-3',
    timestamp: '1 hour ago',
    severity: 'Warning',
    category: 'Supply Shortfall',
    title: 'Haulage Re-allocation for Grade Blending (Gumgaon - Balaghat)',
    description: 'Crusher CR-01 throughput capacity available while Gumgaon rail siding transit is slowed by DT-14 hydraulic overheating.',
    impact: 'Metallurgical grade blending index currently at 43.1% Mn (Target: 44.5%).',
    recommendedAction: 'Shift 3 haulage trucks from Gumgaon to Dongri Buzurg Pit B to clear backed-up ore faces (+6,200 MT recovery).'
  }
];

export const OPERATIONS_KPIS = {
  monthlyTargetMT: 145000,
  dailyTargetMT: 4833,
  dailyActualMT: 4220,
  productionVariancePct: -12.7,
  activeEquipment: 34,
  downEquipment: 4,
  fleetAvailabilityPct: 89.5,
  pitMoistureIndex: 78.4,
  safetyZeroHarmDays: 248,
  satelliteSyncStatus: 'GPM Radar, SMAP, Sentinel-2 & Landsat-9 Active (Latency: 2.8m)',
  totalOperatingMines: 11
};
