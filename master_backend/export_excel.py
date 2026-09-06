import csv
import random
from datetime import datetime, timedelta
import os

os.makedirs('data', exist_ok=True)

# 11 MOIL Mines
mines = [
    'Balaghat Mine', 'Tirodi Mine', 'Ukwa Mine', 'Sitapatore Mine',
    'Dongri Buzurg Mine', 'Chikla Mine', 'Kandri Mine', 'Mansar Mine',
    'Gumgaon Mine', 'Beldongri Mine', 'Parsoda Mine'
]

mine_workers = {
    'Balaghat Mine': '2,500 - 3,000',
    'Tirodi Mine': '400 - 500',
    'Ukwa Mine': '600 - 800',
    'Sitapatore Mine': '150 - 250',
    'Dongri Buzurg Mine': '800 - 1,000',
    'Chikla Mine': '700 - 900',
    'Kandri Mine': '500 - 700',
    'Mansar Mine': '500 - 650',
    'Gumgaon Mine': '450 - 600',
    'Beldongri Mine': '200 - 350',
    'Parsoda Mine': '200 - 350'
}

equipment_types = [
    {'type': 'Excavator', 'capacities': ['30 Ton', '40 Ton', '50 Ton']},
    {'type': 'Dumper', 'capacities': ['35 Ton', '60 Ton', '100 Ton']},
    {'type': 'LHD (Load Haul Dumper)', 'capacities': ['2 Ton', '3 Ton', '5 Ton']},
    {'type': 'Surface Driller', 'capacities': ['150 mm', '200 mm']},
    {'type': 'Dozer', 'capacities': ['200 HP', '300 HP', '400 HP']}
]

csv_file = 'data/moil_all_equipments_master.csv'

with open(csv_file, mode='w', newline='') as file:
    writer = csv.writer(file)
    # Header
    writer.writerow(['Mine_Location', 'Machine_ID', 'Equipment_Type', 'Capacity', 'Purchase_Date', 'Last_Serviced_Date', 'Health_Score_%', 'Current_Status', 'Workers_Count', 'Has_Fuel_Sensor', 'Fuel_Capacity_L', 'Current_Fuel_L', 'Engine_Temp_C', 'Vibration_mms'])
    
    # Generate around 5 to 10 machines per mine
    machine_counter = 1
    for mine in mines:
        num_machines = random.randint(5, 10)
        for i in range(num_machines):
            eq_def = random.choice(equipment_types)
            eq_type = eq_def['type']
            capacity = random.choice(eq_def['capacities'])
            machine_id = f"MOIL-{eq_type[:3].upper()}-{machine_counter:04d}"
            
            # Dates
            purchase_days_ago = random.randint(365, 365*5)
            purchase_date = (datetime.now() - timedelta(days=purchase_days_ago)).strftime('%Y-%m-%d')
            
            days_since_service = random.randint(10, 120)
            last_serviced = (datetime.now() - timedelta(days=days_since_service)).strftime('%Y-%m-%d')
            
            health = round(max(10.0, 100.0 - (days_since_service * 0.5) - random.uniform(0, 10)), 1)
            
            status = 'Active'
            if health < 40:
                status = 'Maintenance'
            elif random.random() < 0.1:
                status = 'Idle'
                
            workers_count = mine_workers.get(mine, 'N/A')
            
            has_fuel_sensor = 1 if mine == 'Balaghat Mine' else 0
            fuel_cap = random.choice([300.0, 500.0, 1000.0]) if has_fuel_sensor else ''
            curr_fuel = round(random.uniform(50.0, fuel_cap), 1) if has_fuel_sensor else ''
            
            if health < 50:
                temp = round(random.uniform(90.0, 115.0), 1)
                vib = round(random.uniform(5.0, 9.5), 1)
            else:
                temp = round(random.uniform(70.0, 89.0), 1)
                vib = round(random.uniform(1.0, 4.5), 1)
                
            writer.writerow([mine, machine_id, eq_type, capacity, purchase_date, last_serviced, health, status, workers_count, has_fuel_sensor, fuel_cap, curr_fuel, temp, vib])
            machine_counter += 1

print(f"Master Excel/CSV sheet created at: {csv_file}")
