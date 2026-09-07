"""
MOIL AI: Dynamic Haulage & Intersection Management Engine
---------------------------------------------------------
1. Haul Road Network Topology & Intersection Logic (Directed Graph Model).
2. Right-of-way rules (Loaded uphill haul trucks take precedence over empty downhill trucks, FIFO queues).
3. Geofenced Dynamic Rerouting (Speed < 15 km/h trigger, congestion bypass).
4. Match Factor Calculator (MF = Trucks * Shovel_Load_Time / (Shovels * Cycle_Time)).
5. TKPH & Tire Telemetry (Ton-Km-Per-Hour, Payload, Engine Temp, Strut Pressures, Fuel Burn).
"""

import math
import random
import time
from typing import Dict, List, Any, Optional

# 11 MOIL Mine Specific Geotechnical & Topology Profiles
MOIL_MINE_PROFILES = {
    "zone-dongri-buzurg": {
        "lat": 21.5420, "lng": 79.6780, "name": "Dongri Buzurg Opencast Mine", "elevation_m": 340, "pit_type": "Elliptical Opencast Pit",
        "strike": "N70°E", "dip": "60° NW", "pit_depth_m": 85,
        "shovels": [
            {"id": "EX-DB-01", "model": "Komatsu PC1250-8R (7.0 m³)", "bench": "Bench 4 (East Face - 44.5% Mn)", "load_min": 2.2, "offset": [-0.0035, -0.0025]},
            {"id": "EX-DB-02", "model": "Tata Hitachi EX1200-6 (6.5 m³)", "bench": "Bench 2 (Central Face - 32.0% Mn)", "load_min": 2.5, "offset": [-0.0018, 0.0028]}
        ],
        "crusher_offset": [0.0042, -0.0018],
        "dump_offset": [0.0048, 0.0038],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0045, -0.0040], [-0.0020, -0.0045], [0.0010, -0.0030], [0.0025, 0.0010], [0.0015, 0.0045], [-0.0030, 0.0040], [-0.0050, 0.0010]]
    },
    "zone-balaghat": {
        "lat": 21.8025, "lng": 80.1873, "name": "Balaghat Deep Opencast & Shaft Mine", "elevation_m": 310, "pit_type": "Deep Strike-Slip Pit",
        "strike": "N15°E", "dip": "80° SE", "pit_depth_m": 120,
        "shovels": [
            {"id": "EX-BG-01", "model": "CAT 390F (6.0 m³)", "bench": "North Deep Lode (48.0% Mn)", "load_min": 2.0, "offset": [-0.0045, 0.0010]},
            {"id": "EX-BG-02", "model": "Komatsu PC1250 (7.0 m³)", "bench": "South Hanging Wall Bench (36.5% Mn)", "load_min": 2.3, "offset": [0.0020, -0.0035]}
        ],
        "crusher_offset": [0.0050, 0.0025],
        "dump_offset": [-0.0020, 0.0050],
        "intersect_offset": [0.0005, -0.0005],
        "pit_polygon": [[-0.0060, 0.0000], [-0.0030, -0.0040], [0.0030, -0.0045], [0.0055, -0.0010], [0.0040, 0.0035], [-0.0010, 0.0045], [-0.0050, 0.0030]]
    },
    "zone-mansar": {
        "lat": 21.4011, "lng": 79.2890, "name": "Mansar Hill-Ridge Opencast Mine", "elevation_m": 360, "pit_type": "Arcuate Hill Flank Pit",
        "strike": "E-W", "dip": "55° S", "pit_depth_m": 65,
        "shovels": [
            {"id": "EX-MS-01", "model": "Tata Hitachi EX1200", "bench": "Central Ridge Bench 3 (39.0% Mn)", "load_min": 2.4, "offset": [-0.0025, -0.0030]},
            {"id": "EX-MS-02", "model": "BEML BE1000", "bench": "West Ridge Bench 1 (31.5% Mn)", "load_min": 2.8, "offset": [0.0010, -0.0040]}
        ],
        "crusher_offset": [0.0035, 0.0030],
        "dump_offset": [0.0040, -0.0020],
        "intersect_offset": [0.0002, 0.0005],
        "pit_polygon": [[-0.0040, -0.0050], [-0.0010, -0.0045], [0.0030, -0.0030], [0.0035, 0.0010], [0.0010, 0.0030], [-0.0025, 0.0020], [-0.0045, -0.0010]]
    },
    "zone-chikla": {
        "lat": 21.5630, "lng": 79.7420, "name": "Chikla Steep Spiral Opencast Pit", "elevation_m": 325, "pit_type": "Steep Spiral Switchback Pit",
        "strike": "N60°E", "dip": "68° NW", "pit_depth_m": 90,
        "shovels": [
            {"id": "EX-CK-01", "model": "Komatsu PC1250", "bench": "North Synclinal Core (42.0% Mn)", "load_min": 2.1, "offset": [-0.0038, -0.0015]},
            {"id": "EX-CK-02", "model": "CAT 374D", "bench": "East Flank Bench 2 (33.0% Mn)", "load_min": 2.6, "offset": [0.0015, 0.0032]}
        ],
        "crusher_offset": [0.0045, -0.0030],
        "dump_offset": [-0.0010, 0.0045],
        "intersect_offset": [0.0000, 0.0002],
        "pit_polygon": [[-0.0050, -0.0030], [-0.0025, -0.0045], [0.0020, -0.0035], [0.0040, 0.0010], [0.0025, 0.0040], [-0.0015, 0.0035], [-0.0045, 0.0015]]
    },
    "zone-kandri": {
        "lat": 21.4190, "lng": 79.2740, "name": "Kandri High-Grade Saddle Pit", "elevation_m": 355, "pit_type": "Saddle Lode Opencast",
        "strike": "N45°E", "dip": "62° NW", "pit_depth_m": 75,
        "shovels": [
            {"id": "EX-KD-01", "model": "Komatsu PC1250", "bench": "Saddle High-Grade Pocket (45.0% Mn)", "load_min": 2.2, "offset": [-0.0030, -0.0020]},
            {"id": "EX-KD-02", "model": "Hitachi EX1200", "bench": "South Overburden Face (28.0% Mn)", "load_min": 2.5, "offset": [0.0022, -0.0025]}
        ],
        "crusher_offset": [0.0038, 0.0028],
        "dump_offset": [0.0042, -0.0035],
        "intersect_offset": [0.0001, 0.0001],
        "pit_polygon": [[-0.0040, -0.0035], [-0.0015, -0.0040], [0.0025, -0.0025], [0.0035, 0.0015], [0.0015, 0.0035], [-0.0020, 0.0025], [-0.0040, 0.0005]]
    },
    "zone-ukwa": {
        "lat": 21.9670, "lng": 80.4680, "name": "Ukwa Ridge-Top Spine Mine", "elevation_m": 410, "pit_type": "Narrow Ridge-Top Lode",
        "strike": "N65°E", "dip": "35° NW", "pit_depth_m": 55,
        "shovels": [
            {"id": "EX-UK-01", "model": "CAT 390F", "bench": "North Ridge Lode 4 (46.0% Mn)", "load_min": 2.1, "offset": [-0.0040, -0.0035]},
            {"id": "EX-UK-02", "model": "Komatsu PC800", "bench": "East Outcrop Bench (34.0% Mn)", "load_min": 2.7, "offset": [0.0030, 0.0030]}
        ],
        "crusher_offset": [0.0045, -0.0020],
        "dump_offset": [-0.0030, 0.0045],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0055, -0.0050], [-0.0020, -0.0045], [0.0015, -0.0010], [0.0045, 0.0035], [0.0030, 0.0045], [-0.0010, 0.0015], [-0.0045, -0.0025]]
    },
    "zone-sitapatore": {
        "lat": 21.5800, "lng": 79.7900, "name": "Sitapatore Wide-Berm Opencast", "elevation_m": 305, "pit_type": "Shallow Wide-Berm Pit",
        "strike": "N80°E", "dip": "45° S", "pit_depth_m": 45,
        "shovels": [
            {"id": "EX-ST-01", "model": "Tata Hitachi EX1200", "bench": "Main Bench A (37.0% Mn)", "load_min": 2.4, "offset": [-0.0028, -0.0020]},
            {"id": "EX-ST-02", "model": "BEML BE1000", "bench": "Overburden Stripping (25.0% Mn)", "load_min": 2.9, "offset": [0.0018, 0.0025]}
        ],
        "crusher_offset": [0.0035, -0.0025],
        "dump_offset": [0.0040, 0.0030],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0040, -0.0030], [-0.0015, -0.0040], [0.0025, -0.0030], [0.0035, 0.0010], [0.0020, 0.0035], [-0.0015, 0.0030], [-0.0035, 0.0010]]
    },
    "zone-gumgaon": {
        "lat": 21.3900, "lng": 79.0200, "name": "Gumgaon Synclinal Opencast Pit", "elevation_m": 330, "pit_type": "Synclinal Basin Pit",
        "strike": "E-W", "dip": "70° S", "pit_depth_m": 80,
        "shovels": [
            {"id": "EX-GM-01", "model": "Komatsu PC1250", "bench": "Basin Core Bench (40.5% Mn)", "load_min": 2.2, "offset": [-0.0032, -0.0025]},
            {"id": "EX-GM-02", "model": "Hitachi EX1200", "bench": "North Limb Bench 1 (30.0% Mn)", "load_min": 2.6, "offset": [0.0020, 0.0020]}
        ],
        "crusher_offset": [0.0040, -0.0020],
        "dump_offset": [-0.0020, 0.0040],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0045, -0.0035], [-0.0020, -0.0045], [0.0020, -0.0035], [0.0035, 0.0010], [0.0020, 0.0035], [-0.0015, 0.0030], [-0.0040, 0.0005]]
    },
    "zone-tirodi": {
        "lat": 21.6850, "lng": 79.7120, "name": "Tirodi Multi-Pit Complex", "elevation_m": 370, "pit_type": "Multi-Bench Opencast Complex",
        "strike": "N50°E", "dip": "60° SE", "pit_depth_m": 95,
        "shovels": [
            {"id": "EX-TR-01", "model": "Komatsu PC1250", "bench": "North Pit Deep Lode (43.0% Mn)", "load_min": 2.1, "offset": [-0.0040, -0.0028]},
            {"id": "EX-TR-02", "model": "CAT 374D", "bench": "South Pit Bench 3 (35.0% Mn)", "load_min": 2.4, "offset": [0.0025, 0.0025]}
        ],
        "crusher_offset": [0.0048, -0.0015],
        "dump_offset": [0.0050, 0.0035],
        "intersect_offset": [0.0005, 0.0000],
        "pit_polygon": [[-0.0050, -0.0040], [-0.0025, -0.0050], [0.0025, -0.0030], [0.0045, 0.0015], [0.0030, 0.0045], [-0.0010, 0.0040], [-0.0045, 0.0010]]
    },
    "zone-parsoda": {
        "lat": 21.3500, "lng": 79.3500, "name": "Parsoda Opencast Quarry", "elevation_m": 315, "pit_type": "Alluvial Covered Flat Pit",
        "strike": "N40°E", "dip": "50° NW", "pit_depth_m": 50,
        "shovels": [
            {"id": "EX-PS-01", "model": "Tata Hitachi EX1200", "bench": "East Quarry Bench (38.0% Mn)", "load_min": 2.5, "offset": [-0.0025, -0.0020]},
            {"id": "EX-PS-02", "model": "BEML BE1000", "bench": "West Overburden Strip (26.0% Mn)", "load_min": 2.8, "offset": [0.0015, 0.0025]}
        ],
        "crusher_offset": [0.0035, -0.0020],
        "dump_offset": [0.0040, 0.0030],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0035, -0.0030], [-0.0010, -0.0035], [0.0025, -0.0025], [0.0030, 0.0015], [0.0015, 0.0030], [-0.0015, 0.0025], [-0.0035, 0.0005]]
    },
    "zone-ramtek": {
        "lat": 21.3950, "lng": 79.3300, "name": "Ramtek Hillside Opencast Pit", "elevation_m": 345, "pit_type": "Contour Hill Quarry",
        "strike": "N55°E", "dip": "58° NW", "pit_depth_m": 60,
        "shovels": [
            {"id": "EX-RT-01", "model": "Komatsu PC1250", "bench": "Hillside Face 3 (38.5% Mn)", "load_min": 2.3, "offset": [-0.0030, -0.0022]},
            {"id": "EX-RT-02", "model": "Hitachi EX1200", "bench": "Contour Bench 1 (30.5% Mn)", "load_min": 2.7, "offset": [0.0020, 0.0022]}
        ],
        "crusher_offset": [0.0038, -0.0022],
        "dump_offset": [0.0042, 0.0032],
        "intersect_offset": [0.0000, 0.0000],
        "pit_polygon": [[-0.0040, -0.0030], [-0.0015, -0.0038], [0.0025, -0.0028], [0.0035, 0.0012], [0.0020, 0.0032], [-0.0012, 0.0028], [-0.0038, 0.0008]]
    }
}

