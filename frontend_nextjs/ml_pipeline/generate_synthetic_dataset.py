"""
MOIL AI: Geo-Spatial Reserve Explorer
Synthetic Ground Truth & Multi-Spectral Satellite Data Generator
-----------------------------------------------------------------
Fuses GPS coordinates across the Central India Manganese Belt with:
- Google Earth Engine (GEE) multi-spectral proxies:
    * Sentinel-2 L2A Vegetation Index (NDVI) [Detects metal toxicity chlorosis]
    * Sentinel-1 SAR C-band Soil Moisture (dielectric backscatter)
    * Landsat-9 / MODIS Land Surface Temperature (LST) [Thermal inertia]
    * CHIRPS Daily Precipitation (Rainfall mm)
- National Geoscience Data Repository (NGDR / GSI) geological indicators:
    * Bouguer Gravity Anomaly (mGal) [Dense braunite / pyrolusite]
    * SWIR Band Alteration Ratio (Fe/Mn Oxide Index)
    * Structural Strike/Dip Kinematics
- Ground Truth Target:
    * manganese_present (1 for known deposits & mineralized strike corridors, 0 for barren country rock)
"""

import os
import math
import random
import json
import pandas as pd
import numpy as np

# Set random seed for reproducibility
np.random.seed(42)
random.seed(42)

# MOIL Known Mines & Major Manganese Outcrops (Ground Truth Centers)
MOIL_KNOWN_MINES = [
    {"name": "Balaghat Mine (Largest underground Mn mine)", "lat": 21.8025, "lng": 80.1873, "strike_angle_deg": 70, "strike_length_km": 12.0},
    {"name": "Dongri Buzurg Mine", "lat": 21.5540, "lng": 79.6974, "strike_angle_deg": 65, "strike_length_km": 8.5},
    {"name": "Gumgaon Mine", "lat": 21.3912, "lng": 79.0028, "strike_angle_deg": 80, "strike_length_km": 6.0},
    {"name": "Chikla Mine", "lat": 21.5645, "lng": 79.7420, "strike_angle_deg": 72, "strike_length_km": 7.0},
    {"name": "Tirodi Mine", "lat": 21.6885, "lng": 79.7150, "strike_angle_deg": 68, "strike_length_km": 9.0},
    {"name": "Mansar Mine", "lat": 21.3980, "lng": 79.2730, "strike_angle_deg": 75, "strike_length_km": 5.5},
    {"name": "Ukwa Mine", "lat": 21.9680, "lng": 80.4680, "strike_angle_deg": 60, "strike_length_km": 8.0},
    {"name": "Sitasaongi Mine", "lat": 21.5830, "lng": 79.7610, "strike_angle_deg": 70, "strike_length_km": 6.5},
    {"name": "Kandri Mine", "lat": 21.4170, "lng": 79.2670, "strike_angle_deg": 75, "strike_length_km": 5.0}
]

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0 # Earth radius in km
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def distance_to_strike_envelope(lat, lng, mine):
    """
    Computes anisotropic distance along the geological strike corridor (Sausar Group fold trends).
    Manganese beds extend along regional strike (N60°E - N80°E) much further than transverse across strike.
    """
    center_lat, center_lng = mine["lat"], mine["lng"]
    strike_rad = math.radians(mine["strike_angle_deg"])
    
    # Approx local cartesian offsets in km
    dx = (lng - center_lng) * 111.32 * math.cos(math.radians(center_lat))
    dy = (lat - center_lat) * 110.57
    
    # Rotate coordinates into along-strike (u) and across-strike (v)
    u = dx * math.cos(strike_rad) + dy * math.sin(strike_rad)
    v = -dx * math.sin(strike_rad) + dy * math.cos(strike_rad)
    
    # Elliptical distance with high aspect ratio (along strike / across strike)
    a = mine["strike_length_km"] / 2.0 # semi-major axis along strike
    b = 1.2 # semi-minor axis across strike (1.2 km width)
    
    norm_dist = (u / a)**2 + (v / b)**2
    return norm_dist, math.sqrt(dx**2 + dy**2)

