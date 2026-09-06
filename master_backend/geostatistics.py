"""
MOIL AI: 3D Block Modeling & Geostatistical Ordinary Kriging Engine
-------------------------------------------------------------------
Author: Senior Backend Engineer & Geostatistician
Module: Ordinary Kriging 3D Reserve Estimation for Dongri Buzurg Mine

Features:
1. Synthetic Drill Hole Composites Generator for MOIL Dongri Buzurg
2. 3D Regular Block Discretization (Bounding Box Grid)
3. 3D Ordinary Kriging Interpolation (PyKrige Vectorized Engine)
4. Cut-Off Grade Filtering and Specific Gravity Tonnage Modeling
"""

import math
import numpy as np
import pandas as pd
from typing import Tuple, Dict, Any, List
from pykrige.ok3d import OrdinaryKriging3D


def generate_dongri_drillholes(random_seed: int = 42) -> pd.DataFrame:
    """
    Generates realistic 3D drill hole composites for MOIL's Dongri Buzurg manganese mine.
    The tabular manganese ore body strikes ~N70°E and dips ~65° SSE within the Sausar Group.
    
    Returns:
        pd.DataFrame with columns: ['hole_id', 'x', 'y', 'z', 'grade_mn', 'lithology']
    """
    np.random.seed(random_seed)
    
    # 12 Boreholes positioned along 4 parallel section lines across strike
    section_xs = [120.0, 160.0, 200.0, 240.0]
    section_ys = [220.0, 260.0, 300.0]
    
    records = []
    hole_counter = 1
    
    for sx in section_xs:
        for sy in section_ys:
            hole_id = f"DH-DB-{hole_counter:03d}"
            hole_counter += 1
            
            # Collar coordinates with slight survey variance
            collar_x = sx + np.random.uniform(-4.0, 4.0)
            collar_y = sy + np.random.uniform(-4.0, 4.0)
            collar_z = 320.0 + np.random.uniform(-2.0, 3.0) # Surface elevation RL (m)
            
            # Drill down to 230m RL (depth of 90m) with 3m composite intervals
            depths = np.arange(0.0, 90.0, 3.0, dtype=np.float64)
            
            # Slight borehole trajectory deviation (inclined at 80° toward NNW)
            for d in depths:
                curr_x = collar_x + d * 0.05
                curr_y = collar_y - d * 0.12 # Drift down-dip
                curr_z = collar_z - d
                
                # Geological Ore Body Geometry Model:
                # Tabular ore band centered at plane: 0.35*(x - 180) + 0.85*(y - 260) + 0.40*(z - 280) = 0
                plane_dist = abs(0.35 * (curr_x - 180.0) + 0.85 * (curr_y - 260.0) + 0.40 * (curr_z - 280.0))
                
                # Core Manganese Braunite/Pyrolusite Lode has thickness ~18m
                if plane_dist <= 9.0:
                    # High Grade Ore Zone (38% to 51% Mn)
                    base_grade = 45.0 * math.exp(-0.5 * (plane_dist / 5.5) ** 2)
                    noise = np.random.normal(0, 2.5)
                    grade = float(np.clip(base_grade + noise, 34.0, 52.5))
                    lithology = "High-Grade Braunite-Dioxide Ore"
                elif plane_dist <= 18.0:
                    # Low-Grade / Mineralized Halo (16% to 32% Mn)
                    base_grade = 24.0 * math.exp(-0.5 * ((plane_dist - 9.0) / 6.0) ** 2)
                    noise = np.random.normal(0, 3.0)
                    grade = float(np.clip(base_grade + noise, 14.0, 33.0))
                    lithology = "Manganiferous Quartz-Phyllite"
                else:
                    # Country Wall Rock (1% to 8% Mn)
                    grade = float(np.clip(np.random.normal(3.8, 1.8), 0.5, 9.5))
                    lithology = "Mica-Schist Country Rock"
                
                records.append({
                    "hole_id": hole_id,
                    "x": round(float(curr_x), 2),
                    "y": round(float(curr_y), 2),
                    "z": round(float(curr_z), 2),
                    "grade_mn": round(grade, 2),
                    "lithology": lithology
                })
                
    df = pd.DataFrame(records)
    return df


