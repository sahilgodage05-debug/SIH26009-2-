"""
MOIL AI: Manganese Reserve Explorer Backend API
-----------------------------------------------
FastAPI + PyKrige Geostatistical 3D Kriging, KoBold Bayesian Prospecting,
and Multi-Parametric Remote Sensing/Geophysical Services.
Host: localhost:8000
"""

import time
import math
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from geostatistics import (
    generate_balaghat_drillholes,
    create_3d_grid,
    run_ordinary_kriging_3d,
    calculate_reserves
)
from services.parameter_engine import ParameterEngine
from services.prospector_engine import ProspectorEngine, SentinelManganeseEstimator
from services.block_model import BlockModelEngine
from services.blasting_engine import BlastingEngine
from services.fleet_engine import FleetEngine
from services.production_engine import ProductionEngine

app = FastAPI(
    title="MOIL AI: Exploration & Reserve Estimation Platform",
    description="Mathematical reserve estimation, Bayesian prospectivity, and remote sensing parameter engine for MOIL Manganese Mines.",
    version="2.0.0"
)

# Enable CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize engines
parameter_engine = ParameterEngine(base_lat=21.80, base_lng=79.80)
prospector_engine = ProspectorEngine(risk_aversion_lambda=0.25)
sentinel_estimator = SentinelManganeseEstimator(base_country_rock_grade=8.5)
block_model_engine = BlockModelEngine(block_size_x=12.0, block_size_y=12.0, block_size_z=6.0)
blasting_engine = BlastingEngine(default_rock_density=3.65)
fleet_engine = FleetEngine()
production_engine = ProductionEngine()
drillholes_cache = generate_balaghat_drillholes()

# All 11 MOIL mine center coordinates for nearest-mine distance calculations
KNOWN_MINE_CENTERS = [
    (21.8502, 80.2274),  # Balaghat
    (21.5420, 79.6780),  # Dongri Buzurg
    (21.5336, 79.7437),  # Chikla
    (21.6835, 79.7246),  # Tirodi
    (21.4078, 78.9833),  # Gumgaon
    (21.4230, 79.2885),  # Kandri
    (21.3965, 79.2725),  # Mansar
    (21.9685, 80.4680),  # Ukwa
    (21.4315, 79.3140),  # Beldongri
    (21.7180, 79.7610),  # Sitapatore
    (21.6580, 79.7085),  # Sukli
]

def _dist_to_nearest_mine(lat: float, lng: float) -> float:
    """Returns distance in meters to the nearest known MOIL mine center."""
    min_dist = float('inf')
    for mlat, mlng in KNOWN_MINE_CENTERS:
        d = math.hypot((lat - mlat) * 111.0, (lng - mlng) * 105.0) * 1000.0
        if d < min_dist:
            min_dist = d
    return min_dist

# Mount User and Shivam Backends
from user_app import app as user_app
from shivam_app import app as shivam_app

app.mount("/user", user_app)
app.mount("/shivam", shivam_app)


# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------

class ReserveEstimationRequest(BaseModel):
    cut_off_grade: float = Field(default=25.0, ge=5.0, le=50.0)
    specific_gravity: float = Field(default=3.8, ge=2.0, le=5.5)
    block_size: int = Field(default=10, ge=5, le=25)
    variogram_model: Optional[str] = Field(default="spherical")


class BlockModelRequest(BaseModel):
    cut_off_grade: float = Field(default=25.0, ge=10.0, le=50.0, description="Cut-off Grade (% Mn)")
    confidence_threshold: float = Field(default=50.0, ge=0.0, le=95.0, description="Minimum Bayesian Confidence Score (%)")
    max_slope_limit: float = Field(default=45.0, ge=20.0, le=60.0, description="Max Pit Slope Angle (deg) for Geotechnical Safety")
    variogram_model: Optional[str] = Field(default="spherical")