def generate_dataset(num_samples=3000):
    records = []
    
    # Bounding Box: Central India Manganese Belt
    min_lat, max_lat = 21.15, 22.15
    min_lng, max_lng = 78.85, 80.65

    # 1. First sample densely around known MOIL mine corridors (positive bias for balanced training)
    positive_quota = int(num_samples * 0.42)
    negative_quota = num_samples - positive_quota

    # Generate positive & near-deposit candidates
    for _ in range(positive_quota):
        mine = random.choice(MOIL_KNOWN_MINES)
        # Random offset along strike
        strike_rad = math.radians(mine["strike_angle_deg"])
        u = random.gauss(0, mine["strike_length_km"] * 0.35)
        v = random.gauss(0, 0.9) # close across-strike
        
        dx = u * math.cos(strike_rad) - v * math.sin(strike_rad)
        dy = u * math.sin(strike_rad) + v * math.cos(strike_rad)
        
        lat = mine["lat"] + (dy / 110.57)
        lng = mine["lng"] + (dx / (111.32 * math.cos(math.radians(mine["lat"]))))
        
        records.append((lat, lng, mine["name"]))

    # Generate negative candidates across regional forest, agricultural, and barren zones
    for _ in range(negative_quota):
        lat = random.uniform(min_lat, max_lat)
        lng = random.uniform(min_lng, max_lng)
        records.append((lat, lng, "Regional Country Rock / Greenstone"))

    data = []
    
    for idx, (lat, lng, nearest_site) in enumerate(records):
        # Calculate min distance to any known mine
        min_norm_dist = 999.0
        min_km = 999.0
        closest_mine = None
        
        for mine in MOIL_KNOWN_MINES:
            norm_dist, km = distance_to_strike_envelope(lat, lng, mine)
            if norm_dist < min_norm_dist:
                min_norm_dist = norm_dist
                min_km = km
                closest_mine = mine["name"]
        
        # Ground Truth Label Determination:
        # If within elliptical strike corridor (norm_dist <= 1.25) or within 1.5 km of core mine
        prob_present = math.exp(-min_norm_dist * 0.9)
        if min_km <= 1.5:
            prob_present = max(prob_present, 0.95)
        elif min_km > 18.0:
            prob_present = min(prob_present, 0.03)
            
        manganese_present = 1 if (random.random() < prob_present and min_norm_dist <= 1.5) else 0

        # Elevation (SRTM DEM proxy)
        elevation_m = round(random.gauss(340, 50) + (lat - 21.0) * 80.0, 1)

        # Space-Tech Feature 1: Sentinel-2 NDVI (Vegetation Index)
        # Heavy metal toxicity causes plant chlorosis over manganese sub-outcrops
        if manganese_present == 1:
            ndvi = round(random.gauss(0.28, 0.07), 3) # Chlorosis stress (low NDVI)
            ndvi = max(0.12, min(0.48, ndvi))
        else:
            ndvi = round(random.gauss(0.64, 0.11), 3) # Healthy deciduous forest / agriculture
            ndvi = max(0.35, min(0.88, ndvi))

        # Space-Tech Feature 2: Sentinel-1 SAR Soil Moisture (%)
        if manganese_present == 1:
            # Clay alteration and oxidized regolith often retain distinctive dielectric constant
            soil_moisture_pct = round(random.gauss(58.5, 8.5), 1)
        else:
            soil_moisture_pct = round(random.gauss(42.0, 12.0), 1)
        soil_moisture_pct = max(15.0, min(95.0, soil_moisture_pct))

        # Space-Tech Feature 3: Landsat-9 TIR Land Surface Temperature (LST in Celsius)
        # High rock thermal inertia of dense manganese ores creates cooler day / warmer night signatures
        if manganese_present == 1:
            lst_celsius = round(random.gauss(34.8, 1.8), 1)
        else:
            lst_celsius = round(random.gauss(31.2, 2.5), 1)

        # Space-Tech Feature 4: CHIRPS Rainfall (Annual Mean mm)
        rainfall_chirps_mm = round(random.gauss(1280.0, 75.0) + (lng - 79.0) * 45.0, 1)

        # Geological Feature 5: NGDR / GSI Bouguer Gravity Anomaly (mGal)
        # High-density braunite (4.8 g/cm³) produces strong positive Bouguer gravity anomaly
        if manganese_present == 1:
            bouguer_gravity_mgal = round(random.gauss(24.5, 6.2), 2)
        else:
            bouguer_gravity_mgal = round(random.gauss(-4.8, 5.5), 2)

        # Geological Feature 6: Landsat-9 SWIR Mineral Alteration Ratio (B7 / B5)
        if manganese_present == 1:
            swir_alteration_ratio = round(random.gauss(2.15, 0.32), 3)
        else:
            swir_alteration_ratio = round(random.gauss(1.18, 0.22), 3)

        # Magnetic Susceptibility (SI × 10^-3)
        if manganese_present == 1:
            magnetic_susceptibility = round(random.gauss(42.0, 11.5), 1)
        else:
            magnetic_susceptibility = round(random.gauss(12.0, 6.0), 1)

        data.append({
            "sample_id": f"MOIL-SAMP-{idx+1:05d}",
            "latitude": round(lat, 5),
            "longitude": round(lng, 5),
            "nearest_moil_mine": closest_mine,
            "distance_to_mine_km": round(min_km, 2),
            "elevation_m": elevation_m,
            "ndvi_sentinel2": ndvi,
            "soil_moisture_sar_pct": soil_moisture_pct,
            "lst_celsius_landsat9": lst_celsius,
            "rainfall_annual_chirps_mm": rainfall_chirps_mm,
            "bouguer_gravity_anomaly_mgal": bouguer_gravity_mgal,
            "swir_alteration_ratio": swir_alteration_ratio,
            "magnetic_susceptibility_si": magnetic_susceptibility,
            "manganese_present": manganese_present
        })

    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    print("Generating synthetic ground truth & GEE multi-spectral dataset...")
    df = generate_dataset(3000)
    
    # Save to ml_pipeline and public/data for frontend download
    os.makedirs("ml_pipeline", exist_ok=True)
    os.makedirs("public/data", exist_ok=True)
    
    csv_pipeline_path = "ml_pipeline/moil_manganese_training_dataset.csv"
    csv_public_path = "public/data/moil_synthetic_training_dataset.csv"
    
    df.to_csv(csv_pipeline_path, index=False)
    df.to_csv(csv_public_path, index=False)
    
    print(f"[OK] Generated {len(df)} samples successfully!")
    print(f"     Class balance: {df['manganese_present'].value_counts().to_dict()}")
    print(f"     Saved to: {csv_pipeline_path} and {csv_public_path}")
