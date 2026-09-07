"""
MOIL AI: Geotechnical Open-Pit Bench & Drilling/Blasting Optimization Engine
-----------------------------------------------------------------------------
Module: backend/services/blasting_engine.py
Author: Principal Mining Geotechnical & Explosives Engineer

Implements empirical blast physics & rock fragmentation models:
1. Lilly's Blastability Index (BI) for Manganese Ore & Gondite Host Rock
2. Kuz-Ram Fragmentation Model (Mean Size Xm, Uniformity Index n, P80 Passing)
3. 3D Open-Pit Bench Geometry & Staggered Blast Hole Grid Generator
4. USBM Ground Vibration (Peak Particle Velocity - PPV) & Airblast Thresholds
5. Downstream Comminution / Mechanical Crushing Financial Trade-off
"""

import math
import numpy as np
from typing import Dict, Any, List, Tuple


def explosive_weight_strength(val: float) -> float:
    return float(np.clip(val, 70.0, 140.0))


class BlastingEngine:
    """
    Geotechnical & Blasting Optimization Engine for Manganese Open Pits.
    """

    def __init__(self, default_rock_density: float = 3.65):
        self.rock_density = default_rock_density  # t/m3 (Manganese ore / gondite density)

    def calculate_lilly_blastability(
        self,
        rmr_rating: float = 65.0,
        unconfined_compressive_strength_mpa: float = 120.0,
        joint_spacing_m: float = 0.45,
        rock_density_t_m3: float = 3.65,
        dip_angle_deg: float = 65.0
    ) -> Dict[str, Any]:
        """
        Calculates Lilly's Blastability Index (BI) based on geotechnical rock parameters.
        """
        # 1. Rock Mass Description (RMD)
        if rmr_rating >= 75:
            rmd = 50.0  # Massive hard rock
        elif rmr_rating >= 50:
            rmd = 20.0  # Blocky / jointed rock
        else:
            rmd = 10.0  # Powdery / friable rock

        # 2. Joint Plane Orientation (JPO)
        # Dip relative to bench face (65 deg strike favorable = 20)
        if dip_angle_deg >= 60:
            jpo = 30.0
        elif dip_angle_deg >= 30:
            jpo = 20.0
        else:
            jpo = 10.0

        # 3. Joint Plane Spacing (JPS)
        if joint_spacing_m < 0.1:
            jps = 10.0
        elif joint_spacing_m <= 0.5:
            jps = 20.0
        else:
            jps = 50.0

        # 4. Rock Density Influence (RDI)
        rdi = 25.0 * rock_density_t_m3 - 50.0

        # 5. Hardness Factor (HF)
        # UCS & Young's Modulus factor
        hf = unconfined_compressive_strength_mpa / 3.0

        # Total Blastability Index (BI)
        bi = 0.5 * (rmd + jpo + jps + rdi + hf)
        bi = float(np.clip(bi, 20.0, 95.0))

        return {
            "blastability_index": round(bi, 1),
            "rock_mass_description": rmd,
            "joint_plane_orientation": jpo,
            "joint_plane_spacing": jps,
            "rock_density_influence": round(rdi, 1),
            "hardness_factor": round(hf, 1)
        }

    def compute_kuz_ram_fragmentation(
        self,
        hole_diameter_mm: float = 150.0,
        burden_m: float = 4.2,
        spacing_m: float = 5.0,
        bench_height_m: float = 10.0,
        sub_drilling_m: float = 1.2,
        stemming_m: float = 3.2,
        powder_factor_kg_m3: float = 0.55,
        explosive_relative_weight_strength: float = 115.0, # Bulk Emulsion = 115, ANFO = 100
        blastability_index: float = 62.5
    ) -> Dict[str, Any]:
        """
        Computes Kuz-Ram Mean Fragment Size (Xm cm), Uniformity Index (n), and P80 passing size (mm).
        """
        hole_diameter_m = hole_diameter_mm / 1000.0
        drill_length_m = bench_height_m + sub_drilling_m
        charge_length_m = max(1.0, drill_length_m - stemming_m)

        # Volume of rock broken per hole (m3)
        volume_per_hole_m3 = burden_m * spacing_m * bench_height_m
        rock_mass_tonnes = volume_per_hole_m3 * self.rock_density

        # Explosive mass per hole (kg)
        # Bulk density of emulsion = 1.15 g/cm3 (1150 kg/m3)
        hole_radius_m = hole_diameter_m / 2.0
        hole_area_m2 = math.pi * (hole_radius_m ** 2)
        explosive_volume_m3 = hole_area_m2 * charge_length_m
        explosive_mass_kg = explosive_volume_m3 * 1150.0

        # Recalculate effective Powder Factor (kg/m3)
        effective_q = explosive_mass_kg / (volume_per_hole_m3 + 1e-6)
        effective_q = float(np.clip(effective_q, 0.2, 1.5))

        # 1. Rock Factor A
        A = 0.06 * blastability_index

        # 2. Kuz-Ram Mean Fragment Size (Xm in cm)
        # Xm = A * (q)^(-0.8) * Q^(1/6) * (115 / E)^(19/30)
        xm_cm = A * (effective_q ** (-0.8)) * (explosive_mass_kg ** (1.0 / 6.0)) * ((115.0 / explosive_weight_strength(explosive_relative_weight_strength)) ** (19.0 / 30.0))
        xm_mm = xm_cm * 10.0

        # 3. Uniformity Index (n)
        # n = (2.2 - 14 * B/D_mm) * sqrt((1 + S/B)/2) * (1 - W/B) * (h/H)
        b_d_ratio = burden_m / hole_diameter_mm
        sub_drill_factor = math.sqrt((1.0 + spacing_m / burden_m) / 2.0)
        charge_h_ratio = charge_length_m / bench_height_m
        
        n_uniformity = (2.2 - 14.0 * b_d_ratio) * sub_drill_factor * (1.0 - (burden_m / (bench_height_m + 1e-6))) * charge_h_ratio
        n_uniformity = float(np.clip(abs(n_uniformity), 0.75, 1.85))

        # Characteristic Size Xc (cm)
        # Xc = Xm / (ln(2)^(1/n))
        xc_cm = xm_cm / ((math.log(2.0)) ** (1.0 / n_uniformity))
        xc_mm = xc_cm * 10.0


        # 4. P80 Passing Size (mm)
        # P(x) = 80% => 0.80 = 1 - exp(-(x/Xc)^n) => (x/Xc)^n = -ln(0.2) = 1.6094
        p80_mm = xc_mm * (1.609437 ** (1.0 / n_uniformity))

        # Generate Rosin-Rammler Curve Points (size vs % passing)
        sizes_mm = [10, 25, 50, 100, 150, 250, 350, 500, 750, 1000]
        size_distribution = []
        for s in sizes_mm:
            passing_pct = (1.0 - math.exp(-((s / (xc_mm + 1e-6)) ** n_uniformity))) * 100.0
            size_distribution.append({
                "size_mm": s,
                "passing_percent": round(float(np.clip(passing_pct, 0.0, 100.0)), 1)
            })

        # Downstream Comminution Energy Savings ($/tonne)
        # Target primary crusher feed size P80 <= 250mm
        # If P80 > 250mm, secondary hydraulic breaking / extra crushing is needed (adds $0.85/t per 50mm over)
        base_crushing_cost_per_t = 2.40  # $2.40 / tonne baseline
        if p80_mm > 250.0:
            secondary_crushing_penalty = ((p80_mm - 250.0) / 50.0) * 0.85
            comminution_cost_per_t = base_crushing_cost_per_t + secondary_crushing_penalty
            crushing_savings_per_t = -secondary_crushing_penalty
        else:
            comminution_savings = ((250.0 - p80_mm) / 50.0) * 0.45
            comminution_cost_per_t = max(1.10, base_crushing_cost_per_t - comminution_savings)
            crushing_savings_per_t = comminution_savings

        return {
            "mean_fragment_size_xm_mm": round(xm_mm, 1),
            "characteristic_size_xc_mm": round(xc_mm, 1),
            "p80_passing_size_mm": round(p80_mm, 1),
            "uniformity_index_n": round(n_uniformity, 2),
            "powder_factor_kg_m3": round(effective_q, 3),
            "explosive_mass_per_hole_kg": round(explosive_mass_kg, 1),
            "volume_per_hole_m3": round(volume_per_hole_m3, 1),
            "rock_tonnes_per_hole": round(rock_mass_tonnes, 1),
            "size_distribution_rosin_rammler": size_distribution,
            "comminution_crushing_cost_per_t": round(comminution_cost_per_t, 2),
            "net_crushing_savings_per_t": round(crushing_savings_per_t, 2)
        }

    def generate_blast_pattern_3d(
        self,
        num_rows: int = 5,
        holes_per_row: int = 10,
        burden_m: float = 4.2,
        spacing_m: float = 5.0,
        bench_height_m: float = 10.0,
        sub_drilling_m: float = 1.2,
        stemming_m: float = 3.2,
        pattern_type: str = "staggered",
        use_adaptive_density: bool = True,
        # Mine-specific geological parameters from satellite analysis
        ore_center_offset: Dict[str, float] = None,
        mn_grade_min: float = 15.0,
        mn_grade_max: float = 48.0,
        strike_deg: float = 65.0,
        dip_deg: float = 55.0,
        elevation_m: float = 310.0,
        pit_length_m: float = 45.0,
        pit_width_m: float = 28.0
    ) -> Dict[str, Any]:
        """
        Generates mine-specific 3D coordinates (X, Y, Z) for Open-Pit Bench Blast Pattern.
        
        The ore vein geometry is derived from the mine's satellite parameter profile:
        - Ore body is elongated along the geological strike direction (anisotropic)
        - Mn grade gradient follows the mine's specific grade range
        - Pit dimensions, ore center offset, and elevation are mine-specific
        - Each mine produces a genuinely different drillhole layout
        """
        holes = []
        
        # Bench physical dimensions from mine-specific pit footprint
        base_width_x = max(holes_per_row * spacing_m, pit_length_m)
        base_depth_y = max(num_rows * burden_m, pit_width_m)

        # Mine-specific ore vein center from satellite profile
        if ore_center_offset:
            center_x = ore_center_offset.get("x", base_width_x * 0.45)
            center_y = ore_center_offset.get("y", base_depth_y * 0.50)
        else:
            center_x = base_width_x * 0.45
            center_y = base_depth_y * 0.50

        # Ore vein radius scaled by mine-specific pit dimensions
        ore_vein_radius_major = max(pit_length_m, pit_width_m) * 0.42
        ore_vein_radius_minor = min(pit_length_m, pit_width_m) * 0.35

        # Strike direction controls ore body elongation axis (anisotropic distance)
        strike_rad = math.radians(strike_deg)
        # Dip angle influences asymmetric grade fall-off (steeper dip = sharper gradient on one side)
        dip_factor = math.sin(math.radians(dip_deg))

        # Mn grade range from mine satellite profile
        grade_range = mn_grade_max - mn_grade_min
        grade_base = mn_grade_min

        # Elevation-based Z offset (normalized relative to 300m baseline)
        z_elevation_offset = (elevation_m - 300.0) * 0.02

        # Generate variable-density coordinate sampling if adaptive mode is ON
        raw_grid_points = []
        if use_adaptive_density:
            y_steps = np.linspace(0, base_depth_y, num_rows + 2)
            for r_idx, y_val in enumerate(y_steps):
                stagger = (spacing_m * 0.4) if (pattern_type == "staggered" and r_idx % 2 == 1) else 0.0
                x_steps = np.linspace(stagger, base_width_x + stagger, holes_per_row + 2)
                
                for c_idx, x_val in enumerate(x_steps):
                    # Anisotropic distance along geological strike direction
                    # Rotate (dx, dy) by strike angle, then apply different radii
                    dx = x_val - center_x
                    dy = y_val - center_y
                    
                    # Rotated coordinates aligned to strike direction
                    dx_rot = dx * math.cos(strike_rad) + dy * math.sin(strike_rad)
                    dy_rot = -dx * math.sin(strike_rad) + dy * math.cos(strike_rad)
                    
                    # Anisotropic distance: elongated along strike, narrow across
                    dist_aniso = math.sqrt(
                        (dx_rot / (ore_vein_radius_major + 1e-6)) ** 2 +
                        (dy_rot / (ore_vein_radius_minor + 1e-6)) ** 2
                    )
                    
                    # Dip-induced asymmetry: grade falls off faster on footwall side
                    dip_asymmetry = 1.0 + 0.3 * dip_factor * (dy_rot / (ore_vein_radius_minor + 1e-6))
                    effective_dist = dist_aniso * max(0.5, dip_asymmetry)
                    
                    # Localized Mn Grade (%) using mine-specific grade range
                    mn_grade_pct = grade_base + grade_range * math.exp(-(effective_dist ** 2))
                    mn_grade_pct = float(np.clip(mn_grade_pct, mn_grade_min, mn_grade_max))
                    
                    ore_density_t_m3 = 2.65 + (mn_grade_pct / mn_grade_max) * 1.55
                    ore_density_t_m3 = float(np.clip(ore_density_t_m3, 2.65, 4.35))

                    density_spacing_factor = 1.35 - 0.70 * (mn_grade_pct - mn_grade_min) / (grade_range + 1e-6)
                    
                    # High grade threshold scaled to mine's grade range
                    high_grade_threshold = mn_grade_min + grade_range * 0.65
                    is_high_grade = mn_grade_pct >= high_grade_threshold
                    
                    raw_grid_points.append({
                        "row": r_idx,
                        "col": c_idx,
                        "x": x_val,
                        "y": y_val,
                        "mn_grade_pct": round(mn_grade_pct, 1),
                        "ore_density_t_m3": round(ore_density_t_m3, 2),
                        "density_spacing_factor": round(density_spacing_factor, 2),
                        "is_high_grade": is_high_grade
                    })
        else:
            avg_grade = (mn_grade_min + mn_grade_max) / 2.0
            for r in range(num_rows):
                row_offset = (spacing_m / 2.0) if (pattern_type == "staggered" and r % 2 == 1) else 0.0
                y_pos = r * burden_m
                for h in range(holes_per_row):
                    x_pos = h * spacing_m + row_offset
                    raw_grid_points.append({
                        "row": r,
                        "col": h,
                        "x": x_pos,
                        "y": y_pos,
                        "mn_grade_pct": round(avg_grade, 1),
                        "ore_density_t_m3": 3.65,
                        "density_spacing_factor": 1.0,
                        "is_high_grade": False
                    })

        # Inter-hole delay (e.g., 17 ms) and Inter-row delay (e.g., 42 ms)
        inter_hole_delay_ms = 17
        inter_row_delay_ms = 42

        # High grade threshold for zone classification (mine-specific)
        high_grade_cutoff = mn_grade_min + grade_range * 0.75
        medium_grade_cutoff = mn_grade_min + grade_range * 0.40

        total_holes = 0
        for idx, pt in enumerate(raw_grid_points):
            r = pt["row"]
            h = pt["col"]
            x_pos = pt["x"]
            y_pos = pt["y"]
            mn_grade = pt["mn_grade_pct"]
            density = pt["ore_density_t_m3"]
            
            delay_ms = (r * inter_row_delay_ms) + (h * inter_hole_delay_ms)

            zone_type = "HIGH_GRADE_ORE" if mn_grade >= high_grade_cutoff else "MEDIUM_GRADE_ORE" if mn_grade >= medium_grade_cutoff else "WASTE_OVERBURDEN"

            charge_multiplier = 1.25 if zone_type == "HIGH_GRADE_ORE" else 1.0 if zone_type == "MEDIUM_GRADE_ORE" else 0.75
            
            # Apply elevation-based Z offset so terrain height differs per mine
            z_top = bench_height_m + z_elevation_offset
            z_bottom = -sub_drilling_m + z_elevation_offset

            holes.append({
                "hole_id": f"BH-R{r+1}-H{h+1}",
                "row_index": r,
                "col_index": h,
                "x": round(x_pos, 2),
                "y": round(y_pos, 2),
                "z_top": round(z_top, 2),
                "z_bottom": round(z_bottom, 2),
                "stemming_top_z": round(z_top, 2),
                "stemming_bottom_z": round(z_top - stemming_m, 2),
                "charge_top_z": round(z_top - stemming_m, 2),
                "charge_bottom_z": round(z_bottom, 2),
                "delay_ms": delay_ms,
                "mn_grade_pct": mn_grade,
                "ore_density_t_m3": density,
                "zone_type": zone_type,
                "charge_multiplier": charge_multiplier,
                "status": "ready"
            })
            total_holes += 1

        max_x = max(h["x"] for h in holes) + spacing_m
        max_y = max(h["y"] for h in holes) + burden_m

        return {
            "num_rows": num_rows,
            "holes_per_row": holes_per_row,
            "total_blast_holes": total_holes,
            "pattern_type": "adaptive_density" if use_adaptive_density else pattern_type,
            "is_adaptive_density": use_adaptive_density,
            "ore_vein_center": {"x": round(center_x, 1), "y": round(center_y, 1)},
            "high_grade_holes_count": sum(1 for h in holes if h["zone_type"] == "HIGH_GRADE_ORE"),
            "mine_geology": {
                "strike_deg": strike_deg,
                "dip_deg": dip_deg,
                "elevation_m": elevation_m,
                "mn_grade_range": [mn_grade_min, mn_grade_max],
                "pit_footprint": {"length_m": pit_length_m, "width_m": pit_width_m}
            },
            "bench_dimensions": {
                "length_x_m": round(max_x, 1),
                "width_y_m": round(max_y, 1),
                "height_z_m": round(bench_height_m, 1),
                "sub_drilling_m": round(sub_drilling_m, 1)
            },
            "holes": holes
        }

    def calculate_ppv_vibration(
        self,
        max_charge_per_delay_kg: float = 180.0,
        distance_to_structure_m: float = 250.0,
        k_site_factor: float = 1140.0,
        beta_attenuation: float = 1.6
    ) -> Dict[str, Any]:
        """
        USBM Peak Particle Velocity (PPV mm/s) Ground Vibration model.
        PPV = K * (Distance / sqrt(Q)) ^ (-beta)
        """
        scaled_distance = distance_to_structure_m / math.sqrt(max_charge_per_delay_kg + 1e-6)
        ppv_mm_s = k_site_factor * (scaled_distance ** (-beta_attenuation))

        # DGMS India Vibration Safety Limit for Mine Structures (< 10 mm/s)
        if ppv_mm_s < 5.0:
            safety_status = "SAFE (Well within DGMS Limits <5 mm/s)"
            risk_level = "LOW"
        elif ppv_mm_s <= 10.0:
            safety_status = "MODERATE (Controlled - Within DGMS Threshold <10 mm/s)"
            risk_level = "MEDIUM"
        else:
            safety_status = "HIGH VIBRATION (Exceeds DGMS Safety Limit >10 mm/s - Reduce Charge per Delay)"
            risk_level = "HIGH"

        return {
            "peak_particle_velocity_ppv_mm_s": round(ppv_mm_s, 2),
            "scaled_distance_m_kg": round(scaled_distance, 2),
            "distance_m": distance_to_structure_m,
            "max_charge_per_delay_kg": max_charge_per_delay_kg,
            "dgms_safety_status": safety_status,
            "vibration_risk_level": risk_level
        }
