"""
MOIL AI: Manganese Reserve Explorer & Integrated Mine Intelligence Backend API
-----------------------------------------------------------------------------
FastAPI + PyKrige Geostatistical 3D Kriging, KoBold Bayesian Prospecting,
Multi-Parametric Remote Sensing/Geophysical Services, and Equipment Operations.
Host: localhost:8000
"""

import os
import time
import math
import json
from typing import List, Dict, Any, Optional
from datetime import date
from fastapi import FastAPI, Query, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# -------------------------------------------------------------
# ADITI: EXPLORATION & RESERVE SERVICES
# -------------------------------------------------------------
from backend.geostatistics import (
    generate_dongri_drillholes,
    create_3d_grid,
    run_ordinary_kriging_3d,
    calculate_reserves
)
from backend.services.parameter_engine import ParameterEngine
from backend.services.prospector_engine import ProspectorEngine
from backend.services.block_model import BlockModelEngine

# -------------------------------------------------------------
# SHIVAM: EQUIPMENT & MINE INTELLIGENCE SERVICES
# -------------------------------------------------------------
try:
    from backend.setup_database import Equipment, Base
    from backend.ml_service import get_machine_risk_score
    from backend.optimization_service import optimize_equipment_redeployment
    from backend.mine_intelligence import calculate_mine_safety_score
except Exception:
    try:
        from setup_database import Equipment, Base
        from ml_service import get_machine_risk_score
        from optimization_service import optimize_equipment_redeployment
        from mine_intelligence import calculate_mine_safety_score
    except Exception:
        Equipment, Base = None, None
        get_machine_risk_score = None
        optimize_equipment_redeployment = None
        calculate_mine_safety_score = None

app = FastAPI(
    title="MOIL AI: Exploration & Mine Intelligence Platform",
    description="Integrated 3D Block Modeling, Bayesian Prospectivity, Remote Sensing, Equipment Intelligence & Operations API for MOIL Manganese Mines.",
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

# Initialize Exploration Engines
parameter_engine = ParameterEngine(base_lat=21.80, base_lng=79.80)
prospector_engine = ProspectorEngine(risk_aversion_lambda=0.25)
block_model_engine = BlockModelEngine(block_size_x=12.0, block_size_y=12.0, block_size_z=6.0)
drillholes_cache = generate_dongri_drillholes()

# Connect to DB for Equipment Intelligence
db_path = os.path.join(os.path.dirname(__file__), "moil_equipment.db")
engine = create_engine(f"sqlite:///{db_path}")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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


class EquipmentResponse(BaseModel):
    id: int
    machine_id: str
    type: str
    capacity: str
    mine_location: str
    status: str
    purchase_date: date
    last_serviced_date: date
    health_score: float
    workers_count: str
    has_fuel_sensor: int = 0
    fuel_capacity: float | None = None
    current_fuel_level: float | None = None
    engine_temperature: float | None = None
    vibration_level: float | None = None

    class Config:
        from_attributes = True


class TelemetryInput(BaseModel):
    machine_id: str
    engine_temperature: float
    vibration_level: float
    days_since_service: int
    operating_hours: float
    current_fuel_level: float | None = None
    fuel_capacity: float | None = None


# -------------------------------------------------------------
# API ROUTES: SYSTEM & HEALTH
# -------------------------------------------------------------

@app.get("/api/v1/health", tags=["System"])
@app.get("/api/health", tags=["System"])
async def health_check():
    """
    Returns server health, engine status, and runtime environment.
    """
    return {
        "status": "online",
        "service": "MOIL AI 3D Block Model, KoBold Exploration & Equipment Operations Platform",
        "version": "2.0.0",
        "engines": {
            "pykrige_3d": "active (vectorized)",
            "kobold_bayesian_ai": "active (ensemble rf+gb)",
            "parameter_engine": "active (multi-spectral + geophysical)",
            "equipment_telemetry": "active (sqlite + xgboost)"
        },
        "target_region": "Sausar Manganese Belt (Balaghat - Dongri Buzurg, Central India)"
    }


# -------------------------------------------------------------
# API ROUTES: EXPLORATION & REMOTE SENSING
# -------------------------------------------------------------

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
            "region": "Dongri Buzurg - Balaghat Sausar Belt",
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
        # Distance to nearest known deposit / drillhole
        dist_to_dongri = math.hypot((payload.lat - 21.5540) * 111.0, (payload.lng - 79.6974) * 105.0) * 1000.0
        
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
            dist_to_drillhole_m=dist_to_dongri
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
            "mine_name": "MOIL Dongri Buzurg Manganese Mine",
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
# API ROUTES: EQUIPMENT & MINE INTELLIGENCE OPERATIONS
# -------------------------------------------------------------

@app.get("/api/mines/locations", tags=["Equipment & Operations"])
def get_mine_locations():
    """Serves the JSON file containing the actual GPS coordinates of the 11 MOIL mines"""
    mines_file = os.path.join(os.path.dirname(__file__), 'data', 'moil_mines.json')
    if os.path.exists(mines_file):
        with open(mines_file, 'r') as f:
            return json.load(f)
    return []


@app.get("/api/equipment", response_model=List[EquipmentResponse], tags=["Equipment & Operations"])
def get_equipments():
    db = SessionLocal()
    equipments = db.query(Equipment).all()
    db.close()
    return equipments


@app.get("/api/equipment/{mine_name}", response_model=List[EquipmentResponse], tags=["Equipment & Operations"])
def get_equipment_by_mine(mine_name: str):
    db = SessionLocal()
    equipments = db.query(Equipment).filter(Equipment.mine_location == mine_name).all()
    db.close()
    return equipments


@app.get("/api/mine/{mine_name}/safety", tags=["Equipment & Operations"])
def get_mine_safety(mine_name: str):
    """
    Calculates the Operational Safety Score of a specific mine based on its equipment.
    """
    db = SessionLocal()
    equipments = db.query(Equipment).filter(Equipment.mine_location == mine_name).all()
    db.close()
    
    if not equipments:
        raise HTTPException(status_code=404, detail="Mine or equipment not found")
        
    return calculate_mine_safety_score(equipments)


@app.post("/api/predict", tags=["Equipment & Operations"])
def predict_machine_health(telemetry: TelemetryInput):
    """
    Predicts the risk of failure using the XGBoost Model based on live telemetry.
    """
    prediction = get_machine_risk_score(telemetry.dict())
    return {
        "machine_id": telemetry.machine_id,
        "prediction": prediction
    }


@app.post("/api/optimize/{failed_machine_id}", tags=["Equipment & Operations"])
def optimize_redeployment(failed_machine_id: str):
    """
    If a machine fails, this API triggers Google OR-Tools/Optimization Engine
    to find the closest idle machine of the same type across all mines.
    """
    db = SessionLocal()
    failed_machine = db.query(Equipment).filter(Equipment.machine_id == failed_machine_id).first()
    
    if not failed_machine:
        db.close()
        raise HTTPException(status_code=404, detail="Machine not found")
        
    all_idle_machines = db.query(Equipment).filter(Equipment.status == 'Idle').all()
    
    recommendation = optimize_equipment_redeployment(
        failed_machine_type=failed_machine.type,
        failed_machine_mine=failed_machine.mine_location,
        all_idle_machines=all_idle_machines
    )
    
    db.close()
    return recommendation


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
