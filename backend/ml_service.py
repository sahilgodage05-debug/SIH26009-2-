import numpy as np
import xgboost as xgb
import random

# A dummy XGBoost model for Hackathon Demonstration
# In a real scenario, this is trained on historical Moil Sensor Data.
class PredictiveMaintenanceModel:
    def __init__(self):
        self.model = xgb.XGBClassifier(use_label_encoder=False, eval_metric='logloss')
        self._train_dummy_model()
        
    def _train_dummy_model(self):
        # Generate some synthetic training data
        # Features: [Engine Temp, Vibration, Days Since Service, Operating Hours Today]
        X = []
        y = []
        for _ in range(1000):
            # Normal operation
            temp = random.uniform(70, 95)
            vib = random.uniform(1.0, 5.0)
            days = random.randint(10, 60)
            hours = random.uniform(1, 10)
            X.append([temp, vib, days, hours])
            y.append(0) # 0 = No Failure
            
            # Failure operation
            temp = random.uniform(95, 120)
            vib = random.uniform(5.0, 10.0)
            days = random.randint(60, 150)
            hours = random.uniform(8, 20)
            X.append([temp, vib, days, hours])
            y.append(1) # 1 = Imminent Failure
            
        X = np.array(X)
        y = np.array(y)
        self.model.fit(X, y)
        print("XGBoost Predictive Maintenance Model Trained Successfully.")
        
    def predict_failure_risk(self, temp, vibration, days_since_service, operating_hours):
        # Predict probability of failure (Risk Score)
        features = np.array([[temp, vibration, days_since_service, operating_hours]])
        risk_prob = self.model.predict_proba(features)[0][1] # Probability of class 1 (Failure)
        return round(risk_prob * 100, 2)

# Singleton instance
ml_engine = PredictiveMaintenanceModel()

def get_machine_risk_score(machine_data):
    """
    machine_data dict expects:
    - engine_temperature
    - vibration_level
    - days_since_service
    - operating_hours
    - current_fuel_level (optional)
    - fuel_capacity (optional)
    """
    risk_score = ml_engine.predict_failure_risk(
        machine_data.get('engine_temperature', 85),
        machine_data.get('vibration_level', 3.0),
        machine_data.get('days_since_service', 30),
        machine_data.get('operating_hours', 5)
    )
    
    status = "Safe"
    
    # Fuel Level Check for Balaghat / Machines with Fuel Sensors
    if 'current_fuel_level' in machine_data and 'fuel_capacity' in machine_data:
        curr_fuel = machine_data['current_fuel_level']
        cap = machine_data['fuel_capacity']
        if cap and cap > 0:
            fuel_percentage = (curr_fuel / cap) * 100
            if fuel_percentage < 15:
                status = f"Warning - Low Fuel ({fuel_percentage:.1f}%)"
                # Add slight risk penalty for running extremely low on fuel
                risk_score += 15.0
                
    if risk_score > 75:
        status = "Critical - Immediate Maintenance Required"
    elif risk_score > 40:
        status = "Warning - Schedule Maintenance"
        
    return {
        "risk_score_percentage": risk_score,
        "status_prediction": status
    }
