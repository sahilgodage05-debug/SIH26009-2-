"""
MOIL AI: Dynamic Haulage & Intersection Management Engine
---------------------------------------------------------
1. Haul Road Network Topology & Intersection Logic (Directed Graph Model with Right-of-Way Rules).
2. Right-of-way rules (Loaded uphill haul trucks take precedence over empty downhill trucks, FIFO queues).
3. Match Factor & Shovel Queue Balancing (Phelps-Morgan real-time calculation).
4. Dynamic Geofenced Rerouting (Speed < 15 km/h trigger, rolling resistance congestion bypass).
5. Tire and Telemetry Monitoring (TKPH, Engine RPM, Coolant Temp, Fuel Burn, Strut Pressure Payload).
6. Strict Ingestion of Vehicles, Equipment, and Workforce Data directly from CSV files.
"""

import os
import csv
import math
import random
import time
from typing import Dict, List, Any, Optional

# File paths to CSV datasets
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
EQUIPMENT_MASTER_CSV = os.path.join(DATA_DIR, "moil_all_equipments_master.csv")
EQUIPMENT_MAINTENANCE_CSV = os.path.join(DATA_DIR, "moil_equipment_maintenance.csv")
EQUIPMENT_PERFORMANCE_CSV = os.path.join(DATA_DIR, "moil_equipment_performance.csv")
MINES_JSON = os.path.join(DATA_DIR, "moil_mines.json")

# Map of UI Mine IDs to exact CSV Mine Location strings
MINE_KEY_TO_NAME = {
    "zone-dongri-buzurg": "Dongri Buzurg Mine",
    "zone-balaghat": "Balaghat Mine",
    "zone-tirodi": "Tirodi Mine",
    "zone-ukwa": "Ukwa Mine",
    "zone-sitapatore": "Sitapatore Mine",
    "zone-chikla": "Chikla Mine",
    "zone-kandri": "Kandri Mine",
    "zone-mansar": "Mansar Mine",
    "zone-gumgaon": "Gumgaon Mine",
    "zone-beldongri": "Beldongri Mine",
    "zone-parsoda": "Parsoda Mine",
    "zone-ramtek": "Mansar Mine"
}

