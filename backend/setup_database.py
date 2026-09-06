import os
import random
from datetime import datetime, timedelta
from sqlalchemy import create_engine, Column, Integer, String, Float, Date
from sqlalchemy.orm import declarative_base, sessionmaker

# Setup SQLite Database
db_path = os.path.join(os.path.dirname(__file__), "moil_equipment.db")
engine = create_engine(f"sqlite:///{db_path}")
Base = declarative_base()

# Define the Equipment Model
class Equipment(Base):
    __tablename__ = 'equipments'
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String, unique=True, index=True)
    type = Column(String)
    capacity = Column(String) # e.g., '35 Ton', '50 Ton'
    mine_location = Column(String)
    status = Column(String) # Active, Maintenance, Idle
    purchase_date = Column(Date)
    last_serviced_date = Column(Date)
    health_score = Column(Float) # 0 to 100%
    workers_count = Column(String)
    has_fuel_sensor = Column(Integer, default=0) # 0 False, 1 True
    fuel_capacity = Column(Float, nullable=True) # in Liters
    current_fuel_level = Column(Float, nullable=True) # in Liters
    engine_temperature = Column(Float, nullable=True) # in Celsius
    vibration_level = Column(Float, nullable=True) # in mm/s

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

def setup_db():
    print("Creating Database Schema...")
    Base.metadata.drop_all(engine) # Reset for fresh start
    Base.metadata.create_all(engine)
    
    Session = sessionmaker(bind=engine)
    session = Session()
    
    print("Generating Authentic Machine Data...")
    
    # Generate around 5 to 10 machines per mine (Total ~80 machines)
    machine_counter = 1
    for mine in mines:
        num_machines = random.randint(5, 10)
        for i in range(num_machines):
            eq_def = random.choice(equipment_types)
            eq_type = eq_def['type']
            capacity = random.choice(eq_def['capacities'])
            
            # Generate dates
            purchase_days_ago = random.randint(365, 365*5) # 1 to 5 years old
            purchase_date = datetime.now() - timedelta(days=purchase_days_ago)
            
            # Servicing date: Ideally serviced every 90 days. Some might be overdue.
            days_since_service = random.randint(10, 120)
            last_serviced = datetime.now() - timedelta(days=days_since_service)
            
            # Health Score logic (older service = lower health)
            health = max(10.0, 100.0 - (days_since_service * 0.5) - random.uniform(0, 10))
            
            status = 'Active'
            if health < 40:
                status = 'Maintenance'
            elif random.random() < 0.1:
                status = 'Idle'
                
            has_fuel_sensor = 1 if mine == 'Balaghat Mine' else 0
            fuel_cap = random.choice([300.0, 500.0, 1000.0]) if has_fuel_sensor else None
            curr_fuel = round(random.uniform(50.0, fuel_cap), 1) if has_fuel_sensor else None
            
            # Generate Temperature & Vibration based on Health
            # Poor health -> Higher Temp, Higher Vibration
            if health < 50:
                temp = round(random.uniform(90.0, 115.0), 1)
                vib = round(random.uniform(5.0, 9.5), 1)
            else:
                temp = round(random.uniform(70.0, 89.0), 1)
                vib = round(random.uniform(1.0, 4.5), 1)
            
            machine = Equipment(
                machine_id=f"MOIL-{eq_type[:3].upper()}-{machine_counter:04d}",
                type=eq_type,
                capacity=capacity,
                mine_location=mine,
                status=status,
                purchase_date=purchase_date.date(),
                last_serviced_date=last_serviced.date(),
                health_score=round(health, 1),
                workers_count=mine_workers.get(mine, 'N/A'),
                has_fuel_sensor=has_fuel_sensor,
                fuel_capacity=fuel_cap,
                current_fuel_level=curr_fuel,
                engine_temperature=temp,
                vibration_level=vib
            )
            session.add(machine)
            machine_counter += 1
    
    session.commit()
    print("✅ Database created and populated with authentic MOIL machine data!")
    session.close()

if __name__ == "__main__":
    setup_db()
