import requests
import json

# URL of your new API endpoint
url = "http://localhost:8000/api/recommend-schedule"

# Sample input data (High rain, close to deadline, available overtime)
sample_data = {
    "temperature_2m": 30.5,
    "precipitation": 3.5,              # High rain
    "soil_moisture_0_to_7cm": 0.5,
    "Rolling_72h_Rainfall": 60.0,      # High cumulative rain
    "Pending_Target_Tons": 500.0,
    "Days_To_Deadline": 3.0,           # Less than 5 days
    "Overtime_Capacity_hrs": 4.0       # Overtime is available
}

print(f"Sending test request to {url}...\n")
print("Input Data:")
print(json.dumps(sample_data, indent=2))

try:
    response = requests.post(url, json=sample_data)
    response.raise_for_status()
    
    print("\n--- AI Recommendation Response ---")
    print(json.dumps(response.json(), indent=2))
    
except requests.exceptions.ConnectionError:
    print("\nError: Could not connect to the server. Please make sure you have started your backend by running 'python main.py'")
except Exception as e:
    print(f"\nAn error occurred: {e}")