class FleetEngine:
    def __init__(self):
        # Cache fleet states per mine to preserve state across polling calls
        self._fleet_state_cache: Dict[str, Dict[str, Any]] = {}

    def get_or_create_mine_fleet(self, mine_id: str) -> Dict[str, Any]:
        """
        Retrieves current fleet telemetry and topological state or initializes a new mine fleet.
        """
        mine_key = mine_id if mine_id in MOIL_MINE_PROFILES else "zone-dongri-buzurg"
        prof = MOIL_MINE_PROFILES[mine_key]
        base_lat = prof["lat"]
        base_lng = prof["lng"]

        # If existing state is older than 5 mins or not present, initialize
        if mine_key not in self._fleet_state_cache:
            self._fleet_state_cache[mine_key] = self._init_fleet_for_mine(mine_key, prof)

        state = self._fleet_state_cache[mine_key]
        self._update_fleet_positions(state)
        return state

    def _init_fleet_for_mine(self, mine_key: str, prof: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initializes haul road nodes, shovels, geofences, and truck telemetry for the specific mine.
        """
        base_lat = prof["lat"]
        base_lng = prof["lng"]
        base_elev = prof["elevation_m"]

        # Construct exact GPS geofences from mine-specific profile offsets
        shv_cfg = prof["shovels"]
        shv_a = shv_cfg[0]
        shv_b = shv_cfg[1]

        geofences = [
            {
                "id": "GF-SHOVEL-A",
                "name": f"{shv_a['id']} Pocket ({shv_a['bench']})",
                "type": "LOADING_ZONE",
                "lat": round(base_lat + shv_a["offset"][0], 6),
                "lng": round(base_lng + shv_a["offset"][1], 6),
                "elevation_m": base_elev - int(prof["pit_depth_m"] * 0.6),
                "radius_m": 50,
                "speed_limit_kmh": 15
            },
            {
                "id": "GF-SHOVEL-B",
                "name": f"{shv_b['id']} Pocket ({shv_b['bench']})",
                "type": "LOADING_ZONE",
                "lat": round(base_lat + shv_b["offset"][0], 6),
                "lng": round(base_lng + shv_b["offset"][1], 6),
                "elevation_m": base_elev - int(prof["pit_depth_m"] * 0.3),
                "radius_m": 50,
                "speed_limit_kmh": 15
            },
            {
                "id": "GF-RAMP-INTERSECT",
                "name": f"{prof['name']} Main Ramp Switchback (Node-3)",
                "type": "INTERSECTION",
                "lat": round(base_lat + prof["intersect_offset"][0], 6),
                "lng": round(base_lng + prof["intersect_offset"][1], 6),
                "elevation_m": base_elev - 10,
                "radius_m": 40,
                "speed_limit_kmh": 20,
                "priority_rule": "UPHILL_LOADED_RIGHT_OF_WAY"
            },
            {
                "id": "GF-CRUSHER-1",
                "name": f"{prof['name']} Primary Gyratory Crusher Plant",
                "type": "DUMP_ZONE_ORE",
                "lat": round(base_lat + prof["crusher_offset"][0], 6),
                "lng": round(base_lng + prof["crusher_offset"][1], 6),
                "elevation_m": base_elev + 5,
                "radius_m": 65,
                "speed_limit_kmh": 15
            },
            {
                "id": "GF-WASTE-DUMP",
                "name": f"{prof['name']} Overburden Waste Dump Yard",
                "type": "DUMP_ZONE_WASTE",
                "lat": round(base_lat + prof["dump_offset"][0], 6),
                "lng": round(base_lng + prof["dump_offset"][1], 6),
                "elevation_m": base_elev + 15,
                "radius_m": 85,
                "speed_limit_kmh": 20
            }
        ]

        # Active Shovels
        shovels = [
            {
                "id": shv_a["id"],
                "model": shv_a["model"],
                "type": "Hydraulic Excavator",
                "location_name": shv_a["bench"],
                "geofence_id": "GF-SHOVEL-A",
                "lat": geofences[0]["lat"],
                "lng": geofences[0]["lng"],
                "status": "OPERATIONAL",
                "bucket_capacity_t": 14.5,
                "avg_load_time_min": shv_a["load_min"],
                "queue_count": 1,
                "health_pct": 94.2
            },
            {
                "id": shv_b["id"],
                "model": shv_b["model"],
                "type": "Hydraulic Excavator",
                "location_name": shv_b["bench"],
                "geofence_id": "GF-SHOVEL-B",
                "lat": geofences[1]["lat"],
                "lng": geofences[1]["lng"],
                "status": "OPERATIONAL",
                "bucket_capacity_t": 13.0,
                "avg_load_time_min": shv_b["load_min"],
                "queue_count": 0,
                "health_pct": 87.6
            }
        ]

        # Haul Truck fleet tailored to mine scale
        truck_configs = [
            {"id": f"HT-{mine_key[-2:].upper()}01", "model": "CAT 777D (100-Ton)", "capacity_t": 95.0, "status": "LOADED_HAUL", "progress": 0.45, "route": "A_TO_CRUSHER", "target_shovel": shv_a["id"]},
            {"id": f"HT-{mine_key[-2:].upper()}02", "model": "CAT 777D (100-Ton)", "capacity_t": 95.0, "status": "EMPTY_RETURN", "progress": 0.75, "route": "CRUSHER_TO_A", "target_shovel": shv_a["id"]},
            {"id": f"HT-{mine_key[-2:].upper()}03", "model": "BEL 205B (60-Ton)", "capacity_t": 58.0, "status": "LOADING", "progress": 0.05, "route": "A_TO_CRUSHER", "target_shovel": shv_a["id"]},
            {"id": f"HT-{mine_key[-2:].upper()}04", "model": "CAT 777D (100-Ton)", "capacity_t": 95.0, "status": "LOADED_HAUL", "progress": 0.20, "route": "B_TO_CRUSHER", "target_shovel": shv_b["id"]},
            {"id": f"HT-{mine_key[-2:].upper()}05", "model": "BEL 205B (60-Ton)", "capacity_t": 58.0, "status": "DUMPING", "progress": 0.95, "route": "B_TO_CRUSHER", "target_shovel": shv_b["id"]},
            {"id": f"HT-{mine_key[-2:].upper()}06", "model": "BEML BH60M (60-Ton)", "capacity_t": 60.0, "status": "EMPTY_RETURN", "progress": 0.35, "route": "CRUSHER_TO_B", "target_shovel": shv_b["id"]},
            {"id": f"HT-{mine_key[-2:].upper()}07", "model": "CAT 777D (100-Ton)", "capacity_t": 95.0, "status": "LOADED_HAUL", "progress": 0.60, "route": "A_TO_WASTE", "target_shovel": shv_a["id"]},
            {"id": f"HT-{mine_key[-2:].upper()}08", "model": "BEML BH60M (60-Ton)", "capacity_t": 60.0, "status": "QUEUED_SHOVEL", "progress": 0.01, "route": "A_TO_CRUSHER", "target_shovel": shv_a["id"]}
        ]

        trucks = []
        for i, cfg in enumerate(truck_configs):
            payload = cfg["capacity_t"] if "LOADED" in cfg["status"] or cfg["status"] == "DUMPING" else (cfg["capacity_t"] * 0.95 if cfg["status"] == "LOADING" else 0.0)
            trucks.append({
                "id": cfg["id"],
                "model": cfg["model"],
                "capacity_t": cfg["capacity_t"],
                "payload_t": round(payload, 1),
                "status": cfg["status"],
                "route": cfg["route"],
                "progress": cfg["progress"],
                "speed_kmh": 26.5 if "HAUL" in cfg["status"] or "RETURN" in cfg["status"] else (0.0 if "LOADING" in cfg["status"] or "DUMPING" in cfg["status"] or "QUEUED" in cfg["status"] else 12.0),
                "heading_deg": 45.0 + (i * 30),
                "target_shovel": cfg["target_shovel"],
                "target_geofence": "GF-CRUSHER-1" if "CRUSHER" in cfg["route"] else ("GF-WASTE-DUMP" if "WASTE" in cfg["route"] else "GF-SHOVEL-A"),
                "lat": base_lat,
                "lng": base_lng,
                "telemetry": {
                    "engine_rpm": 1780 if "HAUL" in cfg["status"] else 750,
                    "coolant_temp_c": 86.4 + (i * 1.5),
                    "oil_pressure_kpa": 420.0,
                    "fuel_level_pct": 74.0 - (i * 3.2),
                    "fuel_burn_rate_lph": 62.5 if "LOADED" in cfg["status"] else 38.0,
                    "tkph": round((payload * 28.5) / 2.0, 1) if payload > 0 else 65.0,
                    "tkph_rating_max": 420.0,
                    "tire_temp_c": 68.5 + (i * 2.1),
                    "strut_pressure_front_psi": 285.0 + (payload * 1.2),
                    "strut_pressure_rear_psi": 310.0 + (payload * 1.8),
                    "driver_fatigue_index": 0.12 + (i * 0.04)
                },
                "cycle_stats": {
                    "completed_trips_shift": 9 + (i % 4),
                    "avg_cycle_time_min": 14.2,
                    "tonnes_hauled_shift": (9 + (i % 4)) * cfg["capacity_t"]
                }
            })

        # Calculate absolute GPS pit polygon
        abs_polygon = [[round(base_lat + pt[0], 6), round(base_lng + pt[1], 6)] for pt in prof["pit_polygon"]]

        return {
            "mine_id": mine_key,
            "mine_name": prof["name"],
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
            "road_segments": self._build_haul_road_network(geofences, base_lat, base_lng)
        }

    def _build_haul_road_network(self, geofences: List[Dict[str, Any]], base_lat: float, base_lng: float) -> List[Dict[str, Any]]:
        """
        Creates directed graph edges for pit ramp network with right-of-way intersection rules.
        """
        gf_map = {g["id"]: g for g in geofences}
        
        segments = [
            {
                "segment_id": "RAMP-A-INT",
                "name": "Bench 4 to Switchback Intersection Ramp",
                "from_node": "GF-SHOVEL-A",
                "to_node": "GF-RAMP-INTERSECT",
                "length_m": 620,
                "grade_pct": 8.5, # 8.5% uphill grade
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "LOW",
                "uphill_priority": True,
                "path_coords": [
                    [gf_map["GF-SHOVEL-A"]["lat"], gf_map["GF-SHOVEL-A"]["lng"]],
                    [base_lat - 0.0018, base_lng - 0.0012],
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]]
                ]
            },
            {
                "segment_id": "RAMP-B-INT",
                "name": "Bench 2 to Switchback Intersection Ramp",
                "from_node": "GF-SHOVEL-B",
                "to_node": "GF-RAMP-INTERSECT",
                "length_m": 480,
                "grade_pct": 7.0,
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "LOW",
                "uphill_priority": True,
                "path_coords": [
                    [gf_map["GF-SHOVEL-B"]["lat"], gf_map["GF-SHOVEL-B"]["lng"]],
                    [base_lat - 0.0008, base_lng + 0.0015],
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]]
                ]
            },
            {
                "segment_id": "SURFACE-INT-CRUSHER",
                "name": "Intersection to Primary ROM Crusher Haul Road",
                "from_node": "GF-RAMP-INTERSECT",
                "to_node": "GF-CRUSHER-1",
                "length_m": 850,
                "grade_pct": 2.5,
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "OPTIMAL",
                "uphill_priority": False,
                "path_coords": [
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]],
                    [base_lat + 0.0020, base_lng - 0.0010],
                    [gf_map["GF-CRUSHER-1"]["lat"], gf_map["GF-CRUSHER-1"]["lng"]]
                ]
            },
            {
                "segment_id": "SURFACE-INT-WASTE",
                "name": "Intersection to North Waste Dump Haul Road",
                "from_node": "GF-RAMP-INTERSECT",
                "to_node": "GF-WASTE-DUMP",
                "length_m": 920,
                "grade_pct": 4.0,
                "traffic_type": "BIDIRECTIONAL",
                "congestion_level": "LOW",
                "uphill_priority": False,
                "path_coords": [
                    [gf_map["GF-RAMP-INTERSECT"]["lat"], gf_map["GF-RAMP-INTERSECT"]["lng"]],
                    [base_lat + 0.0025, base_lng + 0.0020],
                    [gf_map["GF-WASTE-DUMP"]["lat"], gf_map["GF-WASTE-DUMP"]["lng"]]
                ]
            }
        ]
        return segments

    def _update_fleet_positions(self, state: Dict[str, Any]):
        """
        Advances truck progress along their respective routes dynamically.
        """
        gf_map = {g["id"]: g for g in state["geofences"]}
        
        for truck in state["trucks"]:
            # Advance progress
            progress_step = 0.04
            status = truck["status"]

            if status in ["LOADED_HAUL", "EMPTY_RETURN"]:
                truck["progress"] = (truck["progress"] + progress_step) % 1.0
                # Determine lat/lng from progress
                start_node = gf_map["GF-SHOVEL-A"] if "A_" in truck["route"] else (gf_map["GF-SHOVEL-B"] if "B_" in truck["route"] else gf_map["GF-CRUSHER-1"])
                end_node = gf_map["GF-CRUSHER-1"] if "CRUSHER" in truck["route"] and "LOADED" in status else (gf_map["GF-WASTE-DUMP"] if "WASTE" in truck["route"] and "LOADED" in status else (gf_map["GF-SHOVEL-A"] if "TO_A" in truck["route"] else gf_map["GF-SHOVEL-B"]))

                if "RETURN" in status:
                    start_node, end_node = end_node, start_node

                p = truck["progress"]
                truck["lat"] = start_node["lat"] + (end_node["lat"] - start_node["lat"]) * p + (math.sin(p * math.pi * 2) * 0.0003)
                truck["lng"] = start_node["lng"] + (end_node["lng"] - start_node["lng"]) * p + (math.cos(p * math.pi * 2) * 0.0003)
                
                # Check for intersection right of way near Node-3
                dist_to_int = math.sqrt((truck["lat"] - state["base_lat"])**2 + (truck["lng"] - state["base_lng"])**2)
                if dist_to_int < 0.0008:
                    if status == "EMPTY_RETURN":
                        # Empty downhill gives way to loaded uphill
                        truck["speed_kmh"] = 14.0
                    else:
                        truck["speed_kmh"] = 28.0
                else:
                    truck["speed_kmh"] = 32.0 if status == "EMPTY_RETURN" else 25.0

            elif status == "LOADING":
                truck["lat"] = gf_map["GF-SHOVEL-A"]["lat"]
                truck["lng"] = gf_map["GF-SHOVEL-A"]["lng"]
                truck["speed_kmh"] = 0.0
            elif status == "DUMPING":
                truck["lat"] = gf_map["GF-CRUSHER-1"]["lat"]
                truck["lng"] = gf_map["GF-CRUSHER-1"]["lng"]
                truck["speed_kmh"] = 0.0
            elif status == "QUEUED_SHOVEL":
                truck["lat"] = gf_map["GF-SHOVEL-A"]["lat"] + 0.0006
                truck["lng"] = gf_map["GF-SHOVEL-A"]["lng"] + 0.0004
                truck["speed_kmh"] = 0.0

    def calculate_match_factor(self, mine_id: str) -> Dict[str, Any]:
        """
        Calculates Phelps-Morgan Shovel-Truck Match Factor:
        MF = (Num_Trucks * Shovel_Load_Time) / (Num_Shovels * Truck_Cycle_Time)
        
        MF = 1.0 -> 100% Perfectly balanced haulage system
        MF < 1.0 -> Under-trucked (Shovels waiting/idle, loss of loading productivity)
        MF > 1.0 -> Over-trucked (Trucks bunching in shovel queues, wasting fuel & TKPH)
        """
        state = self.get_or_create_mine_fleet(mine_id)
        trucks = state["trucks"]
        shovels = state["shovels"]

        num_trucks = len([t for t in trucks if t["status"] != "MAINTENANCE"])
        num_shovels = len([s for s in shovels if s["status"] == "OPERATIONAL"])

        avg_load_time_min = sum(s["avg_load_time_min"] for s in shovels) / max(num_shovels, 1)
        avg_cycle_time_min = 14.5 # Standard MOIL bench-to-crusher cycle

        if num_shovels > 0 and avg_cycle_time_min > 0:
            match_factor = round((num_trucks * avg_load_time_min) / (num_shovels * avg_cycle_time_min), 3)
        else:
            match_factor = 1.0

        if match_factor > 1.15:
            dispatch_status = "OVER_TRUCKED"
            recommendation = f"Excess trucks ({num_trucks} active). Shovel bunching detected. Reroute 1-2 haul trucks to Waste Dump or Standby to save fuel."
        elif match_factor < 0.85:
            dispatch_status = "UNDER_TRUCKED"
            recommendation = f"Shovels are starving ({num_shovels} active vs {num_trucks} trucks). Deploy 2 auxiliary haulers from reserve fleet."
        else:
            dispatch_status = "OPTIMAL_DISPATCH"
            recommendation = "Haulage loop is harmonized. Shovel-truck cycle ratio within ±5% of peak efficiency."

        return {
            "mine_id": mine_id,
            "match_factor": match_factor,
            "status": dispatch_status,
            "active_trucks": num_trucks,
            "active_shovels": num_shovels,
            "avg_shovel_load_time_min": avg_load_time_min,
            "avg_truck_cycle_time_min": avg_cycle_time_min,
            "shovel_utilization_pct": min(100.0, round(match_factor * 92.0, 1)),
            "truck_utilization_pct": min(100.0, round((1.0 / max(match_factor, 0.5)) * 90.0, 1)),
            "recommendation": recommendation
        }

    def reroute_truck(self, mine_id: str, truck_id: str, target_destination: str) -> Dict[str, Any]:
        """
        Triggers a dynamic geofenced reroute signal for an individual truck.
        """
        state = self.get_or_create_mine_fleet(mine_id)
        for truck in state["trucks"]:
            if truck["id"] == truck_id:
                old_dest = truck["target_geofence"]
                truck["target_geofence"] = target_destination
                if "CRUSHER" in target_destination:
                    truck["route"] = "A_TO_CRUSHER"
                elif "WASTE" in target_destination:
                    truck["route"] = "A_TO_WASTE"
                elif "SHOVEL-B" in target_destination:
                    truck["route"] = "CRUSHER_TO_B"
                    truck["target_shovel"] = "EX-02"
                else:
                    truck["route"] = "CRUSHER_TO_A"
                    truck["target_shovel"] = "EX-01"

                return {
                    "success": True,
                    "truck_id": truck_id,
                    "previous_destination": old_dest,
                    "new_destination": target_destination,
                    "timestamp": time.time(),
                    "message": f"Truck {truck_id} geofence re-assigned to {target_destination} via dynamic in-pit dispatch."
                }

        return {"success": False, "message": f"Truck {truck_id} not found."}
