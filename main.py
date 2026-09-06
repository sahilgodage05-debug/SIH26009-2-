from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import pickle
import pandas as pd
import uvicorn
import os
import requests
from datetime import datetime, timedelta, date

app = FastAPI(title="Pan-India Mining Weather Pipeline")

PAN_INDIA_MINES = {
    # Maharashtra
    "Dongri Buzurg": {"lat": 21.53, "lon": 79.69, "type": "Opencast"},
    "Chikla": {"lat": 21.54, "lon": 79.74, "type": "Underground"},
    "Kandri": {"lat": 21.41, "lon": 79.28, "type": "Underground"},
    "Munsar": {"lat": 21.40, "lon": 79.29, "type": "Underground"},
    "Beldongri": {"lat": 21.39, "lon": 79.31, "type": "Underground"},
    "Gumgaon": {"lat": 21.36, "lon": 78.96, "type": "Underground"},
    "Parsoda": {"lat": 21.38, "lon": 79.30, "type": "Opencast"},
    # Madhya Pradesh
    "Balaghat": {"lat": 21.80, "lon": 80.18, "type": "Underground"},
    "Ukwa": {"lat": 21.97, "lon": 80.46, "type": "Underground"},
    "Tirodi": {"lat": 21.69, "lon": 79.70, "type": "Opencast"},
    "Sitapatore": {"lat": 21.68, "lon": 79.72, "type": "Opencast"}
}

# Load the model on startup
model = None
MODEL_PATH = "xgboost_pan_india_model.pkl"

prescriptive_model = None
action_encoder = None
mine_type_encoder = None
PRESCRIPTIVE_MODEL_PATH = "prescriptive_rescheduling_model.pkl"
ENCODER_PATH = "action_encoder.pkl"
MINE_TYPE_ENCODER_PATH = "mine_type_encoder.pkl"

@app.on_event("startup")
def load_model():
    global model
    global prescriptive_model, action_encoder, mine_type_encoder
    
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            model = pickle.load(f)
    else:
        print(f"Warning: Model file {MODEL_PATH} not found. Please train the model first.")
        
    if os.path.exists(PRESCRIPTIVE_MODEL_PATH) and os.path.exists(ENCODER_PATH) and os.path.exists(MINE_TYPE_ENCODER_PATH):
        with open(PRESCRIPTIVE_MODEL_PATH, "rb") as f:
            prescriptive_model = pickle.load(f)
        with open(ENCODER_PATH, "rb") as f:
            action_encoder = pickle.load(f)
        with open(MINE_TYPE_ENCODER_PATH, "rb") as f:
            mine_type_encoder = pickle.load(f)
    else:
        print("Warning: Prescriptive model files not found.")

class WeatherInput(BaseModel):
    Temp_Max: float
    Temp_Min: float
    Soil_Moisture: float
    Month: int

class ScheduleInput(BaseModel):
    Mine_Name: str
    temperature_2m: float
    precipitation: float
    soil_moisture_0_to_7cm: float
    Rolling_72h_Rainfall: float
    Pending_Target_Tons: float
    Days_To_Deadline: float
    Daily_Extraction_Capacity: float
    Overtime_Capacity_hrs: float

@app.get("/api/locations")
def get_locations():
    return PAN_INDIA_MINES

@app.post("/api/predict-weather")
def predict_weather(input_data: WeatherInput):
    if model is None:
        raise HTTPException(status_code=503, detail="Model is not loaded.")
    
    # Create DataFrame for prediction
    df = pd.DataFrame([input_data.model_dump()])
    
    # Predict
    prediction = model.predict(df)[0]
    probability = model.predict_proba(df)[0][1]
    
    risk_level = "High" if prediction == 1 else "Low"
    
    return {
        "High_Risk_Weather": bool(prediction == 1),
        "Risk_Level": risk_level,
        "Probability": float(probability),
        "Message": f"The weather risk is {risk_level} with a probability of {probability:.1%}."
    }