class BayesianPredictRequest(BaseModel):
    lat: float = Field(default=21.8025)
    lng: float = Field(default=80.1873)
    msv_anomaly: Optional[float] = Field(default=1.8)
    swir_ratio: Optional[float] = Field(default=2.1)
    resistivity: Optional[float] = Field(default=135.0)
    chargeability: Optional[float] = Field(default=24.5)
    s_density: Optional[float] = Field(default=6.5)
    elevation: Optional[float] = Field(default=340.0)
    slope_deg: Optional[float] = Field(default=22.0)
    mansar_proximity: Optional[float] = Field(default=0.85)


class SentinelPredictRequest(BaseModel):
    sentinel2_ndvi: float = Field(default=0.32, ge=-0.2, le=1.0, description="Sentinel-2 Optical NDVI (Band 8 NIR / Band 4 Red)")
    sentinel2_swir_ratio: float = Field(default=2.15, ge=0.5, le=4.0, description="Sentinel-2 2.2µm SWIR Pyrolusite Diagnostic Ratio")
    sentinel1_sar_vv_db: float = Field(default=-12.5, ge=-30.0, le=5.0, description="Sentinel-1 SAR VV Radar Backscatter σ° (dB)")
    sentinel1_soil_moisture_ssm: float = Field(default=45.0, ge=0.0, le=100.0, description="Sentinel-1 TU Wien Surface Soil Moisture (SSM %)")
    sentinel3_lst_anomaly_deg: float = Field(default=2.8, ge=-5.0, le=15.0, description="Sentinel-3 SLSTR Land Surface Temp Anomaly (°C)")
    era5_monsoon_rain_mm: float = Field(default=1150.0, ge=0.0, le=3000.0, description="ERA5-Land Cumulative Monsoonal Precipitation (P_mm)")
    fault_lineament_density: Optional[float] = Field(default=4.2, ge=0.0, le=15.0, description="DEM Sobel Fault Vector Density")
    anomaly_area_sq_m: Optional[float] = Field(default=45000.0, ge=1000.0, le=1000000.0, description="Exploration Target Area (m²)")
    inferred_depth_m: Optional[float] = Field(default=65.0, ge=5.0, le=300.0, description="Inferred Lode Depth Extent (m)")
    confidence_pct: Optional[float] = Field(default=85.0, ge=10.0, le=99.0, description="Epistemic Confidence Score (%)")


class BlastingDesignRequest(BaseModel):
    mine_id: Optional[str] = Field(default="zone-dongri-buzurg", description="Unique MOIL Mine Identifier")
    lat: Optional[float] = Field(default=21.5420, description="Latitude (deg N)")
    lng: Optional[float] = Field(default=79.6780, description="Longitude (deg E)")
    hole_diameter_mm: float = Field(default=150.0, ge=85.0, le=250.0, description="Drillhole Diameter (mm)")
    burden_m: float = Field(default=4.2, ge=2.0, le=8.0, description="Burden Distance (m)")
    spacing_m: float = Field(default=5.0, ge=2.5, le=10.0, description="Hole Spacing (m)")
    bench_height_m: float = Field(default=10.0, ge=4.0, le=20.0, description="Bench Height (m)")
    sub_drilling_m: float = Field(default=1.2, ge=0.5, le=3.0, description="Sub-drilling Depth (m)")
    stemming_m: float = Field(default=3.2, ge=1.0, le=6.0, description="Stemming Height (m)")
    powder_factor_target: float = Field(default=0.55, ge=0.25, le=1.2, description="Target Powder Factor (kg/m³)")
    explosive_relative_strength: float = Field(default=115.0, ge=80.0, le=140.0, description="Relative Weight Strength (ANFO=100, Bulk Emulsion=115)")
    rmr_rating: float = Field(default=65.0, ge=20.0, le=95.0, description="Rock Mass Rating (RMR)")
    ucs_mpa: float = Field(default=120.0, ge=30.0, le=280.0, description="Unconfined Compressive Strength (MPa)")
    distance_to_structure_m: float = Field(default=250.0, ge=50.0, le=1000.0, description="Distance to Mine Office / Structure (m)")
    use_adaptive_density: bool = Field(default=True, description="Enable AI Ore-Density Adaptive Drilling Grid")


