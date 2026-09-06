def calculate_mine_safety_score(mine_equipments):
    """
    Calculates the Operational Safety and Viability score of a mine
    based on the health and status of its equipment.
    Returns a score 0-100 and a recommendation text.
    """
    if not mine_equipments:
        return {"score": 0, "status": "No Data", "recommendation": "No equipment found for this mine."}
        
    total_equipments = len(mine_equipments)
    active_equipments = 0
    maintenance_equipments = 0
    total_health = 0.0
    
    for eq in mine_equipments:
        total_health += eq.health_score
        if eq.status == 'Active' or eq.status == 'Idle':
            active_equipments += 1
        elif eq.status == 'Maintenance':
            maintenance_equipments += 1
            
    # Base score is the average health of all equipment
    avg_health = total_health / total_equipments
    
    # Penalize heavily for machines in maintenance
    maintenance_penalty = (maintenance_equipments / total_equipments) * 40.0
    
    final_score = max(0.0, min(100.0, avg_health - maintenance_penalty))
    
    if final_score >= 80:
        status_text = "Highly Safe & Operational"
        rec = "Optimal conditions. Continue normal mining operations."
    elif final_score >= 50:
        status_text = "Warning: Reduced Capacity"
        rec = "Some machines are down. Re-deploy idle machines from nearby mines to maintain targets."
    else:
        status_text = "Critical Risk: Halt Recommended"
        rec = "Severe equipment shortage/failure. Unsafe to continue heavy operations. Schedule immediate maintenance."
        
    return {
        "score": round(final_score, 1),
        "status": status_text,
        "recommendation": rec,
        "total_machines": total_equipments,
        "machines_in_maintenance": maintenance_equipments
    }