def create_3d_grid(df: pd.DataFrame, block_size: int = 10) -> Tuple[np.ndarray, np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Defines a 3D bounding box around the drill hole data and discretizes the space
    into a regular 3D grid with the given block size (e.g. 5m or 10m).
    
    IMPORTANT: Arrays are explicitly typed as np.float64 to ensure PyKrige / NumPy 2.x compatibility.
    """
    pad = block_size * 1.5
    min_x = np.floor((df["x"].min() - pad) / block_size) * block_size
    max_x = np.ceil((df["x"].max() + pad) / block_size) * block_size
    
    min_y = np.floor((df["y"].min() - pad) / block_size) * block_size
    max_y = np.ceil((df["y"].max() + pad) / block_size) * block_size
    
    min_z = np.floor((df["z"].min() - pad) / block_size) * block_size
    max_z = np.ceil((df["z"].max() + pad) / block_size) * block_size
    
    xpoints = np.arange(min_x, max_x + block_size, block_size, dtype=np.float64)
    ypoints = np.arange(min_y, max_y + block_size, block_size, dtype=np.float64)
    zpoints = np.arange(min_z, max_z + block_size, block_size, dtype=np.float64)
    
    bbox_info = {
        "min_x": float(min_x), "max_x": float(max_x), "nx": len(xpoints),
        "min_y": float(min_y), "max_y": float(max_y), "ny": len(ypoints),
        "min_z": float(min_z), "max_z": float(max_z), "nz": len(zpoints),
        "total_blocks": len(xpoints) * len(ypoints) * len(zpoints),
        "block_volume_m3": float(block_size ** 3)
    }
    
    return xpoints, ypoints, zpoints, bbox_info


def run_ordinary_kriging_3d(
    df: pd.DataFrame, 
    xpoints: np.ndarray, 
    ypoints: np.ndarray, 
    zpoints: np.ndarray, 
    variogram_model: str = "spherical"
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Executes 3D Ordinary Kriging interpolation on the 3D grid.
    
    Args:
        df: DataFrame containing drill hole composites (x, y, z, grade_mn)
        xpoints, ypoints, zpoints: 1D grid arrays (np.float64)
        variogram_model: Standard variogram model ('spherical', 'linear', 'exponential', 'gaussian')
        
    Returns:
        k3d: 3D numpy array of estimated grades (shape: nz, ny, nx)
        ss3d: 3D numpy array of kriging variance
        variogram_info: Dictionary containing fitted parameters
    """
    # Subsample drillhole composites if large to optimize speed
    data_x = df["x"].to_numpy(dtype=np.float64)
    data_y = df["y"].to_numpy(dtype=np.float64)
    data_z = df["z"].to_numpy(dtype=np.float64)
    data_val = df["grade_mn"].to_numpy(dtype=np.float64)
    
    # Initialize 3D Ordinary Kriging with PyKrige
    ok3d = OrdinaryKriging3D(
        data_x,
        data_y,
        data_z,
        data_val,
        variogram_model=variogram_model,
        verbose=False,
        enable_plotting=False
    )
    
    # Execute kriging using vectorized backend for high performance
    k3d, ss3d = ok3d.execute("grid", xpoints, ypoints, zpoints, backend="vectorized")
    
    # Convert MaskedArray to standard numpy float array
    if hasattr(k3d, "filled"):
        k3d = k3d.filled(fill_value=0.0)
    if hasattr(ss3d, "filled"):
        ss3d = ss3d.filled(fill_value=0.0)
        
    # Clip physically impossible negative grades from kriging edge-effects
    k3d = np.clip(k3d, 0.5, 55.0)
    
    variogram_info = {
        "model": variogram_model,
        "nugget": float(ok3d.variogram_model_parameters[0]) if hasattr(ok3d, "variogram_model_parameters") and len(ok3d.variogram_model_parameters) > 0 else 0.0,
        "sill": float(ok3d.variogram_model_parameters[1]) if hasattr(ok3d, "variogram_model_parameters") and len(ok3d.variogram_model_parameters) > 1 else 0.0,
        "range_m": float(ok3d.variogram_model_parameters[2]) if hasattr(ok3d, "variogram_model_parameters") and len(ok3d.variogram_model_parameters) > 2 else 0.0
    }
    
    return k3d, ss3d, variogram_info


def calculate_reserves(
    k3d_grades: np.ndarray,
    block_size: int,
    specific_gravity: float = 3.8,
    cut_off_grade: float = 25.0
) -> Dict[str, Any]:
    """
    Calculates mining reserve metrics:
    - Block Mass: Tonnage = Volume (m³) × Specific Gravity (t/m³)
      For Manganese ore, SG is typically 3.6 to 4.2 (default 3.8 for pyrolusite/braunite mixtures).
    - Cut-off Grade Logic:
      Blocks with Grade >= cut_off_grade are designated as "Ore".
      Blocks with Grade < cut_off_grade are designated as "Waste".
    """
    block_volume_m3 = float(block_size ** 3)
    block_tonnage = block_volume_m3 * specific_gravity
    
    # Flatten 3D grid into 1D array of estimated grades
    all_grades = k3d_grades.flatten()
    total_blocks = len(all_grades)
    
    # Apply cut-off grade condition
    ore_mask = all_grades >= cut_off_grade
    waste_mask = ~ore_mask
    
    ore_blocks_count = int(np.sum(ore_mask))
    waste_blocks_count = int(np.sum(waste_mask))
    
    if ore_blocks_count > 0:
        ore_grades = all_grades[ore_mask]
        average_grade = float(np.mean(ore_grades))
        total_ore_tonnage = float(ore_blocks_count * block_tonnage)
        metal_content_tonnes = float(total_ore_tonnage * (average_grade / 100.0))
    else:
        average_grade = 0.0
        total_ore_tonnage = 0.0
        metal_content_tonnes = 0.0
        
    waste_tonnage = float(waste_blocks_count * block_tonnage)
    stripping_ratio = round(waste_tonnage / total_ore_tonnage, 2) if total_ore_tonnage > 0 else 0.0
    
    # Grade-Tonnage Sensitivity Curve across multiple cut-offs (15% to 40% Mn)
    grade_tonnage_curve = []
    for co in [15.0, 20.0, 25.0, 30.0, 35.0, 40.0]:
        co_mask = all_grades >= co
        cnt = int(np.sum(co_mask))
        t = float(cnt * block_tonnage)
        avg_g = float(np.mean(all_grades[co_mask])) if cnt > 0 else 0.0
        grade_tonnage_curve.append({
            "cut_off_grade": co,
            "tonnage_mt": round(t / 1_000_000.0, 3),
            "average_grade": round(avg_g, 2)
        })
    
    return {
        "total_blocks_evaluated": total_blocks,
        "ore_blocks_count": ore_blocks_count,
        "waste_blocks_count": waste_blocks_count,
        "block_volume_m3": block_volume_m3,
        "block_tonnage_t": round(block_tonnage, 1),
        "total_tonnage": round(total_ore_tonnage, 2),
        "total_tonnage_mt": round(total_ore_tonnage / 1_000_000.0, 3), # In Million Tonnes
        "average_grade": round(average_grade, 2),
        "waste_tonnage": round(waste_tonnage, 2),
        "waste_tonnage_mt": round(waste_tonnage / 1_000_000.0, 3),
        "stripping_ratio": stripping_ratio,
        "metal_content_tonnes": round(metal_content_tonnes, 2),
        "grade_tonnage_curve": grade_tonnage_curve
    }