# -------------------------------------------------------------
# API ROUTES
# -------------------------------------------------------------

@app.post("/api/v1/blasting/optimize", tags=["Drilling & Blasting Engineering"])
async def optimize_blasting_design(payload: BlastingDesignRequest):
    """
    Computes Kuz-Ram fragmentation size distribution, 3D open-pit blast pattern,
    PPV ground vibration safety limits, and satellite-derived parameter profile per mine.
    """
    try:
        # Ingest satellite & physical telemetry for specific mine
        param_engine = ParameterEngine(base_lat=payload.lat or 21.5420, base_lng=payload.lng or 79.6780)
        mine_satellite_profile = param_engine.get_mine_satellite_parameter_profile(
            mine_id=payload.mine_id or "zone-dongri-buzurg",
            lat=payload.lat or 21.5420,
            lng=payload.lng or 79.6780
        )

        effective_rmr = payload.rmr_rating if payload.rmr_rating != 65 else mine_satellite_profile["rmr_rating"]

        # 1. Calculate Lilly Blastability Index
        lilly = blasting_engine.calculate_lilly_blastability(
            rmr_rating=effective_rmr,
            unconfined_compressive_strength_mpa=payload.ucs_mpa,
            rock_density_t_m3=3.65
        )

        # 2. Compute Kuz-Ram Fragmentation
        kuz_ram = blasting_engine.compute_kuz_ram_fragmentation(
            hole_diameter_mm=payload.hole_diameter_mm,
            burden_m=payload.burden_m,
            spacing_m=payload.spacing_m,
            bench_height_m=payload.bench_height_m,
            sub_drilling_m=payload.sub_drilling_m,
            stemming_m=payload.stemming_m,
            powder_factor_kg_m3=payload.powder_factor_target,
            explosive_relative_weight_strength=payload.explosive_relative_strength,
            blastability_index=lilly["blastability_index"]
        )

        # 3. Generate 3D Blast Pattern Grid (Mine-Specific Satellite & Geotechnical Dimensions)
        num_rows = mine_satellite_profile.get("num_rows", 5)
        holes_per_row = mine_satellite_profile.get("holes_per_row", 9)
        bench_height = payload.bench_height_m if payload.bench_height_m != 10.0 else mine_satellite_profile.get("bench_height_m", 10.0)

        # Extract mine-specific geological parameters from satellite profile
        ore_center_offset = mine_satellite_profile.get("ore_center_offset", {"x": 14.0, "y": 12.0})
        pit_length_m = mine_satellite_profile.get("pit_length_m", 45.0)
        pit_width_m = mine_satellite_profile.get("pit_width_m", 28.0)
        elevation_m = mine_satellite_profile.get("elevation_m", 310.0)
        
        # Parse strike angle from profile string (e.g., "N65°E" -> 65.0)
        strike_str = mine_satellite_profile.get("strike", "N65°E")
        try:
            strike_deg = float(''.join(c for c in strike_str if c.isdigit() or c == '.'))
        except (ValueError, TypeError):
            strike_deg = 65.0
        
        # Parse dip angle from profile string (e.g., "55° NW" -> 55.0)
        dip_str = mine_satellite_profile.get("dip", "55° NW")
        try:
            dip_deg = float(''.join(c for c in dip_str.split('°')[0] if c.isdigit() or c == '.'))
        except (ValueError, TypeError):
            dip_deg = 55.0
        
        # Derive mine-specific Mn grade range from profile
        mn_grade_max = mine_satellite_profile.get("mn_grade_pct", 44.0)
        # Lower bound derived from overburden ratio (higher ratio = more waste = lower min grade)
        overburden_str = mine_satellite_profile.get("overburden_ratio", "1 : 2.8")
        try:
            ob_ratio = float(overburden_str.split(':')[-1].strip())
        except (ValueError, IndexError):
            ob_ratio = 2.8
        mn_grade_min = max(12.0, 22.0 - ob_ratio * 2.5)

        pattern_3d = blasting_engine.generate_blast_pattern_3d(
            num_rows=num_rows,
            holes_per_row=holes_per_row,
            burden_m=payload.burden_m,
            spacing_m=payload.spacing_m,
            bench_height_m=bench_height,
            sub_drilling_m=payload.sub_drilling_m,
            stemming_m=payload.stemming_m,
            pattern_type="staggered",
            use_adaptive_density=payload.use_adaptive_density,
            ore_center_offset=ore_center_offset,
            mn_grade_min=mn_grade_min,
            mn_grade_max=mn_grade_max,
            strike_deg=strike_deg,
            dip_deg=dip_deg,
            elevation_m=elevation_m,
            pit_length_m=pit_length_m,
            pit_width_m=pit_width_m
        )

        # 4. USBM Ground Vibration PPV
        vibration = blasting_engine.calculate_ppv_vibration(
            max_charge_per_delay_kg=kuz_ram["explosive_mass_per_hole_kg"],
            distance_to_structure_m=payload.distance_to_structure_m
        )

        # 5. Mine geological context for frontend dynamic labels
        mine_geological_context = {
            "base_lat": mine_satellite_profile.get("base_lat", payload.lat or 21.5420),
            "base_lng": mine_satellite_profile.get("base_lng", payload.lng or 79.6780),
            "strike": mine_satellite_profile.get("strike", "N65°E"),
            "dip": mine_satellite_profile.get("dip", "55° NW"),
            "overburden_ratio": mine_satellite_profile.get("overburden_ratio", "1 : 2.8"),
            "elevation_m": elevation_m,
            "mn_grade_pct": mn_grade_max,
            "mn_grade_range": [round(mn_grade_min, 1), round(mn_grade_max, 1)],
            "pit_length_m": pit_length_m,
            "pit_width_m": pit_width_m,
            "strike_deg": strike_deg,
            "dip_deg": dip_deg
        }

        return {
            "status": "success",
            "mine_type": "MOIL Open-Pit Manganese Operation",
            "mine_satellite_profile": mine_satellite_profile,
            "mine_geological_context": mine_geological_context,
            "blastability": lilly,
            "fragmentation_kuz_ram": kuz_ram,
            "blast_pattern_3d": pattern_3d,
            "vibration_ppv": vibration
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/pit-design/economic-stripping-ratio", tags=["Pit Design & Economic Limits"])
async def get_economic_stripping_ratio_analysis():
    """
    Returns Geological Strike/Dip vectors, Break-Even Stripping Ratio cutoff limits,
    and irregular pit clustering geometry based on natural manganese seam apexes.
    """
    try:
        engine = ParameterEngine()
        analysis = engine.compute_geological_strike_dip_stripping_ratio(
            mn_grade_pct=44.0,
            ore_price_per_tonne_usd=165.0,
            mining_processing_cost_per_t_usd=48.0,
            waste_removal_cost_per_m3_usd=24.5,
            strike_orientation_deg=65.0,
            dip_angle_deg=55.0
        )
        return {
            "status": "success",
            "geological_formation": "Sausar Group Mansar Formation Manganese Ore Lode",
            "economic_stripping_analysis": analysis
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """
    Returns server health, engine status, and runtime environment.
    """
    return {
        "status": "online",
        "service": "MOIL AI 3D Block Model & KoBold Exploration Platform",
        "version": "2.0.0",
        "engines": {
            "pykrige_3d": "active (vectorized)",
            "kobold_bayesian_ai": "active (ensemble rf+gb)",
            "parameter_engine": "active (multi-spectral + geophysical)"
        },
        "target_region": "Sausar Manganese Belt (Balaghat, Central India)"
    }


@app.get("/api/v1/spatial/layers", tags=["Phase 1: Remote Sensing & Geophysics"])
async def get_spatial_layers(resolution: int = Query(default=40, ge=20, le=80)):
    """
    Returns raster matrices and spatial parameters:
    1. Sentinel-2 / ASTER: NDVI, Metal-Stressed Vegetation (MSV), SWIR-2 Manganese Oxide Index
    2. Subsurface ERT & IP: Resistivity and Chargeability slices down to -300m
    3. Topographic: DEM Elevation, Slope Angle (deg), Mining Feasibility Index (MFI), Haul-Road Viability
    """
    try:
        spectral = parameter_engine.compute_spectral_indices(grid_size=resolution)
        electrical = parameter_engine.compute_electrical_inversion(nx=resolution, nz=25, max_depth_m=300.0)
        topo = parameter_engine.compute_topography_and_feasibility(grid_size=resolution, cell_size_m=12.0)

        return {
            "region": "Balaghat - Sausar Belt",
            "grid_size": resolution,
            "spectral_indices": {
                "ndvi": spectral["ndvi"].tolist(),
                "msv_anomaly": spectral["msv_anomaly"].tolist(),
                "swir_ratio": spectral["swir_ratio"].tolist()
            },
            "electrical_inversion": {
                "x_coords": electrical["x_coords"],
                "z_depths": electrical["z_depths"],
                "resistivity_ohm_m": electrical["resistivity_ohm_m"].tolist(),
                "chargeability_ms": electrical["chargeability_ms"].tolist(),
                "e_anomaly": electrical["e_anomaly"].tolist()
            },
            "topography_and_feasibility": {
                "dem_elevation_m": topo["dem_elevation_m"].tolist(),
                "slope_deg": topo["slope_deg"].tolist(),
                "tri": topo["tri"].tolist(),
                "structural_density": topo["structural_density"].tolist(),
                "mining_feasibility_index": topo["mining_feasibility_index"].tolist(),
                "haul_road_viable": topo["haul_road_viable"].tolist()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating spatial layers: {str(e)}"
        )


@app.post("/api/v1/predict/scoring", tags=["Phase 2: KoBold Bayesian AI"])
async def predict_bayesian_scoring(payload: BayesianPredictRequest):
    """
    KoBold-Style Multi-Modal AI Prospecting:
    Assembles feature vector, computes ensemble prior probability,
    quantifies epistemic uncertainty, and yields the penalized confidence score.
    """
    try:
        # Distance to nearest known MOIL mine deposit / drillhole
        dist_to_nearest = _dist_to_nearest_mine(payload.lat, payload.lng)
        
        # Assemble feature vector
        X_scaled = prospector_engine.assemble_feature_vector(
            msv_anomaly=payload.msv_anomaly or 1.8,
            swir_ratio=payload.swir_ratio or 2.1,
            resistivity=payload.resistivity or 135.0,
            chargeability=payload.chargeability or 24.5,
            s_density=payload.s_density or 6.5,
            elevation=payload.elevation or 340.0,
            slope_deg=payload.slope_deg or 22.0,
            mansar_proximity=payload.mansar_proximity or 0.85
        )

        prior_p = prospector_engine.predict_prior_probability(X_scaled)
        cs, posterior_p, uncertainty = prospector_engine.calculate_confidence_score(
            prior_p=prior_p,
            dist_to_drillhole_m=dist_to_nearest
        )

        # Exploration Decision Classification
        if cs >= 80.0:
            recommendation = "Class A Drill Target: Immediate Reverse Circulation (RC) Drilling Recommended"
            priority = "High (Tier 1)"
        elif cs >= 55.0:
            recommendation = "Class B Target: Infill ERT / Induced Polarization Ground Survey Required"
            priority = "Medium (Tier 2)"
        else:
            recommendation = "Class C Speculative: Structural Reconnaissance / Drone Magnetometry Required"
            priority = "Low (Tier 3)"

        return {
            "coordinates": {"lat": payload.lat, "lng": payload.lng},
            "bayesian_confidence_score": cs,
            "prior_probability": round(prior_p, 3),
            "posterior_probability": posterior_p,
            "epistemic_uncertainty": uncertainty,
            "exploration_priority": priority,
            "ai_recommendation": recommendation,
            "feature_attribution": {
                "metal_stressed_veg_score": payload.msv_anomaly,
                "swir_manganese_ratio": payload.swir_ratio,
                "apparent_resistivity_ohm_m": payload.resistivity,
                "ip_chargeability_ms": payload.chargeability,
                "lineament_density": payload.s_density
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing Bayesian prospectivity: {str(e)}"
        )


class BatchPredictPoint(BaseModel):
    lat: float
    lng: float
    msv_anomaly: float = 1.8
    swir_ratio: float = 2.1
    resistivity: float = 135.0
    chargeability: float = 24.5
    s_density: float = 6.5
    elevation: float = 340.0
    slope_deg: float = 22.0
    mansar_proximity: float = 0.85


class BatchPredictRequest(BaseModel):
    points: List[BatchPredictPoint]


@app.post("/api/v1/predict/scoring/batch", tags=["Phase 2: KoBold Bayesian AI"])
async def predict_bayesian_scoring_batch(payload: BatchPredictRequest):
    """
    Batch KoBold Bayesian AI scoring: accepts up to 2000 points at once.
    Returns confidence scores for each point.
    """
    try:
        results = []
        for pt in payload.points:
            dist_to_nearest = _dist_to_nearest_mine(pt.lat, pt.lng)

            X_scaled = prospector_engine.assemble_feature_vector(
                msv_anomaly=pt.msv_anomaly,
                swir_ratio=pt.swir_ratio,
                resistivity=pt.resistivity,
                chargeability=pt.chargeability,
                s_density=pt.s_density,
                elevation=pt.elevation,
                slope_deg=pt.slope_deg,
                mansar_proximity=pt.mansar_proximity
            )

            prior_p = prospector_engine.predict_prior_probability(X_scaled)
            cs, posterior_p, uncertainty = prospector_engine.calculate_confidence_score(
                prior_p=prior_p,
                dist_to_drillhole_m=dist_to_nearest
            )

            if cs >= 80.0:
                priority = "High (Tier 1)"
            elif cs >= 55.0:
                priority = "Medium (Tier 2)"
            else:
                priority = "Low (Tier 3)"

            results.append({
                "lat": pt.lat,
                "lng": pt.lng,
                "score": round(cs, 1),
                "priority": priority
            })

        return {"predictions": results}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch prediction error: {str(e)}"
        )


@app.post("/api/prospecting/sentinel-manganese-predict", tags=["Sentinel Multi-Satellite Engine"])
async def predict_sentinel_manganese_reserve(payload: SentinelPredictRequest):
    """
    Domain-Specific Mining Engineering Algorithm:
    Fuses Sentinel-2 (NDVI, SWIR), Sentinel-1 (SAR Backscatter σ°, Soil Moisture SSM %),
    Sentinel-3 (LST Thermal Anomaly ΔLST), and ERA5-Land (Monsoonal Rainfall)
    to predict Manganese Grade (% Mn) and Ore Tonnage (Metric Tons).
    """
    try:
        grade_res = sentinel_estimator.predict_manganese_grade(
            sentinel2_ndvi=payload.sentinel2_ndvi,
            sentinel2_swir_ratio=payload.sentinel2_swir_ratio,
            sentinel1_sar_vv_db=payload.sentinel1_sar_vv_db,
            sentinel1_soil_moisture_ssm=payload.sentinel1_soil_moisture_ssm,
            sentinel3_lst_anomaly_deg=payload.sentinel3_lst_anomaly_deg,
            era5_monsoon_rain_mm=payload.era5_monsoon_rain_mm,
            fault_lineament_density=payload.fault_lineament_density or 4.2
        )

        tonnage_res = sentinel_estimator.estimate_ore_tonnage(
            predicted_mn_percent=grade_res["predicted_mn_percent"],
            anomaly_area_sq_m=payload.anomaly_area_sq_m or 45000.0,
            inferred_depth_m=payload.inferred_depth_m or 65.0,
            epistemic_confidence_pct=payload.confidence_pct or 85.0
        )

        return {
            "sentinel_ecosystem_inputs": {
                "sentinel2_ndvi": payload.sentinel2_ndvi,
                "sentinel2_swir_ratio": payload.sentinel2_swir_ratio,
                "sentinel1_sar_vv_db": payload.sentinel1_sar_vv_db,
                "sentinel1_soil_moisture_ssm": payload.sentinel1_soil_moisture_ssm,
                "sentinel3_lst_anomaly_deg": payload.sentinel3_lst_anomaly_deg,
                "era5_monsoon_rain_mm": payload.era5_monsoon_rain_mm
            },
            "manganese_grade": grade_res,
            "reserve_tonnage": tonnage_res
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error in Sentinel Manganese prediction: {str(e)}"
        )


@app.post("/api/v1/reserve/block-model", tags=["Phase 3: 3D Voxel Block Model"])
async def get_3d_block_model(payload: BlockModelRequest):
    """
    3D Block Modeling & Geostatistical Reserve Quantification:
    1. Computes 3D Ordinary Kriging using PyKrige.
    2. Applies dynamic bulk density assignment (4.1 / 3.6 / 2.7 t/m³).
    3. Excludes blocks violating slope/depth geotechnical criteria.
    4. Calculates UNFC / JORC Proven and Probable reserves and stripping ratios.
    5. Returns array of 3D voxel blocks formatted for Three.js rendering.
    """
    start_time = time.time()
    try:
        model_output = block_model_engine.construct_block_model(
            cut_off_grade=payload.cut_off_grade,
            confidence_threshold=payload.confidence_threshold,
            max_slope_limit=payload.max_slope_limit,
            variogram_model=payload.variogram_model or "spherical"
        )
        duration = round(time.time() - start_time, 3)
        model_output["computation_time_seconds"] = duration
        return model_output
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error computing 3D block model: {str(e)}"
        )


@app.post("/api/v1/estimate-reserve", tags=["Legacy Compatibility"])
async def estimate_reserve(payload: ReserveEstimationRequest):
    """
    Legacy reserve calculation endpoint for 2D UI compatibility.
    """
    try:
        df = drillholes_cache
        xpoints, ypoints, zpoints, bbox_info = create_3d_grid(df, block_size=payload.block_size)
        k3d, ss3d, variogram_info = run_ordinary_kriging_3d(
            df=df, xpoints=xpoints, ypoints=ypoints, zpoints=zpoints,
            variogram_model=payload.variogram_model or "spherical"
        )
        reserves = calculate_reserves(
            k3d_grades=k3d, block_size=payload.block_size,
            specific_gravity=payload.specific_gravity, cut_off_grade=payload.cut_off_grade
        )
        return {
            "mine_name": "MOIL Balaghat Manganese Mine",
            "cut_off_grade": payload.cut_off_grade,
            "specific_gravity": payload.specific_gravity,
            "block_size_m": payload.block_size,
            "total_blocks_evaluated": reserves["total_blocks_evaluated"],
            "ore_blocks_count": reserves["ore_blocks_count"],
            "waste_blocks_count": reserves["waste_blocks_count"],
            "total_tonnage": reserves["total_tonnage"],
            "total_tonnage_mt": reserves["total_tonnage_mt"],
            "average_grade": reserves["average_grade"],
            "waste_tonnage": reserves["waste_tonnage"],
            "waste_tonnage_mt": reserves["waste_tonnage_mt"],
            "stripping_ratio": reserves["stripping_ratio"],
            "metal_content_tonnes": reserves["metal_content_tonnes"],
            "grade_tonnage_curve": reserves["grade_tonnage_curve"],
            "bounding_box": bbox_info,
            "variogram_parameters": variogram_info,
            "status": "success"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/drillholes", tags=["Data"])
async def get_drillholes(limit: int = Query(default=100, ge=1, le=1000)):
    df = drillholes_cache.head(limit)
    return {
        "total_composites": len(drillholes_cache),
        "returned_composites": len(df),
        "data": df.to_dict(orient="records")
    }


# -------------------------------------------------------------
# DYNAMIC FLEET MANAGEMENT & PRODUCTION COMMAND CENTER APIS
# -------------------------------------------------------------

class TruckRerouteRequest(BaseModel):
    truck_id: str = Field(description="ID of the haul truck to reroute (e.g. HT-104)")
    target_destination: str = Field(description="Target geofence destination (e.g. GF-CRUSHER-1, GF-SHOVEL-A)")


@app.get("/api/v1/fleet/status/{mine_id}", tags=["Dynamic Fleet Management"])
async def get_fleet_status(mine_id: str):
    """
    Returns live GPS locations, telemetry, haul road topology, geofences,
    and shovels for the specified MOIL mine pit network.
    """
    try:
        return fleet_engine.get_or_create_mine_fleet(mine_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching fleet status: {str(e)}")


@app.get("/api/v1/fleet/match-factor/{mine_id}", tags=["Dynamic Fleet Management"])
async def get_fleet_match_factor(mine_id: str):
    """
    Returns the Phelps-Morgan Shovel-Truck Match Factor, queue states,
    and shovel/truck utilization metrics for real-time dispatch balancing.
    """
    try:
        return fleet_engine.calculate_match_factor(mine_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating match factor: {str(e)}")


@app.post("/api/v1/fleet/reroute/{mine_id}", tags=["Dynamic Fleet Management"])
async def reroute_haul_truck(mine_id: str, payload: TruckRerouteRequest):
    """
    Triggers dynamic geofenced rerouting of a haul truck to bypass congestion or starving shovels.
    """
    try:
        return fleet_engine.reroute_truck(mine_id, payload.truck_id, payload.target_destination)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error rerouting truck: {str(e)}")


@app.get("/api/v1/production/shortfall/{mine_id}", tags=["Production Engineering & Shortfall"])
async def get_production_shortfall(mine_id: str):
    """
    Calculates hourly actual vs target manganese yield, cumulative gap,
    and projected end-of-shift deficit with root-cause bottleneck attribution.
    """
    try:
        return production_engine.calculate_production_shortfall(mine_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating shortfall: {str(e)}")


@app.get("/api/v1/production/corrective-actions/{mine_id}", tags=["Production Engineering & Shortfall"])
async def get_corrective_actions(mine_id: str):
    """
    Returns prioritized engineering corrective actions (dispatch redeployment,
    grade blending, hot-seat scheduling, blast clearance) to eliminate ore deficit.
    """
    try:
        return production_engine.get_corrective_actions(mine_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching corrective actions: {str(e)}")


@app.get("/api/v1/production/hemm-reliability/{mine_id}", tags=["Production Engineering & Shortfall"])
async def get_hemm_reliability(mine_id: str):
    """
    Returns MTBF, MTTR, availability, and failure probability for all active HEMM excavators/drills.
    """
    try:
        return production_engine.get_hemm_reliability(mine_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating HEMM reliability: {str(e)}")


@app.get("/api/v1/production/geotechnical-overlay/{mine_id}", tags=["Space-Technology & Geotechnical"])
async def get_geotechnical_overlay(mine_id: str):
    """
    Returns Satellite InSAR slope displacement, highwall stability FoS,
    hazard bench tagging, pit catchment runoff, and sump dewatering booster pump telemetry.
    """
    try:
        return production_engine.get_geotechnical_and_space_overlays(mine_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching geotechnical overlay: {str(e)}")


@app.get("/api/v1/production/solve-lp-reallocation/{mine_id}", tags=["Production Engineering & Shortfall"])
async def solve_lp_reallocation(mine_id: str):
    """
    Solves Linear Programming / Min-Cost Flow rebalancing to reallocate haul trucks
    to secondary open benches with equivalent manganese grades.
    """
    try:
        return production_engine.solve_linear_programming_reallocation(mine_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error executing LP solver: {str(e)}")


@app.get("/api/v1/fleet/workers-roster/{mine_id}", tags=["Dynamic Fleet Management"])
async def get_workers_roster(mine_id: str):
    """
    Returns the mine site operational personnel roster strictly derived from CSV Workers_Count,
    including certified haulage drivers, shovel operators, drilling masters, and hot-seat relief pool.
    """
    try:
        state = fleet_engine.get_or_create_mine_fleet(mine_id)
        return state.get("workforce_roster", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching workforce roster: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

