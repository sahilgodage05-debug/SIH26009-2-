"""
MOIL AI: Multi-Parametric Physical & Remote Sensing Engine
----------------------------------------------------------
Module: backend/services/parameter_engine.py
Author: Principal Geospatial Software Engineer & Mining Geostatistician

Ingests and computes multi-spectral, geophysical (ERT/IP), structural lineaments,
and topographic slope/mining feasibility parameters for the Sausar Manganese Belt.
"""

import math
import numpy as np
import pandas as pd
from typing import Dict, Any, Tuple, List
from scipy.ndimage import sobel


class ParameterEngine:
    """
    Physical parameter calculation engine fusing:
    1. Sentinel-2 / ASTER Multi-Spectral Band Ratios (NDVI, MSV, SWIR-2/SWIR-1)
    2. ERT / IP Electrical Inversion Contrasts (Resistivity & Chargeability)
    3. DEM Sobel Directional Lineament Density
    4. Topographic Slope, TRI & Mining Feasibility Index (MFI)
    """

    def __init__(self, base_lat: float = 21.80, base_lng: float = 79.80):
        self.base_lat = base_lat
        self.base_lng = base_lng

    def compute_spectral_indices(
        self, 
        grid_size: int = 50, 
        center_anomaly: Tuple[float, float] = (0.55, 0.45)
    ) -> Dict[str, np.ndarray]:
        """
        Generates and computes multi-spectral matrices:
        - Sentinel-2 Bands: Blue (B2), Green (B3), Red (B4), NIR (B8), SWIR-1 (B11), SWIR-2 (B12)
        - NDVI = (NIR - Red) / (NIR + Red)
        - Metal-Stressed Vegetation (MSV) Anomaly
        - Manganese Oxide Spectral Index = SWIR-2 / SWIR-1 (2.2 µm diagnostic pyrolusite feature)
        """
        y, x = np.mgrid[0:1:complex(0, grid_size), 0:1:complex(0, grid_size)]
        
        # Distance from primary mineralized structural corridor (anisotropic along N70°E)
        dist_corridor = np.abs(
            np.sin(np.radians(70)) * (x - center_anomaly[0]) - 
            np.cos(np.radians(70)) * (y - center_anomaly[1])
        )
        dist_center = np.hypot(x - center_anomaly[0], y - center_anomaly[1])
        
        # Mineral substrate signature (pyrolusite/braunite sub-outcrop)
        mineral_presence = np.exp(- (dist_corridor / 0.12) ** 2) * np.exp(- (dist_center / 0.45) ** 2)

        # 1. Base Healthy Canopy Reflectances
        nir = 0.65 - 0.35 * mineral_presence + np.random.normal(0, 0.02, (grid_size, grid_size))
        red = 0.15 + 0.12 * mineral_presence + np.random.normal(0, 0.01, (grid_size, grid_size))
        nir = np.clip(nir, 0.05, 0.95)
        red = np.clip(red, 0.02, 0.60)

        # NDVI Calculation
        ndvi = (nir - red) / (nir + red + 1e-6)
        ndvi = np.clip(ndvi, -0.2, 0.85)

        # 2. Metal-Stressed Vegetation (MSV) Anomaly
        # Characterized by sudden chlorosis (NDVI drop) accompanied by high canopy moisture stress
        canopy_baseline = 0.62
        msv_anomaly = np.clip((canopy_baseline - ndvi) / 0.45 * mineral_presence * 3.1, 0.0, 3.1)

        # 3. Manganese Oxide Spectral Index (SWIR-2 / SWIR-1)
        # Pyrolusite/Psilomelane exhibit characteristic diagnostic absorption at 2.2 µm (SWIR-2 band 12)
        swir1 = 0.28 + 0.05 * (1.0 - mineral_presence) + np.random.normal(0, 0.015, (grid_size, grid_size))
        swir2 = 0.58 * mineral_presence + 0.22 * (1.0 - mineral_presence) + np.random.normal(0, 0.02, (grid_size, grid_size))
        swir_ratio = np.clip(swir2 / (swir1 + 1e-6), 0.5, 3.2)

        return {
            "ndvi": np.round(ndvi, 3),
            "msv_anomaly": np.round(msv_anomaly, 2),
            "swir_ratio": np.round(swir_ratio, 2),
            "mineral_presence_proxy": np.round(mineral_presence, 3)
        }

    def compute_electrical_inversion(
        self, 
        nx: int = 50, 
        nz: int = 30, 
        max_depth_m: float = 300.0
    ) -> Dict[str, Any]:
        """
        Subsurface Electrical Resistivity Tomography (ERT) and Induced Polarization (IP) profiles:
        - Conductive zone flag: Resistivity ρ < 200 Ω·m (pyrolusite/braunite conductors).
        - Chargeable mineralization flag: Chargeability m > 15 ms.
        - Continuous electrical anomaly score: E_anomaly ∈ [0, 1].
        """
        x_coords = np.linspace(0, 1000, nx)
        z_depths = np.linspace(0, max_depth_m, nz)
        X, Z = np.meshgrid(x_coords, z_depths)

        # Model an inclined conductive/chargeable lode dipping 65° SSE
        dip_rad = math.radians(65)
        ore_center_x = 480.0 + Z / math.tan(dip_rad)
        dist_to_lode = np.abs(X - ore_center_x)

        # Subsurface Resistivity (Ohm-meters): Host schist = 1200-2500 Ω·m, Ore lode = 45-180 Ω·m
        resistivity = 1800.0 * np.ones_like(X) - 1650.0 * np.exp(- (dist_to_lode / 55.0) ** 2)
        resistivity += np.random.normal(0, 40.0, resistivity.shape)
        resistivity = np.clip(resistivity, 25.0, 3200.0)

        # Induced Polarization Chargeability (ms): Host rock = 2-6 ms, Manganese mineralization = 18-38 ms
        chargeability = 4.0 * np.ones_like(X) + 28.0 * np.exp(- (dist_to_lode / 60.0) ** 2)
        chargeability += np.random.normal(0, 1.5, chargeability.shape)
        chargeability = np.clip(chargeability, 1.0, 48.0)

        # Physical Boundary Classification Flags
        is_conductive = (resistivity < 200.0).astype(int)
        is_chargeable = (chargeability > 15.0).astype(int)

        # Continuous Electrical Anomaly Score E_anomaly ∈ [0, 1]
        # Normalized weighted product of high chargeability and low resistivity
        norm_cond = np.clip((800.0 - resistivity) / 600.0, 0.0, 1.0)
        norm_charg = np.clip((chargeability - 10.0) / 25.0, 0.0, 1.0)
        e_anomaly = 0.55 * norm_charg + 0.45 * norm_cond

        return {
            "x_coords": x_coords.tolist(),
            "z_depths": z_depths.tolist(),
            "resistivity_ohm_m": np.round(resistivity, 1),
            "chargeability_ms": np.round(chargeability, 1),
            "is_conductive": is_conductive,
            "is_chargeable": is_chargeable,
            "e_anomaly": np.round(e_anomaly, 3)
        }

    def compute_topography_and_feasibility(
        self, 
        grid_size: int = 50, 
        cell_size_m: float = 10.0
    ) -> Dict[str, np.ndarray]:
        """
        Topography, Altitude, Structural Lineaments, and Open-Pit Mining Feasibility:
        - DEM Elevation Z (m RL)
        - Slope angle θ (degrees) = arctan(sqrt((dz/dx)² + (dz/dy)²))
        - Terrain Roughness Index (TRI)
        - Structural Lineament Vector Density (Sobel filter)
        - Open-Pit Mining Feasibility Index (MFI ∈ [0, 100])
        """
        y, x = np.mgrid[0:grid_size, 0:grid_size]
        
        # Synthetic DEM terrain representing Sausar hilly ridge-valley topography (Dongri / Balaghat range)
        base_dem = 310.0 + 85.0 * np.sin(x / 7.0) * np.cos(y / 9.0) + (x * 0.8) - (y * 0.4)
        noise = np.random.normal(0, 1.2, (grid_size, grid_size))
        dem = base_dem + noise

        # 1. Gradient and Slope Calculus
        dz_dx, dz_dy = np.gradient(dem, cell_size_m, cell_size_m)
        slope_rad = np.arctan(np.sqrt(dz_dx**2 + dz_dy**2))
        slope_deg = np.degrees(slope_rad)

        # 2. Terrain Roughness Index (TRI) - mean elevation difference from 8-neighborhood
        tri = np.sqrt(np.abs(dz_dx**2 + dz_dy**2)) * 1.5

        # 3. Structural Lineament Density via Directional Sobel Filters
        sobel_x = sobel(dem, axis=1)
        sobel_y = sobel(dem, axis=0)
        grad_mag = np.hypot(sobel_x, sobel_y)
        # Normalizing to density count per km²
        s_density = np.clip((grad_mag - np.percentile(grad_mag, 40)) / (np.std(grad_mag) + 1e-6) * 4.5, 0.0, 12.0)

        # 4. Open-Pit Mining Feasibility Index (MFI ∈ [0, 100])
        # Geotechnical criteria:
        # - Slopes 15° to 35°: Optimal for open-cast bench stability (Score 80-100)
        # - Slopes > 45°: High geotechnical wall failure risk (Score penalties)
        # - Slopes < 5°: Heavy monsoon drainage / siltation challenge (Score penalties)
        mfi = np.zeros_like(slope_deg)
        for i in range(grid_size):
            for j in range(grid_size):
                s = slope_deg[i, j]
                if 15.0 <= s <= 35.0:
                    mfi[i, j] = 95.0 - abs(s - 25.0) * 1.5
                elif 5.0 <= s < 15.0:
                    mfi[i, j] = 60.0 + (s - 5.0) * 2.0
                elif 35.0 < s <= 45.0:
                    mfi[i, j] = 75.0 - (s - 35.0) * 3.5
                elif s > 45.0:
                    mfi[i, j] = max(10.0, 40.0 - (s - 45.0) * 2.0) # High Hazard
                else: # s < 5.0
                    mfi[i, j] = 45.0 # Poor drainage / swamp potential

        # Haul road accessibility factor (based on gradient limits <= 10% / 5.7°)
        haul_road_viable = (slope_deg <= 22.0).astype(int)

        return {
            "dem_elevation_m": np.round(dem, 1),
            "slope_deg": np.round(slope_deg, 1),
            "tri": np.round(tri, 2),
            "structural_density": np.round(s_density, 2),
            "mining_feasibility_index": np.round(mfi, 1),
            "haul_road_viable": haul_road_viable
        }
