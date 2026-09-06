import time
import random
import requests
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "moil_equipment.db")
API_URL = "http://localhost:5000/api/equipment/telemetry"

def get_active_equipments():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT machine_id, type FROM equipments WHERE status = 'Active'")
    machines = cursor.fetchall()
    conn.close()
    return machines

def simulate_telemetry():
    print("🚀 Starting Real-time Telemetry Simulation for MOIL...")
    while True:
        try:
            machines = get_active_equipments()
            if not machines:
                print("No active machines found. Retrying in 10s...")
                time.sleep(10)
                continue
                
            for machine_id, eq_type in machines:
                # Generate mock sensor data based on machine type
                if eq_type == 'Excavator':
                    temp = random.uniform(80, 105) # Engine temp C
                    vib = random.uniform(2.0, 5.5) # Vibration mm/s
                elif eq_type == 'Dumper':
                    temp = random.uniform(85, 110)
                    vib = random.uniform(3.0, 6.0)
                else:
                    temp = random.uniform(70, 95)
                    vib = random.uniform(1.5, 4.0)

                payload = {
                    "machine_id": machine_id,
                    "engine_temperature": round(temp, 2),
                    "vibration_level": round(vib, 2),
                    "timestamp": time.strftime('%Y-%m-%d %H:%M:%S')
                }
                
                # In a real scenario, we'd POST this to our API.
                # Since the API endpoint isn't fully written yet for this, we just print it.
                print(f"[TELEMETRY] {machine_id} ({eq_type}) -> Temp: {payload['engine_temperature']}°C, Vib: {payload['vibration_level']} mm/s")
                
            time.sleep(5) # Simulate every 5 seconds
            print("-" * 50)
            
        except Exception as e:
            print(f"Error in telemetry loop: {e}")
            time.sleep(5)

if __name__ == "__main__":
    simulate_telemetry()
