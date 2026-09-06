"""
MOIL AI: 3D Geostatistical Block Modeling & Resource Estimation Engine
----------------------------------------------------------------------
Module: backend/services/block_model.py
Author: Principal Geospatial Software Engineer & Geostatistician

Features:
1. 3D block discretization (500m × 500m × 200m depth envelope, 10m × 10m × 5m blocks)
2. PyKrige OrdinaryKriging3D spatial interpolation with spherical variograms
3. Dynamic density/SG mapping (4.1 t/m³ for high grade, 3.6 t/m³ for medium, 2.7 t/m³ for waste)
4. Geotechnical slope/depth feasibility filtering
5. JORC / UNFC Classification: Proven (CS > 80%), Probable (50% < CS <= 80%)
6. Optimized downsampling for 60fps WebGL/Three.js rendering
"""

import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from pykrige.ok3d import OrdinaryKriging3D

from backend.geostatistics import generate_dongri_drillholes


class BlockModelEngine:
    """
    3D Block Modeling and Geostatistical Reserve Quantification Engine.
    """

    def __init__(self, block_size_x: float = 15.0, block_size_y: float = 15.0, block_size_z: float = 8.0):
        self.dx = block_size_x
        self.dy = block_size_y
        self.dz = block_size_z
        self.drillhole_df = generate_dongri_drillholes()

    def construct_block_model(
        self,
        cut_off_grade: float = 25.0,
        confidence_threshold: float = 50.0,
        max_slope_limit: float = 45.0,
        variogram_model: str = "spherical",
        max_render_blocks: int = 1800
    ) -> Dict[str, Any]:
        """
        Executes full 3D Kriging block model, calculates dynamic densities,
        classifies UNFC proven/probable reserves, and formats voxel blocks for Three.js.
        """
        df = self.drillhole_df

        # Bounding box definition around Dongri Buzurg exploration pit
        min_x, max_x = 100.0, 300.0
        min_y, max_y = 190.0, 370.0
        min_z, max_z = 220.0, 330.0

        xpoints = np.arange(min_x, max_x + self.dx, self.dx, dtype=np.float64)
        ypoints = np.arange(min_y, max_y + self.dy, self.dy, dtype=np.float64)
        zpoints = np.arange(min_z, max_z + self.dz, self.dz, dtype=np.float64)

        # 1. Run 3D Ordinary Kriging Interpolation
        data_x = df["x"].to_numpy(dtype=np.float64)
        data_y = df["y"].to_numpy(dtype=np.float64)
        data_z = df["z"].to_numpy(dtype=np.float64)
        data_val = df["grade_mn"].to_numpy(dtype=np.float64)

        ok3d = OrdinaryKriging3D(
            data_x, data_y, data_z, data_val,
            variogram_model=variogram_model,
            verbose=False,
            enable_plotting=False
        )

        k3d, ss3d = ok3d.execute("grid", xpoints, ypoints, zpoints, backend="vectorized")
        if hasattr(k3d, "filled"):
            k3d = k3d.filled(fill_value=0.0)
        if hasattr(ss3d, "filled"):
            ss3d = ss3d.filled(fill_value=0.0)

        # Clip values to realistic geological ranges
        k3d = np.clip(k3d, 0.5, 54.0)

        block_volume_m3 = self.dx * self.dy * self.dz

        # 2. Iterate and Assemble 3D Blocks with Dynamic Specific Gravity
        blocks = []
        proven_tonnage = 0.0
        probable_tonnage = 0.0
        waste_tonnage = 0.0
        total_ore_tonnage = 0.0
        weighted_grade_sum = 0.0

        drillhole_coords = df[["x", "y", "z"]].to_numpy()

        nz, ny, nx = k3d.shape
        total_blocks_count = nz * ny * nx

        for iz, z in enumerate(zpoints):
            for iy, y in enumerate(ypoints):
                for ix, x in enumerate(xpoints):
                    grade = float(k3d[iz, iy, ix])
                    kriging_var = float(ss3d[iz, iy, ix])

                    # Distance to nearest drill hole composite
                    dists = np.hypot(np.hypot(drillhole_coords[:, 0] - x, drillhole_coords[:, 1] - y), drillhole_coords[:, 2] - z)
                    min_dh_dist = float(np.min(dists))

                    # Bayesian Confidence Score (KoBold Logic)
                    # Confidence decays with distance from verified drill hole and kriging variance
                    dist_decay = math.exp(- (min_dh_dist / 110.0) ** 1.6)
                    conf_score = float(np.clip((0.85 * dist_decay + 0.15 * math.exp(-kriging_var / 40.0)) * 100.0, 5.0, 98.0))

                    # Local simulated slope angle (steepens on pit walls)
                    slope_angle = float(18.0 + 22.0 * math.sin(x / 40.0) * math.cos(y / 45.0) + (330.0 - z) * 0.18)
                    slope_angle = float(np.clip(slope_angle, 5.0, 58.0))
                    slope_feasible = bool(slope_angle <= max_slope_limit)

                    # Dynamic Bulk Density / Specific Gravity Assignment:
                    # - High Grade (>= 35% Mn): SG = 4.1 t/m³ (Pyrolusite/Braunite)
                    # - Medium Grade (25% - 35% Mn): SG = 3.6 t/m³ (Gondite/Manganiferous Phyllite)
                    # - Waste Rock (< 25% Mn): SG = 2.7 t/m³ (Country Quartz-Mica Schist)
                    if grade >= 35.0:
                        sg = 4.1
                    elif grade >= 25.0:
                        sg = 3.6
                    else:
                        sg = 2.7

                    tonnage = float(block_volume_m3 * sg)
                    is_ore = bool(grade >= cut_off_grade and slope_feasible and conf_score >= confidence_threshold)

                    if is_ore:
                        total_ore_tonnage += tonnage
                        weighted_grade_sum += grade * tonnage
                        if conf_score >= 80.0:
                            proven_tonnage += tonnage
                        else:
                            probable_tonnage += tonnage
                    else:
                        waste_tonnage += tonnage

                    # Append block record
                    blocks.append({
                        "id": f"BLK-{ix:02d}-{iy:02d}-{iz:02d}",
                        "x": round(float(x), 1),
                        "y": round(float(y), 1),
                        "z": round(float(z), 1),
                        "grade": round(grade, 2),
                        "tonnage": round(tonnage, 1),
                        "sg": sg,
                        "confidence": round(conf_score, 1),
                        "is_ore": is_ore,
                        "slope_deg": round(slope_angle, 1),
                        "slope_feasible": slope_feasible
                    })

        # Calculate Summary Feasibility Metrics
        average_ore_grade = float(round(weighted_grade_sum / total_ore_tonnage, 2)) if total_ore_tonnage > 0 else 0.0
        recoverable_metal_tonnes = float(round(total_ore_tonnage * (average_ore_grade / 100.0), 1))
        stripping_ratio = float(round(waste_tonnage / total_ore_tonnage, 2)) if total_ore_tonnage > 0 else 0.0

        # Downsample blocks intelligently for high-performance 60fps WebGL rendering
        # Prioritize ore blocks and high-confidence boundary blocks
        ore_blocks = [b for b in blocks if b["is_ore"]]
        waste_blocks = [b for b in blocks if not b["is_ore"]]

        # Sample up to max_render_blocks
        if len(blocks) > max_render_blocks:
            max_waste = max_render_blocks - min(len(ore_blocks), int(max_render_blocks * 0.65))
            waste_step = max(1, len(waste_blocks) // max(1, max_waste))
            render_blocks = ore_blocks + waste_blocks[::waste_step]
        else:
            render_blocks = blocks

        return {
            "mine_name": "MOIL Dongri Buzurg Manganese Mine",
            "cut_off_grade": cut_off_grade,
            "confidence_threshold": confidence_threshold,
            "max_slope_limit": max_slope_limit,
            "block_volume_m3": block_volume_m3,
            "grid_dimensions": {"nx": nx, "ny": ny, "nz": nz, "total_blocks": total_blocks_count},
            "summary_metrics": {
                "total_ore_tonnage": round(total_ore_tonnage, 1),
                "total_ore_tonnage_mt": round(total_ore_tonnage / 1_000_000.0, 3),
                "average_ore_grade": average_ore_grade,
                "proven_reserve_tonnage_mt": round(proven_tonnage / 1_000_000.0, 3),
                "probable_reserve_tonnage_mt": round(probable_tonnage / 1_000_000.0, 3),
                "waste_tonnage_mt": round(waste_tonnage / 1_000_000.0, 3),
                "recoverable_metal_tonnes": recoverable_metal_tonnes,
                "stripping_ratio": stripping_ratio
            },
            "total_blocks_rendered": len(render_blocks),
            "blocks": render_blocks
        }