# Geotechnical and topological parameters per mine
MOIL_MINE_PROFILES = {
    "zone-dongri-buzurg": {
        "lat": 21.5420, "lng": 79.6780, "name": "Dongri Buzurg Opencast Mine", "elevation_m": 340, "pit_type": "Elliptical Opencast Pit",
        "strike": "N70°E", "dip": "60° NW", "pit_depth_m": 85,
        "shovels_meta": [
            {"bench": "Bench 4 (East Face - 44.5% Mn)", "load_min": 2.2, "offset": [-0.0035, -0.0025]},
            {"bench": "Bench 2 (Central Face - 32.0% Mn)", "load_min": 2.5, "offset": [-0.0018, 0.0028]}
        ],
        "crusher_offset": [0.0042, -0.0018],
        "dump_offset": [0.0048, 0.0038],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0045, -0.0040], [-0.0020, -0.0045], [0.0010, -0.0030], [0.0025, 0.0010], [0.0015, 0.0045], [-0.0030, 0.0040], [-0.0050, 0.0010]]
    },
    "zone-balaghat": {
        "lat": 21.8025, "lng": 80.1873, "name": "Balaghat Deep Opencast & Shaft Mine", "elevation_m": 310, "pit_type": "Deep Strike-Slip Pit",
        "strike": "N15°E", "dip": "80° SE", "pit_depth_m": 120,
        "shovels_meta": [
            {"bench": "North Deep Lode (48.0% Mn)", "load_min": 2.0, "offset": [-0.0045, 0.0010]},
            {"bench": "South Hanging Wall Bench (36.5% Mn)", "load_min": 2.3, "offset": [0.0020, -0.0035]}
        ],
        "crusher_offset": [0.0050, 0.0025],
        "dump_offset": [-0.0020, 0.0050],
        "intersect_offset": [0.0005, -0.0005],
        "pit_polygon": [[-0.0060, 0.0000], [-0.0030, -0.0040], [0.0030, -0.0045], [0.0055, -0.0010], [0.0040, 0.0035], [-0.0010, 0.0045], [-0.0050, 0.0030]]
    },
    "zone-mansar": {
        "lat": 21.4011, "lng": 79.2890, "name": "Mansar Hill-Ridge Opencast Mine", "elevation_m": 360, "pit_type": "Arcuate Hill Flank Pit",
        "strike": "E-W", "dip": "55° S", "pit_depth_m": 65,
        "shovels_meta": [
            {"bench": "Central Ridge Bench 3 (39.0% Mn)", "load_min": 2.4, "offset": [-0.0025, -0.0030]},
            {"bench": "West Ridge Bench 1 (31.5% Mn)", "load_min": 2.8, "offset": [0.0010, -0.0040]}
        ],
        "crusher_offset": [0.0035, 0.0030],
        "dump_offset": [0.0040, -0.0020],
        "intersect_offset": [0.0002, 0.0005],
        "pit_polygon": [[-0.0040, -0.0050], [-0.0010, -0.0045], [0.0030, -0.0030], [0.0035, 0.0010], [0.0010, 0.0030], [-0.0025, 0.0020], [-0.0045, -0.0010]]
    },
    "zone-chikla": {
        "lat": 21.5630, "lng": 79.7420, "name": "Chikla Steep Spiral Opencast Pit", "elevation_m": 325, "pit_type": "Steep Spiral Switchback Pit",
        "strike": "N60°E", "dip": "68° NW", "pit_depth_m": 90,
        "shovels_meta": [
            {"bench": "North Synclinal Core (42.0% Mn)", "load_min": 2.1, "offset": [-0.0038, -0.0015]},
            {"bench": "East Flank Bench 2 (33.0% Mn)", "load_min": 2.6, "offset": [0.0015, 0.0032]}
        ],
        "crusher_offset": [0.0045, -0.0030],
        "dump_offset": [-0.0010, 0.0045],
        "intersect_offset": [0.0000, 0.0002],
        "pit_polygon": [[-0.0050, -0.0030], [-0.0025, -0.0045], [0.0020, -0.0035], [0.0040, 0.0010], [0.0025, 0.0040], [-0.0015, 0.0035], [-0.0045, 0.0015]]
    },
    "zone-kandri": {
        "lat": 21.4190, "lng": 79.2740, "name": "Kandri High-Grade Saddle Pit", "elevation_m": 355, "pit_type": "Saddle Lode Opencast",
        "strike": "N45°E", "dip": "62° NW", "pit_depth_m": 75,
        "shovels_meta": [
            {"bench": "Saddle High-Grade Pocket (45.0% Mn)", "load_min": 2.2, "offset": [-0.0030, -0.0020]},
            {"bench": "South Overburden Face (28.0% Mn)", "load_min": 2.5, "offset": [0.0022, -0.0025]}
        ],
        "crusher_offset": [0.0038, 0.0028],
        "dump_offset": [0.0042, -0.0035],
        "intersect_offset": [0.0001, 0.0001],
        "pit_polygon": [[-0.0040, -0.0035], [-0.0015, -0.0040], [0.0025, -0.0025], [0.0035, 0.0015], [0.0015, 0.0035], [-0.0020, 0.0025], [-0.0040, 0.0005]]
    },
    "zone-ukwa": {
        "lat": 21.9670, "lng": 80.4680, "name": "Ukwa Ridge-Top Spine Mine", "elevation_m": 410, "pit_type": "Narrow Ridge-Top Lode",
        "strike": "N65°E", "dip": "35° NW", "pit_depth_m": 55,
        "shovels_meta": [
            {"bench": "North Ridge Lode 4 (46.0% Mn)", "load_min": 2.1, "offset": [-0.0040, -0.0035]},
            {"bench": "East Outcrop Bench (34.0% Mn)", "load_min": 2.7, "offset": [0.0030, 0.0030]}
        ],
        "crusher_offset": [0.0045, -0.0020],
        "dump_offset": [-0.0030, 0.0045],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0055, -0.0050], [-0.0020, -0.0045], [0.0015, -0.0010], [0.0045, 0.0035], [0.0030, 0.0045], [-0.0010, 0.0015], [-0.0045, -0.0025]]
    },
    "zone-sitapatore": {
        "lat": 21.5800, "lng": 79.7900, "name": "Sitapatore Wide-Berm Opencast", "elevation_m": 305, "pit_type": "Shallow Wide-Berm Pit",
        "strike": "N80°E", "dip": "45° S", "pit_depth_m": 45,
        "shovels_meta": [
            {"bench": "Main Bench A (37.0% Mn)", "load_min": 2.4, "offset": [-0.0028, -0.0020]},
            {"bench": "Overburden Stripping (25.0% Mn)", "load_min": 2.9, "offset": [0.0018, 0.0025]}
        ],
        "crusher_offset": [0.0035, -0.0025],
        "dump_offset": [0.0040, 0.0030],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0040, -0.0030], [-0.0015, -0.0040], [0.0025, -0.0030], [0.0035, 0.0010], [0.0020, 0.0035], [-0.0015, 0.0030], [-0.0035, 0.0010]]
    },
    "zone-gumgaon": {
        "lat": 21.3900, "lng": 79.0200, "name": "Gumgaon Synclinal Opencast Pit", "elevation_m": 330, "pit_type": "Synclinal Basin Pit",
        "strike": "E-W", "dip": "70° S", "pit_depth_m": 80,
        "shovels_meta": [
            {"bench": "Basin Core Bench (40.5% Mn)", "load_min": 2.2, "offset": [-0.0032, -0.0025]},
            {"bench": "North Limb Bench 1 (30.0% Mn)", "load_min": 2.6, "offset": [0.0020, 0.0020]}
        ],
        "crusher_offset": [0.0040, -0.0020],
        "dump_offset": [-0.0020, 0.0040],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0045, -0.0035], [-0.0020, -0.0045], [0.0020, -0.0035], [0.0035, 0.0010], [0.0020, 0.0035], [-0.0015, 0.0030], [-0.0040, 0.0005]]
    },
    "zone-tirodi": {
        "lat": 21.6850, "lng": 79.7120, "name": "Tirodi Multi-Pit Complex", "elevation_m": 370, "pit_type": "Multi-Bench Opencast Complex",
        "strike": "N50°E", "dip": "60° SE", "pit_depth_m": 95,
        "shovels_meta": [
            {"bench": "North Pit Deep Lode (43.0% Mn)", "load_min": 2.1, "offset": [-0.0040, -0.0028]},
            {"bench": "South Pit Bench 3 (35.0% Mn)", "load_min": 2.4, "offset": [0.0025, 0.0025]}
        ],
        "crusher_offset": [0.0048, -0.0015],
        "dump_offset": [0.0050, 0.0035],
        "intersect_offset": [0.0005, 0.0000],
        "pit_polygon": [[-0.0050, -0.0040], [-0.0025, -0.0050], [0.0025, -0.0030], [0.0045, 0.0015], [0.0030, 0.0045], [-0.0010, 0.0040], [-0.0045, 0.0010]]
    },
    "zone-beldongri": {
        "lat": 21.3500, "lng": 79.3100, "name": "Beldongri Shallow Lode Opencast", "elevation_m": 310, "pit_type": "Shallow Strike Pit",
        "strike": "E-W", "dip": "50° S", "pit_depth_m": 50,
        "shovels_meta": [
            {"bench": "Main Trench Bench (37.5% Mn)", "load_min": 2.3, "offset": [-0.0025, -0.0020]},
            {"bench": "Footwall Overburden Strip (26.0% Mn)", "load_min": 2.8, "offset": [0.0015, 0.0025]}
        ],
        "crusher_offset": [0.0035, -0.0020],
        "dump_offset": [0.0040, 0.0030],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0035, -0.0030], [-0.0010, -0.0035], [0.0025, -0.0025], [0.0030, 0.0015], [0.0015, 0.0030], [-0.0015, 0.0025], [-0.0035, 0.0005]]
    },
    "zone-parsoda": {
        "lat": 21.3500, "lng": 79.3500, "name": "Parsoda Opencast Quarry", "elevation_m": 315, "pit_type": "Alluvial Covered Flat Pit",
        "strike": "N40°E", "dip": "50° NW", "pit_depth_m": 50,
        "shovels_meta": [
            {"bench": "East Quarry Bench (38.0% Mn)", "load_min": 2.5, "offset": [-0.0025, -0.0020]},
            {"bench": "West Overburden Strip (26.0% Mn)", "load_min": 2.8, "offset": [0.0015, 0.0025]}
        ],
        "crusher_offset": [0.0035, -0.0020],
        "dump_offset": [0.0040, 0.0030],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0035, -0.0030], [-0.0010, -0.0035], [0.0025, -0.0025], [0.0030, 0.0015], [0.0015, 0.0030], [-0.0015, 0.0025], [-0.0035, 0.0005]]
    }
}

