from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
import json
from typing import List, Dict
from datetime import date
from setup_database import Equipment, Base
from ml_service import get_machine_risk_score
from optimization_service import optimize_equipment_redeployment
from mine_intelligence import calculate_mine_safety_score

app = FastAPI(title="MOIL Mining Intelligence Platform - Equipment API")

# Add CORS Middleware to allow frontend on port 8000 to fetch data
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict this to the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect to DB
db_path = os.path.join(os.path.dirname(__file__), "moil_equipment.db")
engine = create_engine(f"sqlite:///{db_path}")
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Pydantic models for API responses
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

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "FastAPI Backend is running"}

@app.get("/api/mines/locations")
def get_mine_locations():
    """Serves the JSON file containing the actual GPS coordinates of the 11 MOIL mines"""
    mines_file = os.path.join(os.path.dirname(__file__), 'data', 'moil_mines.json')
    if os.path.exists(mines_file):
        with open(mines_file, 'r') as f:
            return json.load(f)
    return []

@app.get("/api/equipment", response_model=List[EquipmentResponse])
def get_equipments():
    db = SessionLocal()
    equipments = db.query(Equipment).all()
    db.close()
    return equipments

@app.get("/api/equipment/{mine_name}", response_model=List[EquipmentResponse])
def get_equipment_by_mine(mine_name: str):
    db = SessionLocal()
    equipments = db.query(Equipment).filter(Equipment.mine_location == mine_name).all()
    db.close()
    return equipments

@app.get("/api/mine/{mine_name}/safety")
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

@app.post("/api/predict")
def predict_machine_health(telemetry: TelemetryInput):
    """
    Predicts the risk of failure using the XGBoost Model based on live telemetry.
    """
    prediction = get_machine_risk_score(telemetry.dict())
    return {
        "machine_id": telemetry.machine_id,
        "prediction": prediction
    }

@app.post("/api/optimize/{failed_machine_id}")
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

