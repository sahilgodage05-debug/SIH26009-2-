import math
import json
import os

def haversine(coord1, coord2):
    # Radius of earth in kilometers
    R = 6371.0
    lat1, lon1 = math.radians(coord1[0]), math.radians(coord1[1])
    lat2, lon2 = math.radians(coord2[0]), math.radians(coord2[1])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def load_mines_data():
    mines_file = os.path.join(os.path.dirname(__file__), 'data', 'moil_mines.json')
    if os.path.exists(mines_file):
        with open(mines_file, 'r') as f:
            return json.load(f)
    return []

# Build a fast lookup for mine coordinates
MINES_DB = {mine['name']: (mine['latitude'], mine['longitude']) for mine in load_mines_data()}

def get_distance_km(mine1_name, mine2_name):
    """Calculate real-world distance between two mines using GPS coordinates."""
    coords_1 = MINES_DB.get(mine1_name)
    coords_2 = MINES_DB.get(mine2_name)
    
    if not coords_1 or not coords_2:
        return 9999.0 # Unknown distance fallback
        
    return round(haversine(coords_1, coords_2), 1)

def optimize_equipment_redeployment(failed_machine_type, failed_machine_mine, all_idle_machines):
    """
    Finds the best idle machine to replace the failed one.
    Criteria: Same equipment type, closest geographical distance.
    (In a more advanced setup, Google OR-Tools is used here for fleet-wide VRP scheduling).
    """
    candidates = []
    
    for machine in all_idle_machines:
        # Match type and ensure it's idle
        if machine.type == failed_machine_type and machine.status == 'Idle':
            dist = get_distance_km(failed_machine_mine, machine.mine_location)
            candidates.append({
                "machine_id": machine.machine_id,
                "current_mine": machine.mine_location,
                "distance_km": dist,
                "capacity": machine.capacity
            })
            
    if not candidates:
        return {"status": "FAILED", "message": "No idle machines of this type available across all mines."}
        
    # Sort by closest distance
    candidates.sort(key=lambda x: x['distance_km'])
    
    best_candidate = candidates[0]
    
    return {
        "status": "SUCCESS",
        "action": "Re-deploy Equipment",
        "recommendation": f"Deploy {best_candidate['machine_id']} from {best_candidate['current_mine']} to {failed_machine_mine}.",
        "travel_distance_km": best_candidate['distance_km'],
        "alternative_candidates": candidates[1:3] # Top 2 backups
    }