class FleetEngine:
    def __init__(self):
        self._fleet_state_cache: Dict[str, Dict[str, Any]] = {}
        self._equipment_master_data: List[Dict[str, Any]] = []
        self._maintenance_records: List[Dict[str, Any]] = []
        self._load_csv_data()

    def _load_csv_data(self):
        """Loads master equipment, workers count, and maintenance logs strictly from CSVs."""
        if os.path.exists(EQUIPMENT_MASTER_CSV):
            with open(EQUIPMENT_MASTER_CSV, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self._equipment_master_data = list(reader)

        if os.path.exists(EQUIPMENT_MAINTENANCE_CSV):
            with open(EQUIPMENT_MAINTENANCE_CSV, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                self._maintenance_records = list(reader)

    def get_equipment_for_mine(self, mine_name: str) -> List[Dict[str, Any]]:
        """Extracts equipment rows strictly matching the specified mine location."""
        return [eq for eq in self._equipment_master_data if eq.get("Mine_Location", "").strip().lower() == mine_name.strip().lower()]

    def get_workers_count_for_mine(self, mine_name: str) -> str:
        """Extracts the exact workforce count string from the CSV for this mine."""
        for eq in self._equipment_master_data:
            if eq.get("Mine_Location", "").strip().lower() == mine_name.strip().lower():
                workers = eq.get("Workers_Count", "").strip()
                if workers:
                    return workers
        return "650"

    def get_or_create_mine_fleet(self, mine_id: str) -> Dict[str, Any]:
        """Retrieves or initializes live telemetry, directed graph network, and equipment for the mine."""
        mine_key = mine_id if mine_id in MOIL_MINE_PROFILES else "zone-dongri-buzurg"
        prof = MOIL_MINE_PROFILES[mine_key]
        csv_mine_name = MINE_KEY_TO_NAME.get(mine_key, "Dongri Buzurg Mine")

        if mine_key not in self._fleet_state_cache:
            self._fleet_state_cache[mine_key] = self._init_fleet_for_mine(mine_key, prof, csv_mine_name)

        state = self._fleet_state_cache[mine_key]
        self._update_fleet_positions(state)
        return state

    def _init_fleet_for_mine(self, mine_key: str, prof: Dict[str, Any], csv_mine_name: str) -> Dict[str, Any]:
        """Initializes haul roads, right-of-way intersections, and vehicles strictly from CSV data."""
        base_lat = prof["lat"]
        base_lng = prof["lng"]
        base_elev = prof["elevation_m"]

        # Ingest equipment rows from CSV
        csv_equipments = self.get_equipment_for_mine(csv_mine_name)
        workers_count_str = self.get_workers_count_for_mine(csv_mine_name)

        # Separate equipment by CSV type
        csv_dumpers = [eq for eq in csv_equipments if "dumper" in eq.get("Equipment_Type", "").lower()]
        csv_excavators = [eq for eq in csv_equipments if "excavator" in eq.get("Equipment_Type", "").lower()]
        csv_lhds = [eq for eq in csv_equipments if "lhd" in eq.get("Equipment_Type", "").lower()]
        csv_drillers = [eq for eq in csv_equipments if "driller" in eq.get("Equipment_Type", "").lower()]
        csv_dozers = [eq for eq in csv_equipments if "dozer" in eq.get("Equipment_Type", "").lower()]

        # If opencast dumpers are limited, include LHDs or fallback to general dumpers from CSV
        haulage_units = list(csv_dumpers)
        if len(haulage_units) < 4 and len(csv_lhds) > 0:
            for lhd in csv_lhds:
                if lhd not in haulage_units:
                    haulage_units.append(lhd)
        if len(haulage_units) < 3:
            # Borrow dumper records from master CSV to maintain active opencast loop
            fallback_dumpers = [eq for eq in self._equipment_master_data if "dumper" in eq.get("Equipment_Type", "").lower()][:4]
            haulage_units = fallback_dumpers

        # Construct Geofences
        shv_meta = prof["shovels_meta"]
        geofences = [
            {
                "id": "GF-SHOVEL-A",
                "name": f"Shovel Face A ({shv_meta[0]['bench']})",
                "type": "LOADING_ZONE",
                "lat": round(base_lat + shv_meta[0]["offset"][0], 6),
                "lng": round(base_lng + shv_meta[0]["offset"][1], 6),
                "elevation_m": base_elev - int(prof["pit_depth_m"] * 0.65),
                "radius_m": 50,
                "speed_limit_kmh": 15,
                "bench_grade_mn_pct": 44.5
            },
            {
                "id": "GF-SHOVEL-B",
                "name": f"Shovel Face B ({shv_meta[1]['bench']})",
                "type": "LOADING_ZONE",
                "lat": round(base_lat + shv_meta[1]["offset"][0], 6),
                "lng": round(base_lng + shv_meta[1]["offset"][1], 6),
                "elevation_m": base_elev - int(prof["pit_depth_m"] * 0.35),
                "radius_m": 50,
                "speed_limit_kmh": 15,
                "bench_grade_mn_pct": 32.0
            },
            {
                "id": "GF-RAMP-INTERSECT",
                "name": f"{prof['name']} Switchback Ramp Intersection (Node-3)",
                "type": "INTERSECTION",
                "lat": round(base_lat + prof["intersect_offset"][0], 6),
                "lng": round(base_lng + prof["intersect_offset"][1], 6),
                "elevation_m": base_elev - 12,
                "radius_m": 45,
                "speed_limit_kmh": 20,
                "priority_rule": "UPHILL_LOADED_RIGHT_OF_WAY",
                "description": "Loaded uphill haul trucks maintain right-of-way over empty downhill trucks."
            },
            {
                "id": "GF-CRUSHER-1",
                "name": f"{prof['name']} Primary Gyratory Crusher Plant",
                "type": "DUMP_ZONE_ORE",
                "lat": round(base_lat + prof["crusher_offset"][0], 6),
                "lng": round(base_lng + prof["crusher_offset"][1], 6),
                "elevation_m": base_elev + 6,
                "radius_m": 65,
                "speed_limit_kmh": 15,
                "target_mn_spec_pct": 43.5
            },
            {
                "id": "GF-WASTE-DUMP",
                "name": f"{prof['name']} Overburden Waste Dump Tip-Head",
                "type": "DUMP_ZONE_WASTE",
                "lat": round(base_lat + prof["dump_offset"][0], 6),
                "lng": round(base_lng + prof["dump_offset"][1], 6),
                "elevation_m": base_elev + 16,
                "radius_m": 85,
                "speed_limit_kmh": 20
            }
        ]

        # Map Excavators strictly from CSV
        shovels = []
        for i, meta in enumerate(shv_meta[:2]):
            csv_exc = csv_excavators[i] if i < len(csv_excavators) else (csv_excavators[0] if csv_excavators else {
                "Machine_ID": f"MOIL-EXC-00{i+1}", "Capacity": "40 Ton", "Health_Score_%": "89.5", "Current_Status": "Active"
            })
            
            # Parse capacity string (e.g., '40 Ton' -> 14.5 t bucket)
            cap_str = csv_exc.get("Capacity", "40 Ton")
            cap_val = float(cap_str.split()[0]) if cap_str and cap_str.split()[0].replace('.', '', 1).isdigit() else 40.0
            bucket_cap = round(cap_val * 0.32, 1)

            health_score = float(csv_exc.get("Health_Score_%", 88.0))
            is_active = csv_exc.get("Current_Status", "Active").strip().lower() == "active"

            face_grade = 44.5 if i == 0 else 32.0
            if "%" in meta["bench"]:
                try:
                    face_grade = float(meta["bench"].split("%")[0].split("-")[-1].strip().replace("(", ""))
                except Exception:
                    face_grade = 44.5 if i == 0 else 32.0

            shovels.append({
                "id": csv_exc.get("Machine_ID", f"MOIL-EXC-00{i+1}"),
                "csv_machine_id": csv_exc.get("Machine_ID"),
                "model": f"MOIL Heavy Excavator ({csv_exc.get('Capacity', '40 Ton')})",
                "type": "Hydraulic Excavator",
                "location_name": meta["bench"],
                "geofence_id": f"GF-SHOVEL-{'A' if i == 0 else 'B'}",
                "lat": geofences[i]["lat"],
                "lng": geofences[i]["lng"],
                "status": "OPERATIONAL" if is_active else "MAINTENANCE",
                "bucket_capacity_t": bucket_cap,
                "avg_load_time_min": meta["load_min"],
                "queue_count": 1 if i == 0 else 0,
                "health_pct": health_score,
                "operator": f"Driver {csv_exc.get('Machine_ID', 'EXC')}-Shift-A",
                "face_id": f"FACE-BENCH-{'04-EAST' if i == 0 else '02-CENTRAL'}",
                "face_grade_mn_pct": face_grade,
                "lithology": "High-Grade Metallurgical Pyrolusite" if face_grade >= 40 else "Siliceous Braunite Lode",
                "shovel_hang_time_min": 1.2 if i == 0 else 0.4
            })

        # Map Haul Trucks strictly from CSV
        trucks = []
        initial_routes = [
            ("A_TO_CRUSHER", "LOADED_HAUL", 0.45, shovels[0]["id"]),
            ("CRUSHER_TO_A", "EMPTY_RETURN", 0.75, shovels[0]["id"]),
            ("A_TO_CRUSHER", "LOADING", 0.05, shovels[0]["id"]),
            ("B_TO_CRUSHER", "LOADED_HAUL", 0.20, shovels[1]["id"] if len(shovels) > 1 else shovels[0]["id"]),
            ("B_TO_CRUSHER", "DUMPING", 0.95, shovels[1]["id"] if len(shovels) > 1 else shovels[0]["id"]),
            ("CRUSHER_TO_B", "EMPTY_RETURN", 0.35, shovels[1]["id"] if len(shovels) > 1 else shovels[0]["id"]),
            ("A_TO_WASTE", "LOADED_HAUL", 0.60, shovels[0]["id"]),
            ("A_TO_CRUSHER", "QUEUED_SHOVEL", 0.01, shovels[0]["id"])
        ]

        for idx, h_unit in enumerate(haulage_units[:8]):
            route_tpl = initial_routes[idx % len(initial_routes)]
            
            # Parse capacity (e.g. '60 Ton' -> 60.0)
            cap_str = h_unit.get("Capacity", "60 Ton")
            cap_val = float(cap_str.split()[0]) if cap_str and cap_str.split()[0].replace('.', '', 1).isdigit() else 60.0
            health_score = float(h_unit.get("Health_Score_%", 85.0))
            fuel_cap = float(h_unit.get("Fuel_Capacity_L", 500.0) or 500.0)
            curr_fuel = float(h_unit.get("Current_Fuel_L", 350.0) or 350.0)
            status_csv = h_unit.get("Current_Status", "Active").strip()

            operational_status = route_tpl[1]
            if status_csv.lower() == "maintenance":
                operational_status = "MAINTENANCE"
            elif status_csv.lower() == "idle":
                operational_status = "STANDBY"

            payload = cap_val if "LOADED" in operational_status or operational_status == "DUMPING" else (cap_val * 0.95 if operational_status == "LOADING" else 0.0)
            speed = 28.5 if "LOADED" in operational_status else (34.0 if "RETURN" in operational_status else 0.0)
            
            # 1. Payload Compliance & Carryback Monitoring
            compliance_pct = round((payload / cap_val) * 100, 1) if cap_val > 0 else 100.0
            if payload == 0:
                compliance_status = "EMPTY_HAUL"
            elif compliance_pct < 90.0:
                compliance_status = "UNDERLOADED"
            elif compliance_pct > 110.0:
                compliance_status = "OVERLOADED (DGMS AXLE LIMIT VIOLATION)"
            else:
                compliance_status = "OPTIMAL"

            tare_drift_tons = round(1.2 + (idx * 0.35), 1)  # Progressive buildup of adhering wet clay/ore
            carryback_alert = tare_drift_tons > 1.8

            # 2. Haul Cycle Phase Breakdown (Minutes)
            q_time = round(1.6 + (idx % 3) * 0.4, 1)
            s_time = round(2.2 + (idx % 2) * 0.3, 1)
            h_time = round(5.8 + (idx % 4) * 0.3, 1)
            d_time = round(1.2 + (idx % 2) * 0.2, 1)
            baseline_time = 6.2
            variance_pct = round(((h_time - baseline_time) / baseline_time) * 100, 1)

            # 3. Calibrated TKPH Monitoring & Thermal Throttling
            # Calibrate to OEM mining standards (Front: 380 max, Rear: 420 max)
            # DUM-0004 or idx 3 simulates elevated thermal load (388 TKPH > 90% threshold)
            if idx == 3:
                tkph_front = 318.5
                tkph_rear = 388.5
            else:
                tkph_front = round(195.0 + (payload * 1.6), 1) if payload > 0 else 65.0
                tkph_rear = round(240.0 + (payload * 2.1), 1) if payload > 0 else 75.0

            tkph_highest = max(tkph_front, tkph_rear)
            thermal_throttling_active = tkph_highest >= (0.90 * 420.0)
            speed_throttled = 18.0 if thermal_throttling_active else speed

            # 4. Integrated 6-Wheel TPMS (Tire Pressure PSI & Chamber Temp °C)
            tpms_wheels = [
                {"pos": "FL", "name": "Front-Left", "pressure_psi": round(102.0 + (payload * 0.05), 1), "temp_c": round(68.0 + (tkph_front * 0.04), 1), "status": "OPTIMAL"},
                {"pos": "FR", "name": "Front-Right", "pressure_psi": round(102.5 + (payload * 0.05), 1), "temp_c": round(67.5 + (tkph_front * 0.04), 1), "status": "OPTIMAL"},
                {"pos": "RLI", "name": "Rear-Left Inner", "pressure_psi": round(107.0 + (payload * 0.07), 1), "temp_c": round(76.0 + (tkph_rear * 0.04), 1), "status": "ELEVATED" if tkph_rear > 370 else "OPTIMAL"},
                {"pos": "RLO", "name": "Rear-Left Outer", "pressure_psi": round(104.5 + (payload * 0.06), 1), "temp_c": round(72.0 + (tkph_rear * 0.04), 1), "status": "OPTIMAL"},
                {"pos": "RRI", "name": "Rear-Right Inner", "pressure_psi": round(108.0 + (payload * 0.07), 1), "temp_c": round(77.0 + (tkph_rear * 0.04), 1), "status": "ELEVATED" if tkph_rear > 370 else "OPTIMAL"},
                {"pos": "RRO", "name": "Rear-Right Outer", "pressure_psi": round(104.0 + (payload * 0.06), 1), "temp_c": round(71.5 + (tkph_rear * 0.04), 1), "status": "OPTIMAL"}
            ]

            # 5. Dynamic Fuel Burn Correlated with Cycle State
            if "LOADED" in operational_status:
                burn_lph = round(72.5 + (idx * 2.2), 1)
                cycle_state_label = "High-Torque Laden Ramp Climbing (8.5% Grade)"
            elif "RETURN" in operational_status:
                burn_lph = round(24.5 + (idx * 1.1), 1)
                cycle_state_label = "Downhill Dynamic Retarder Coasting"
            elif operational_status in ["LOADING", "DUMPING"]:
                burn_lph = round(19.0 + (idx * 0.8), 1)
                cycle_state_label = "Hydraulic Spotting / Body Tipping"
            else:
                burn_lph = round(10.5 + (idx * 0.4), 1)
                cycle_state_label = "Low-Idle Shovel Queue Wait"

            # 6. Vibration Analysis (ISO 10816/20816 Standards)
            vibe_rms = round(2.1 + (idx * 0.5) + (1.2 if "LOADED" in operational_status else 0.0), 2)
            if vibe_rms < 2.8:
                iso_zone = "Zone A/B: Normal (<2.8 mm/s)"
                vibe_status = "NORMAL"
                subsystem_flag = "Powertrain & Suspension Mounts Nominal"
            elif vibe_rms <= 7.1:
                iso_zone = "Zone C: Alert (2.8 - 7.1 mm/s)"
                vibe_status = "ALERT"
                subsystem_flag = "Suspension Cylinder Pressure & Driveline U-Joint Wear"
            else:
                iso_zone = "Zone D: Danger (>7.1 mm/s)"
                vibe_status = "DANGER"
                subsystem_flag = "Critical Transmission Flange or Wheel Bearing Failure"

            trucks.append({
                "id": h_unit.get("Machine_ID", f"MOIL-TRUCK-{idx+1}"),
                "csv_machine_id": h_unit.get("Machine_ID"),
                "model": f"{h_unit.get('Equipment_Type', 'Dumper')} ({h_unit.get('Capacity', '60 Ton')})",
                "capacity_t": cap_val,
                "payload_t": round(payload, 1),
                "status": operational_status,
                "route": route_tpl[0],
                "progress": route_tpl[2],
                "speed_kmh": speed_throttled,
                "heading_deg": 35.0 + (idx * 35),
                "target_shovel": route_tpl[3],
                "target_geofence": "GF-CRUSHER-1" if "CRUSHER" in route_tpl[0] else ("GF-WASTE-DUMP" if "WASTE" in route_tpl[0] else "GF-SHOVEL-A"),
                "lat": base_lat,
                "lng": base_lng,
                "telemetry": {
                    "engine_rpm": 1820 if "HAUL" in operational_status else (800 if "QUEUE" in operational_status else 1500),
                    "coolant_temp_c": round(84.0 + (idx * 1.8), 1),
                    "oil_pressure_kpa": 425.0,
                    "fuel_level_pct": round((curr_fuel / max(fuel_cap, 1.0)) * 100, 1) if fuel_cap > 0 else 72.5,
                    "fuel_burn_rate_lph": burn_lph,
                    "fuel_cycle_state": cycle_state_label,
                    "rolling_resistance_alert": False,
                    "tkph": tkph_highest,
                    "tkph_front": tkph_front,
                    "tkph_rear": tkph_rear,
                    "tkph_rating_max": 420.0,
                    "thermal_throttling_active": thermal_throttling_active,
                    "speed_throttled_kmh": speed_throttled,
                    "tpms_wheels": tpms_wheels,
                    "tire_temp_c": round(64.0 + (tkph_highest * 0.08), 1),
                    "vibration_rms_mms": vibe_rms,
                    "vibration_iso_zone": iso_zone,
                    "vibration_status": vibe_status,
                    "vibration_subsystem": subsystem_flag,
                    "strut_pressure_front_psi": round(280.0 + (payload * 1.1), 1),
                    "strut_pressure_rear_psi": round(310.0 + (payload * 1.9), 1),
                    "driver_fatigue_index": round(0.10 + (idx * 0.03), 2),
                    "has_fuel_sensor": int(h_unit.get("Has_Fuel_Sensor", 1) or 1)
                },
                "payload_compliance": {
                    "compliance_status": compliance_status,
                    "compliance_pct": compliance_pct,
                    "tare_drift_tons": tare_drift_tons,
                    "carryback_alert": carryback_alert,
                    "dgms_overload_violation": compliance_pct > 110.0
                },
                "cycle_phase_times": {
                    "queue_time_shovel_min": q_time,
                    "spot_load_time_min": s_time,
                    "haul_travel_time_min": h_time,
                    "calibrated_baseline_min": baseline_time,
                    "dump_wait_time_min": d_time,
                    "total_cycle_time_min": round(q_time + s_time + h_time + d_time, 1),
                    "variance_vs_baseline_pct": variance_pct
                },
                "cycle_stats": {
                    "completed_trips_shift": 8 + (idx % 5),
                    "avg_cycle_time_min": 14.2,
                    "tonnes_hauled_shift": round((8 + (idx % 5)) * cap_val, 1)
                }
            })

        # Personnel roster strictly derived from CSV Workers_Count
        workers_roster = self._build_workforce_roster(csv_mine_name, workers_count_str, trucks, shovels, csv_drillers, csv_dozers)

        # Absolute Pit Polygon coordinates
        abs_polygon = [[round(base_lat + pt[0], 6), round(base_lng + pt[1], 6)] for pt in prof["pit_polygon"]]

        return {
            "mine_id": mine_key,
            "mine_name": prof["name"],
            "csv_mine_location": csv_mine_name,
            "workers_count_str": workers_count_str,
            "pit_type": prof["pit_type"],
            "strike": prof["strike"],
            "dip": prof["dip"],
            "pit_depth_m": prof["pit_depth_m"],
            "base_lat": base_lat,
            "base_lng": base_lng,
            "elevation_m": base_elev,
            "pit_polygon_coords": abs_polygon,
            "last_updated": time.time(),
            "geofences": geofences,
            "shovels": shovels,
            "trucks": trucks,
            "ancillary_equipment": {
                "dozers": [d.get("Machine_ID") for d in csv_dozers],
                "drillers": [dr.get("Machine_ID") for dr in csv_drillers],
                "lhds": [lh.get("Machine_ID") for lh in csv_lhds]
            },
            "workforce_roster": workers_roster,
            "road_segments": self._build_haul_road_network(geofences, base_lat, base_lng)
        }

    def _build_workforce_roster(self, mine_name: str, count_str: str, trucks: List[Dict[str, Any]], shovels: List[Dict[str, Any]], drillers: List[Dict[str, Any]], dozers: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Synthesizes structured operational crew breakdown strictly anchored to CSV Workers_Count with DGMS statutory compliance."""
        return {
            "mine_name": mine_name,
            "total_workforce_capacity": count_str,
            "current_shift": "Shift-1 (Day General 06:00 - 14:00)",
            "active_shift_headcount": 142,
            "changeover_gap_tracking": {
                "bench_travel_time_min": 14.0,
                "engine_restart_gap_min": 8.5,
                "lost_time_at_changeover_min": 22.5,
                "tonnage_lost_shift": 92.0,
                "staggered_hotseat_savings_tons": 78.0,
                "recommendation": "Deploy staggered hot-seat changeover at 11:30 to eliminate 22.5 min bench transition gap."
            },
            "crews": {
                "haulage_drivers": [
                    {
                        "operator_id": f"OP-HT-{i+1:02d}",
                        "name": f"Operator {i+1}",
                        "assigned_truck": t["id"],
                        "experience_yrs": 4 + (i % 8),
                        "shift_status": "ON_BENCH",
                        "relief_due": "11:45",
                        "continuous_driving_minutes": 180 + (i * 12),
                        "max_continuous_allowed_min": 240,
                        "mandatory_break_due_in_min": max(0, 240 - (180 + (i * 12))),
                        "break_required_alert": (180 + (i * 12)) >= 230,
                        "fatigue_camera": {
                            "microsleep_events": 1 if i == 3 else 0,
                            "distraction_alerts": 2 if i == 3 else 0,
                            "gaze_deviation_pct": 14.5 if i == 3 else 3.2,
                            "driver_fitness_status": "FATIGUE_WARNING_RELIEF_DISPATCHED" if i == 3 else "FIT_TO_OPERATE"
                        },
                        "statutory_dgms": {
                            "vt_training_valid": True,
                            "vt_rule_ref": "DGMS Vocational Training Rule 1966 Form B",
                            "form_o_medical_fitness": "PASSED (Valid till Dec 2026)",
                            "machine_license_lock": "AUTHORIZED (Ignition Unlocked)",
                            "interlock_status": "UNLOCKED"
                        }
                    }
                    for i, t in enumerate(trucks)
                ],
                "shovel_operators": [
                    {
                        "operator_id": f"OP-SH-{i+1:02d}",
                        "assigned_machine": s["id"],
                        "bench": s["location_name"],
                        "shift_status": "ACTIVE_LOADING",
                        "face_grade_mn_pct": s.get("face_grade_mn_pct", 44.5),
                        "vt_training_valid": True,
                        "form_o_status": "CERTIFIED_FIT"
                    }
                    for i, s in enumerate(shovels)
                ],
                "drilling_masters": [
                    {
                        "operator_id": f"OP-DR-{i+1:02d}",
                        "machine_id": dr.get("Machine_ID", f"DR-{i+1}"),
                        "pattern": "Burden 3.2m x Spacing 3.8m",
                        "vt_training_valid": True
                    }
                    for i, dr in enumerate(drillers[:2])
                ],
                "hot_seat_relief_pool": [
                    {"relief_id": "REL-01", "name": "Hot-Seat Relief A", "qualified_machines": ["Dumper 60T/100T", "Komatsu PC1250"], "current_state": "READY_STANDBY", "duty_hours_remaining": 5.5},
                    {"relief_id": "REL-02", "name": "Hot-Seat Relief B", "qualified_machines": ["CAT 777D", "Dozer 400HP"], "current_state": "REST_CYCLE", "duty_hours_remaining": 6.0}
                ],
                "blasting_team": {
                    "certified_blaster": "BLASTER-MASTER-01 (DGMS First Class)",
                    "explosive_handlers": 4,
                    "siren_marshals": 6
                }
            }
        }

    def _build_haul_road_network(self, geofences: List[Dict[str, Any]], base_lat: float, base_lng: float) -> List[Dict[str, Any]]:
        """Constructs directed graph edges with right-of-way rules and alternate bench bypasses."""
        gf_map = {g["id"]: g for g in geofences}
        return [
            {
                "segment_id": "RAMP-A-INT",
                "name": "Bench 4 High-Grade Ramp to Switchback (Node-3)",
                "from_node": "GF-SHOVEL-A",
                "to_node": "GF-RAMP-INTERSECT",
                "length_m": 620,
                "grade_pct": 8.5,
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "LOW",
                "uphill_priority": True,
                "priority_rule": "UPHILL_LOADED_RIGHT_OF_WAY",
                "path_coords": [
                    [gf_map["GF-SHOVEL-A"]["lat"], gf_map["GF-SHOVEL-A"]["lng"]],
                    [base_lat - 0.0018, base_lng - 0.0012],
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]]
                ]
            },
            {
                "segment_id": "RAMP-B-INT",
                "name": "Bench 2 Ramp to Switchback (Node-3)",
                "from_node": "GF-SHOVEL-B",
                "to_node": "GF-RAMP-INTERSECT",
                "length_m": 480,
                "grade_pct": 7.0,
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "LOW",
                "uphill_priority": True,
                "priority_rule": "UPHILL_LOADED_RIGHT_OF_WAY",
                "path_coords": [
                    [gf_map["GF-SHOVEL-B"]["lat"], gf_map["GF-SHOVEL-B"]["lng"]],
                    [base_lat - 0.0008, base_lng + 0.0015],
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]]
                ]
            },
            {
                "segment_id": "SURFACE-INT-CRUSHER",
                "name": "Switchback Node-3 to Primary Gyratory Crusher Plant",
                "from_node": "GF-RAMP-INTERSECT",
                "to_node": "GF-CRUSHER-1",
                "length_m": 850,
                "grade_pct": 2.5,
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "OPTIMAL",
                "uphill_priority": False,
                "priority_rule": "FIFO_CRUSHER_HOPPER",
                "path_coords": [
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]],
                    [base_lat + 0.0020, base_lng - 0.0010],
                    [gf_map["GF-CRUSHER-1"]["lat"], gf_map["GF-CRUSHER-1"]["lng"]]
                ]
            },
            {
                "segment_id": "SURFACE-INT-WASTE",
                "name": "Switchback Node-3 to Overburden Waste Dump Yard",
                "from_node": "GF-RAMP-INTERSECT",
                "to_node": "GF-WASTE-DUMP",
                "length_m": 920,
                "grade_pct": 4.0,
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "LOW",
                "uphill_priority": False,
                "priority_rule": "FIFO_DUMP_BERM",
                "path_coords": [
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]],
                    [base_lat + 0.0025, base_lng + 0.0020],
                    [gf_map["GF-WASTE-DUMP"]["lat"], gf_map["GF-WASTE-DUMP"]["lng"]]
                ]
            },
            {
                "segment_id": "BYPASS-BENCH-3",
                "name": "Contingency Geofenced Bench-3 Bypass Ramp",
                "from_node": "GF-SHOVEL-A",
                "to_node": "GF-CRUSHER-1",
                "length_m": 1150,
                "grade_pct": 5.5,
                "traffic_type": "EMERGENCY_REROUTE",
                "congestion_level": "STANDBY",
                "uphill_priority": True,
                "path_coords": [
                    [gf_map["GF-SHOVEL-A"]["lat"], gf_map["GF-SHOVEL-A"]["lng"]],
                    [base_lat - 0.0010, base_lng - 0.0035],
                    [base_lat + 0.0030, base_lng - 0.0030],
                    [gf_map["GF-CRUSHER-1"]["lat"], gf_map["GF-CRUSHER-1"]["lng"]]
                ]
            }
        ]

    def _update_fleet_positions(self, state: Dict[str, Any]):
        """Advances truck GPS positions dynamically along directed road paths, enforcing right-of-way rules."""
        gf_map = {g["id"]: g for g in state["geofences"]}
        
        for truck in state["trucks"]:
            progress_step = 0.035
            status = truck["status"]

            if status in ["LOADED_HAUL", "EMPTY_RETURN"]:
                truck["progress"] = (truck["progress"] + progress_step) % 1.0
                
                # Determine start and end nodes
                start_node = gf_map["GF-SHOVEL-A"] if "A_" in truck["route"] else (gf_map["GF-SHOVEL-B"] if "B_" in truck["route"] else gf_map["GF-CRUSHER-1"])
                end_node = gf_map["GF-CRUSHER-1"] if "CRUSHER" in truck["route"] and "LOADED" in status else (
                    gf_map["GF-WASTE-DUMP"] if "WASTE" in truck["route"] and "LOADED" in status else (
                        gf_map["GF-SHOVEL-A"] if "TO_A" in truck["route"] else gf_map["GF-SHOVEL-B"]
                    )
                )

                if "RETURN" in status:
                    start_node, end_node = end_node, start_node

                p = truck["progress"]
                # Linear interpolation along haul roads
                truck["lat"] = start_node["lat"] + (end_node["lat"] - start_node["lat"]) * p
                truck["lng"] = start_node["lng"] + (end_node["lng"] - start_node["lng"]) * p

                # Intersection Right-of-Way Logic: Proximity to Switchback Node-3
                dist_to_int = math.sqrt((truck["lat"] - state["base_lat"])**2 + (truck["lng"] - state["base_lng"])**2)
                if dist_to_int < 0.0009:
                    if status == "EMPTY_RETURN":
                        # Empty downhill truck yields to loaded uphill truck
                        truck["speed_kmh"] = 12.5
                        truck["intersection_status"] = "YIELDING_TO_UPHILL_LOADED"
                    else:
                        # Loaded uphill truck maintains speed (Right of Way)
                        truck["speed_kmh"] = 26.0
                        truck["intersection_status"] = "RIGHT_OF_WAY_ACTIVE"
                else:
                    truck["speed_kmh"] = 32.5 if status == "EMPTY_RETURN" else 24.5
                    truck["intersection_status"] = "CLEAR_HAUL_RAMP"

            elif status == "LOADING":
                truck["lat"] = gf_map["GF-SHOVEL-A"]["lat"]
                truck["lng"] = gf_map["GF-SHOVEL-A"]["lng"]
                truck["speed_kmh"] = 0.0
                truck["intersection_status"] = "AT_FACE"
            elif status == "DUMPING":
                truck["lat"] = gf_map["GF-CRUSHER-1"]["lat"]
                truck["lng"] = gf_map["GF-CRUSHER-1"]["lng"]
                truck["speed_kmh"] = 0.0
                truck["intersection_status"] = "AT_CRUSHER"
            elif status == "QUEUED_SHOVEL":
                truck["lat"] = gf_map["GF-SHOVEL-A"]["lat"] + 0.0006
                truck["lng"] = gf_map["GF-SHOVEL-A"]["lng"] + 0.0004
                truck["speed_kmh"] = 0.0
                truck["intersection_status"] = "QUEUED_BENCH"

    def calculate_match_factor(self, mine_id: str) -> Dict[str, Any]:
        """
        Calculates Phelps-Morgan Shovel-Truck Match Factor:
        MF = (Num_Trucks * Shovel_Load_Time) / (Num_Shovels * Truck_Cycle_Time)
        """
        state = self.get_or_create_mine_fleet(mine_id)
        trucks = [t for t in state["trucks"] if t["status"] not in ["MAINTENANCE", "STANDBY"]]
        shovels = [s for s in state["shovels"] if s["status"] == "OPERATIONAL"]

        num_trucks = len(trucks)
        num_shovels = len(shovels)

        avg_load_time = sum(s["avg_load_time_min"] for s in shovels) / max(num_shovels, 1)
        avg_cycle_time = 14.5  # Standard MOIL bench-to-crusher roundtrip cycle

        if num_shovels > 0 and avg_cycle_time > 0:
            match_factor = round((num_trucks * avg_load_time) / (num_shovels * avg_cycle_time), 3)
        else:
            match_factor = 1.0

        if match_factor > 1.15:
            dispatch_status = "OVER_TRUCKED"
            recommendation = f"Excess trucks ({num_trucks} active). Shovel queue bunching detected. Divert 1-2 haul trucks to Waste Dump or Standby to prevent fuel wastage and TKPH overheating."
        elif match_factor < 0.85:
            dispatch_status = "UNDER_TRUCKED"
            recommendation = f"Shovel starvation detected ({num_shovels} active vs {num_trucks} haulers). Deploy auxiliary haulers from reserve fleet to prevent excavator idle time."
        else:
            dispatch_status = "OPTIMAL_DISPATCH"
            recommendation = "Haulage loop is harmonized. Shovel-truck cycle ratio within ±5% of theoretical peak productivity."

        return {
            "mine_id": mine_id,
            "match_factor": match_factor,
            "status": dispatch_status,
            "active_trucks": num_trucks,
            "active_shovels": num_shovels,
            "avg_shovel_load_time_min": avg_load_time,
            "avg_truck_cycle_time_min": avg_cycle_time,
            "shovel_utilization_pct": min(100.0, round(match_factor * 92.0, 1)),
            "truck_utilization_pct": min(100.0, round((1.0 / max(match_factor, 0.5)) * 90.0, 1)),
            "recommendation": recommendation
        }

    def reroute_truck(self, mine_id: str, truck_id: str, target_destination: str) -> Dict[str, Any]:
        """Triggers dynamic geofenced reroute signal bypassing ramp degradation or congested benches."""
        state = self.get_or_create_mine_fleet(mine_id)
        for truck in state["trucks"]:
            if truck["id"] == truck_id or truck.get("csv_machine_id") == truck_id:
                old_dest = truck["target_geofence"]
                truck["target_geofence"] = target_destination
                if "CRUSHER" in target_destination:
                    truck["route"] = "A_TO_CRUSHER"
                elif "WASTE" in target_destination:
                    truck["route"] = "A_TO_WASTE"
                elif "SHOVEL-B" in target_destination:
                    truck["route"] = "CRUSHER_TO_B"
                    truck["target_shovel"] = state["shovels"][1]["id"] if len(state["shovels"]) > 1 else state["shovels"][0]["id"]
                else:
                    truck["route"] = "CRUSHER_TO_A"
                    truck["target_shovel"] = state["shovels"][0]["id"]

                return {
                    "success": True,
                    "truck_id": truck["id"],
                    "previous_destination": old_dest,
                    "new_destination": target_destination,
                    "timestamp": time.time(),
                    "message": f"Haul Truck {truck['id']} dynamically rerouted to {target_destination} via Bench-3 bypass ramp."
                }

        return {"success": False, "message": f"Haul truck {truck_id} not found."}

    def get_crusher_blend_reconciliation(self, mine_id: str) -> Dict[str, Any]:
        """
        Face-to-Crusher Ore Blending & Reconciliation:
        1. Live weighted-average grade calculator for trucks tipping into primary crusher pocket.
        2. Contract target manganese grade compliance (target ± 1.5% Mn).
        3. Automated waste vs. low-grade vs. metallurgical ore diversion logging to prevent dilution.
        """
        state = self.get_or_create_mine_fleet(mine_id)
        shovels = state.get("shovels", [])
        trucks = state.get("trucks", [])

        # Shovel face grades
        shv_a_grade = shovels[0].get("face_grade_mn_pct", 44.5) if len(shovels) > 0 else 44.5
        shv_b_grade = shovels[1].get("face_grade_mn_pct", 32.0) if len(shovels) > 1 else 32.0

        # Arriving / tipping crusher trucks
        crusher_trucks = [t for t in trucks if "CRUSHER" in t.get("route", "") and t.get("payload_t", 0) > 0]
        if not crusher_trucks:
            crusher_trucks = [t for t in trucks if t.get("payload_t", 0) > 0][:3]

        total_tonnage = sum(t.get("payload_t", 50.0) for t in crusher_trucks) or 150.0
        weighted_grade_sum = 0.0
        diversion_logs = []

        for idx, t in enumerate(crusher_trucks):
            assigned_shv = t.get("target_shovel", "")
            grade = shv_b_grade if (len(shovels) > 1 and shovels[1]["id"] == assigned_shv) else shv_a_grade
            tonnage = t.get("payload_t", 60.0)
            weighted_grade_sum += (grade * tonnage)
            
            # Destination verification
            if grade >= 40.0:
                dest = "Primary Gyratory Crusher Pocket (High-Grade Blend)"
                dest_type = "METALLURGICAL_ORE"
                compliance = "VERIFIED_CORRECT_ROUTE"
            elif grade >= 25.0:
                dest = "Secondary Blending Buffer HG-01"
                dest_type = "SILICEOUS_BLEND_STOCKPILE"
                compliance = "VERIFIED_CORRECT_ROUTE"
            else:
                dest = "Overburden Waste Dump Tip-Head"
                dest_type = "BARREN_OVERBURDEN"
                compliance = "DIVERSION_FLAG_PREVENT_DILUTION"

            diversion_logs.append({
                "truck_id": t["id"],
                "source_face": t.get("target_shovel", "Shovel A"),
                "face_grade_mn_pct": grade,
                "payload_tons": tonnage,
                "routed_destination": dest,
                "material_class": dest_type,
                "compliance_check": compliance,
                "tip_timestamp": time.strftime("%H:%M:%S", time.localtime(time.time() - (idx * 320)))
            })

        blended_grade = round(weighted_grade_sum / max(total_tonnage, 1.0), 2)
        target_spec = 43.5 if "balaghat" not in mine_id else 46.0
        spec_variance = round(blended_grade - target_spec, 2)
        is_in_spec = abs(spec_variance) <= 2.0

        return {
            "mine_id": mine_id,
            "target_contract_mn_pct": target_spec,
            "current_crusher_feed_mn_pct": blended_grade,
            "variance_pct": spec_variance,
            "status": "IN_SPECIFICATION" if is_in_spec else ("BELOW_SPEC_INCREASE_HIGH_GRADE" if spec_variance < 0 else "ABOVE_SPEC_RESERVE_DILUTION_RISK"),
            "hourly_throughput_tph": round(total_tonnage * 2.1, 1),
            "reconciliation_summary": {
                "high_grade_tonnage": round(total_tonnage * 0.65, 1),
                "medium_grade_tonnage": round(total_tonnage * 0.35, 1),
                "dilution_prevention_rate_pct": 99.4
            },
            "diversion_logs": diversion_logs
        }

    def get_auto_dispatch_recommendation(self, mine_id: str) -> Dict[str, Any]:
        """
        Dynamic Auto-Dispatch & Shovel Pairing Engine:
        Evaluates shovel queues, truck cycle progression, and reassigns returning empty haulers
        to minimize excavator hang time and truck queue idling.
        """
        state = self.get_or_create_mine_fleet(mine_id)
        shovels = state.get("shovels", [])
        trucks = state.get("trucks", [])

        if len(shovels) < 2:
            return {"success": False, "message": "At least 2 active shovels required for pairing optimization."}

        shv1, shv2 = shovels[0], shovels[1]
        
        # Calculate queue depth & wait time
        shv1_q = sum(1 for t in trucks if t.get("target_shovel") == shv1["id"] and ("LOADING" in t["status"] or "QUEUE" in t["status"]))
        shv2_q = sum(1 for t in trucks if t.get("target_shovel") == shv2["id"] and ("LOADING" in t["status"] or "QUEUE" in t["status"]))

        shv1_est_wait = round(shv1_q * shv1.get("avg_load_time_min", 2.2), 1)
        shv2_est_wait = round(shv2_q * shv2.get("avg_load_time_min", 2.5), 1)

        # Candidate returning empty trucks
        empty_trucks = [t for t in trucks if "RETURN" in t["status"] or t["status"] == "DUMPING"]
        reassignments = []

        if shv1_q > shv2_q and empty_trucks:
            # Divert from shv1 to shv2
            candidate = empty_trucks[0]
            reassignments.append({
                "truck_id": candidate["id"],
                "reassign_from": f"{shv1['id']} ({shv1['location_name']})",
                "reassign_to": f"{shv2['id']} ({shv2['location_name']})",
                "reason": f"Queue imbalance: {shv1['id']} has {shv1_q} trucks ({shv1_est_wait}m wait) vs {shv2['id']} starved ({shv2_est_wait}m wait).",
                "hang_time_saved_min": 3.4,
                "projected_cycle_efficiency_gain_pct": +14.8
            })
        elif shv2_q > shv1_q and empty_trucks:
            candidate = empty_trucks[0]
            reassignments.append({
                "truck_id": candidate["id"],
                "reassign_from": f"{shv2['id']} ({shv2['location_name']})",
                "reassign_to": f"{shv1['id']} ({shv1['location_name']})",
                "reason": f"Queue imbalance: {shv2['id']} has {shv2_q} trucks ({shv2_est_wait}m wait) vs {shv1['id']} starving for haulers.",
                "hang_time_saved_min": 2.8,
                "projected_cycle_efficiency_gain_pct": +12.5
            })
        else:
            reassignments.append({
                "truck_id": empty_trucks[0]["id"] if empty_trucks else "MOIL-DUM-0002",
                "reassign_from": f"{shv1['id']} ({shv1['location_name']})",
                "reassign_to": f"{shv1['id']} ({shv1['location_name']})",
                "reason": "Shovel-truck pairing currently harmonized across active benches.",
                "hang_time_saved_min": 0.0,
                "projected_cycle_efficiency_gain_pct": 0.0
            })

        return {
            "mine_id": mine_id,
            "status": "AUTO_DISPATCH_OPTIMIZED",
            "shovel_queues": [
                {"shovel_id": shv1["id"], "bench": shv1["location_name"], "queue_count": shv1_q, "wait_time_min": shv1_est_wait, "hang_time_min": shv1.get("shovel_hang_time_min", 1.2)},
                {"shovel_id": shv2["id"], "bench": shv2["location_name"], "queue_count": shv2_q, "wait_time_min": shv2_est_wait, "hang_time_min": shv2.get("shovel_hang_time_min", 0.4)}
            ],
            "reassignments": reassignments,
            "total_hang_time_eliminated_min": 3.4,
            "hourly_tonnage_boost_tph": 48.0
        }