@app.post("/api/recommend-schedule")
def recommend_schedule(input_data: ScheduleInput):
    if prescriptive_model is None or action_encoder is None or mine_type_encoder is None:
        raise HTTPException(status_code=503, detail="Prescriptive model is not loaded.")
        
    if input_data.Mine_Name not in PAN_INDIA_MINES:
        raise HTTPException(status_code=404, detail="Mine location not found.")
        
    mine_type = PAN_INDIA_MINES[input_data.Mine_Name]["type"]
    mine_type_encoded = mine_type_encoder.transform([mine_type])[0]
        
    # Create DataFrame for prediction
    data_dict = input_data.model_dump()
    data_dict['Mine_Type_Encoded'] = mine_type_encoded
    
    # Remove Mine_Name from features
    del data_dict['Mine_Name']
    
    # Ensure correct order
    features = [
        'Mine_Type_Encoded',
        'temperature_2m', 
        'precipitation', 
        'soil_moisture_0_to_7cm', 
        'Rolling_72h_Rainfall', 
        'Pending_Target_Tons', 
        'Days_To_Deadline', 
        'Daily_Extraction_Capacity',
        'Overtime_Capacity_hrs'
    ]
    df = pd.DataFrame([data_dict])[features]
    
    # Predict
    prediction_idx = prescriptive_model.predict(df)[0]
    recommended_action = action_encoder.inverse_transform([prediction_idx])[0]
    
    return {
        "Recommended_Action": recommended_action,
        "Message": f"Based on the environmental and operational factors, the AI recommends: {recommended_action}"
    }

@app.get("/api/get-schedule")
def get_schedule(location: str):
    if location not in PAN_INDIA_MINES:
        raise HTTPException(status_code=404, detail="Location not found")
        
    coords = PAN_INDIA_MINES[location]
    
    # Fetch hourly forecast for the next 2 days
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": coords["lat"],
        "longitude": coords["lon"],
        "hourly": "precipitation",
        "timezone": "auto",
        "forecast_days": 2
    }
    
    response = requests.get(url, params=params)
    if not response.ok:
        raise HTTPException(status_code=500, detail="Error fetching forecast data")
        
    data = response.json()
    times = data["hourly"]["time"]
    precip = data["hourly"]["precipitation"]
    
    # Analyze tomorrow's forecast
    tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    rain_hours = []
    for t, p in zip(times, precip):
        if t.startswith(tomorrow) and p > 1.0: # More than 1mm per hour is notable rain
            dt = datetime.fromisoformat(t)
            rain_hours.append(dt)
            
    if not rain_hours:
        return {
            "Alert": None,
            "Safe_Working_Hours": "Normal Schedule (8:00 AM - 6:00 PM)",
            "Recommendation": "No heavy rain expected tomorrow. Normal shifts apply.",
            "Requires_Rescheduling": False
        }
        
    # Find the earliest rain hour
    first_rain = min(rain_hours)
    rain_time_str = first_rain.strftime("%I:%M %p")
    
    # Calculate lost hours (assuming a normal 8 AM - 6 PM shift)
    shift_start_hour = 8
    shift_end_hour = 18
    
    if first_rain.hour < shift_start_hour:
        lost_hours = 10 # Entire shift lost
        safe_hours = "No safe hours. Work suspended."
    elif first_rain.hour < shift_end_hour:
        lost_hours = shift_end_hour - first_rain.hour
        safe_hours = f"8:00 AM to {rain_time_str}"
    else:
        lost_hours = 0
        safe_hours = "Normal Schedule (8:00 AM - 6:00 PM)"
        
    if lost_hours > 0:
        recommendation = f"To compensate for {lost_hours} lost hours tomorrow, please extend today's shift by {min(lost_hours, 4)} hours."
        alert = f"Heavy rain expected tomorrow starting at {rain_time_str}."
        
        return {
            "Alert": alert,
            "Safe_Working_Hours": safe_hours,
            "Recommendation": recommendation,
            "Requires_Rescheduling": True
        }
    else:
        return {
            "Alert": None,
            "Safe_Working_Hours": safe_hours,
            "Recommendation": "Rain expected after shift hours. Normal shifts apply.",
            "Requires_Rescheduling": False
        }

# Mount static files for frontend
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
def read_index():
    return FileResponse("index.html")

@app.get("/dashboard2")
def read_dashboard2():
    return FileResponse("dashboard2.html")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
