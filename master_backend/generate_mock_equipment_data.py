import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import random
import os

# Create a data directory
os.makedirs('data', exist_ok=True)

# REAL MOIL MINE LOCATIONS (For 3D Map & GIS Authenticity)
# MOIL operates 11 mines. These are the major ones:
moil_mines = [
    'Balaghat Mine (Underground/Opencast)',
    'Tirodi Mine (Opencast)',
    'Ukwa Mine (Underground)',
    'Sitapatore Mine (Opencast)',
    'Dongri Buzurg Mine (Opencast)',
    'Chikla Mine (Underground)',
    'Kandri Mine (Underground)',
    'Mansar Mine (Underground/Opencast)',
    'Gumgaon Mine (Underground)',
    'Beldongri Mine (Opencast)',
    'Satuk Mine (Opencast)'
]

equipment_types = ['Excavator', 'Dumper', 'Driller', 'Loader', 'Dozer']

def generate_performance_data(num_records=1000):
    # Generate 20 specific machines distributed across mines
    machines = [{"id": f"EQ-MOIL-{random.randint(1000, 9999)}", "type": random.choice(equipment_types), "mine": random.choice(moil_mines)} for _ in range(20)]
    
    data = []
    start_date = datetime.now() - timedelta(days=60)
    
    for i in range(num_records):
        date = start_date + timedelta(hours=i*4)
        machine = random.choice(machines)
        
        # Synthetic performance metrics based on equipment type
        operating_hours = round(random.uniform(4.0, 12.0), 1)
        
        if machine['type'] == 'Dumper':
            material_moved = round(operating_hours * random.uniform(30.0, 50.0), 1) # Tons
            fuel = round(operating_hours * random.uniform(10.0, 15.0), 1)
        elif machine['type'] == 'Excavator':
            material_moved = round(operating_hours * random.uniform(80.0, 120.0), 1) # Tons
            fuel = round(operating_hours * random.uniform(20.0, 30.0), 1)
        else:
            material_moved = round(operating_hours * random.uniform(10.0, 20.0), 1)
            fuel = round(operating_hours * random.uniform(8.0, 12.0), 1)
            
        data.append([date.strftime('%Y-%m-%d %H:%M:%S'), machine['id'], machine['type'], machine['mine'], operating_hours, fuel, material_moved])
        
    df = pd.DataFrame(data, columns=['Timestamp', 'Equipment_ID', 'Equipment_Type', 'Mine_Location', 'Operating_Hours', 'Fuel_Consumed_Liters', 'Material_Moved_Tons'])
    df.to_csv('data/moil_equipment_performance.csv', index=False)
    print("Generated moil_equipment_performance.csv")

def generate_downtime_data(num_records=200):
    machines = [{"id": f"EQ-MOIL-{random.randint(1000, 9999)}", "mine": random.choice(moil_mines)} for _ in range(20)]
    failure_types = ['Hydraulic System Failure', 'Engine Overheating', 'Electrical Fault', 'Tread/Tyre Wear', 'Routine Maintenance']
    
    data = []
    start_date = datetime.now() - timedelta(days=60)
    
    for i in range(num_records):
        date = start_date + timedelta(days=random.randint(0, 60))
        machine = random.choice(machines)
        f_type = random.choice(failure_types)
        
        downtime_hours = round(random.uniform(2.0, 72.0), 1)
        repair_cost = round(downtime_hours * random.uniform(2000, 8000), 2)
        
        data.append([date.strftime('%Y-%m-%d'), machine['id'], machine['mine'], f_type, downtime_hours, repair_cost, 'Completed' if downtime_hours < 48 else 'In Progress'])
        
    df = pd.DataFrame(data, columns=['Date', 'Equipment_ID', 'Mine_Location', 'Failure_Reason', 'Downtime_Hours', 'Repair_Cost_INR', 'Repair_Status'])
    df.to_csv('data/moil_equipment_maintenance.csv', index=False)
    print("Generated moil_equipment_maintenance.csv")

if __name__ == "__main__":
    print("Generating Authentic-looking MOIL Datasets...")
    generate_performance_data()
    generate_downtime_data()
    print("Done! Files are in the 'backend/data' folder.")
