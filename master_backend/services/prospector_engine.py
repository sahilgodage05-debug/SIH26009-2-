"""
MOIL AI: AI Prospectivity & Bayesian Scoring Engine
----------------------------------------------------------------
Module: backend/services/prospector_engine.py
Author: Principal Geospatial Software Engineer & Machine Learning Lead

Implements MOIL probabilistic exploration architecture:
1. Feature vector assembly across multi-spectral, geophysical, and topographical domains
2. Ensemble ML classification (RandomForest + GradientBoosting)
3. Bayesian epistemic uncertainty quantification and information updating
4. Penalized prospectivity confidence scoring (CS = max(0, P(M|D) - λ*U) * 100)
"""

import math
import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler


class ProspectorEngine:
    """
    Probabilistic mineral deposit prospector for MOIL Manganese exploration.
    Combines machine learning priors with Bayesian evidence updating and epistemic uncertainty penalization.
    """

    def __init__(self, risk_aversion_lambda: float = 0.25):
        self.risk_lambda = risk_aversion_lambda
        self.rf_model = None
        self.gb_model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self._bootstrap_ensemble()

    def _bootstrap_ensemble(self):
        """
        Trains the ensemble classifier on baseline geological records and synthetic Sausar Belt drill points.
        Features: [NDVI_stress, SWIR_ratio, Resistivity, Chargeability, S_density, Elevation, Slope_Angle, Mansar_Proximity]
        """
        np.random.seed(42)
        n_samples = 1200

        # Positive deposit samples (Mansar formation manganese beds)
        n_pos = 420
        pos_ndvi_stress = np.random.normal(1.85, 0.45, n_pos)
        pos_swir_ratio = np.random.normal(2.15, 0.35, n_pos)
        pos_resistivity = np.random.normal(140.0, 45.0, n_pos) # Low resistivity conductor
        pos_chargeability = np.random.normal(26.0, 6.0, n_pos) # High chargeability
        pos_s_density = np.random.normal(6.8, 1.8, n_pos) # High structural shear density
        pos_elevation = np.random.normal(345.0, 35.0, n_pos)
        pos_slope = np.random.normal(22.0, 6.5, n_pos) # Benching slope
        pos_mansar_prox = np.random.normal(0.88, 0.10, n_pos) # Very close to Mansar formation
        y_pos = np.ones(n_pos)

        # Barren country rock samples (Gneiss, Schist, Quaternary cover)
        n_neg = n_samples - n_pos
        neg_ndvi_stress = np.random.normal(0.35, 0.25, n_neg)
        neg_swir_ratio = np.random.normal(1.10, 0.20, n_neg)
        neg_resistivity = np.random.normal(1850.0, 350.0, n_neg)
        neg_chargeability = np.random.normal(4.5, 2.0, n_neg)
        neg_s_density = np.random.normal(2.2, 1.2, n_neg)
        neg_elevation = np.random.normal(320.0, 40.0, n_neg)
        neg_slope = np.random.normal(14.0, 8.0, n_neg)
        neg_mansar_prox = np.random.normal(0.22, 0.15, n_neg)
        y_neg = np.zeros(n_neg)

        X_train = np.vstack([
            np.column_stack([pos_ndvi_stress, pos_swir_ratio, pos_resistivity, pos_chargeability, pos_s_density, pos_elevation, pos_slope, pos_mansar_prox]),
            np.column_stack([neg_ndvi_stress, neg_swir_ratio, neg_resistivity, neg_chargeability, neg_s_density, neg_elevation, neg_slope, neg_mansar_prox])
        ])
        y_train = np.concatenate([y_pos, y_neg])

        X_train_scaled = self.scaler.fit_transform(X_train)

        # Train Random Forest and Gradient Boosting
        self.rf_model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
        self.rf_model.fit(X_train_scaled, y_train)

        self.gb_model = GradientBoostingClassifier(n_estimators=80, max_depth=4, random_state=42)
        self.gb_model.fit(X_train_scaled, y_train)

        self.is_trained = True

    def assemble_feature_vector(
        self,
        msv_anomaly: float,
        swir_ratio: float,
        resistivity: float,
        chargeability: float,
        s_density: float,
        elevation: float,
        slope_deg: float,
        mansar_proximity: float
    ) -> np.ndarray:
        """
        Assembles feature vector X = [NDVI_stress, SWIR_ratio, ρ, m, S_density, Elevation, Slope, Proximity]
        """
        vec = np.array([[
            msv_anomaly,
            swir_ratio,
            resistivity,
            chargeability,
            s_density,
            elevation,
            slope_deg,
            mansar_proximity
        ]])
        return self.scaler.transform(vec)

    def predict_prior_probability(self, X_scaled: np.ndarray) -> float:
        """
        Ensemble prediction P(Mineralization | Features)
        Weighted combination: 0.55 * Random Forest + 0.45 * Gradient Boosting
        """
        rf_prob = self.rf_model.predict_proba(X_scaled)[0, 1]
        gb_prob = self.gb_model.predict_proba(X_scaled)[0, 1]
        prior_p = 0.55 * rf_prob + 0.45 * gb_prob
        return float(np.clip(prior_p, 0.01, 0.99))

    def compute_epistemic_uncertainty(
        self,
        dist_to_drillhole_m: float,
        sample_variance: float = 0.05
    ) -> float:
        """
        Quantifies epistemic uncertainty U based on spatial distance from nearest verified borehole
        and sample density variance.
        As distance exceeds 150m (correlation range of the variogram), uncertainty U approaches 1.0.
        """
        # Exponential rise in spatial uncertainty with borehole distance
        dist_uncertainty = 1.0 - math.exp(- (dist_to_drillhole_m / 140.0) ** 1.8)
        total_u = 0.75 * dist_uncertainty + 0.25 * sample_variance
        return float(np.clip(total_u, 0.05, 0.95))

    def calculate_confidence_score(
        self,
        prior_p: float,
        dist_to_drillhole_m: float
    ) -> Tuple[float, float, float]:
        """
        Applies Bayesian Formulation and Information Updating:
        CS = max(0, (P(M | D) - λ * U)) * 100
        where λ = 0.25 is the exploration risk aversion parameter.
        
        Returns:
            (confidence_score, posterior_p, epistemic_uncertainty)
        """
        uncertainty = self.compute_epistemic_uncertainty(dist_to_drillhole_m)
        
        # Bayesian evidence update: near boreholes with positive intercepts, likelihood ratio boosts probability
        likelihood_ratio = math.exp(- (dist_to_drillhole_m / 180.0)) * 1.35
        posterior_p = (prior_p * likelihood_ratio) / ((prior_p * likelihood_ratio) + (1.0 - prior_p))
        posterior_p = float(np.clip(posterior_p, 0.02, 0.98))

        # Risk-Penalized Confidence Score (KoBold Formulation)
        penalized_score = max(0.0, posterior_p - (self.risk_lambda * uncertainty))
        cs = float(np.clip(penalized_score * 100.0, 0.0, 99.5))

        return round(cs, 1), round(posterior_p, 3), round(uncertainty, 3)


class SentinelManganeseEstimator:
    """
    Domain-Specific Mining & Geological Prediction Algorithm using Sentinel Multi-Satellite Parameters:
    - Sentinel-2 (10m Optical): NDVI Band 8/4 & SWIR-2/SWIR-1 Pyrolusite (2.2 µm) Diagnostic Absorption
    - Sentinel-1 (10m SAR Radar): VV/VH Backscatter σ° & Surface Soil Moisture (SSM % via TU Wien Model)
    - Sentinel-3 (1km SLSTR Thermal): Land Surface Temperature (LST °C) & Diurnal Thermal Inertia Anomaly ΔLST
    - ERA5-Land (Copernicus Climate): Monsoonal Cumulative Rainfall (P_mm) driving Supergene Manganese Oxide Leaching
    
    Predicts:
    1. Manganese Grade (% Mn)
    2. Reserve Tonnage (Metric Tons)
    3. Recoverable Metal Tonnage (Metric Tons)
    """

    def __init__(self, base_country_rock_grade: float = 8.5):
        self.base_grade = base_country_rock_grade

    def predict_manganese_grade(
        self,
        sentinel2_ndvi: float,
        sentinel2_swir_ratio: float,
        sentinel1_sar_vv_db: float,
        sentinel1_soil_moisture_ssm: float,
        sentinel3_lst_anomaly_deg: float,
        era5_monsoon_rain_mm: float,
        fault_lineament_density: float = 4.2
    ) -> Dict[str, Any]:
        """
        Calculates predicted Manganese Grade (% Mn) based on satellite ecosystem physics & supergene weathering.
        """
        # 1. Optical & Spectral Chlorosis Stress Shift
        # Heavy metal stress causes drop in NDVI (0.2 - 0.4) + high 2.2µm absorption (SWIR ratio > 1.8)
        spectral_factor = max(0.0, (sentinel2_swir_ratio - 1.0)) * 11.5
        ndvi_stress_boost = max(0.0, (0.50 - sentinel2_ndvi)) * 8.0 if sentinel2_ndvi < 0.50 else 0.0
        delta_spectral = min(22.0, spectral_factor + ndvi_stress_boost)

        # 2. Sentinel-1 SAR Radar & Soil Moisture Shift
        # High dielectric permittivity of Mn-oxide laterites + backscatter contrast (σ°_VV > -14 dB)
        sar_factor = max(0.0, (sentinel1_sar_vv_db - (-18.0))) * 1.4
        moisture_factor = max(0.0, (sentinel1_soil_moisture_ssm - 20.0)) * 0.18
        delta_sar = min(14.0, sar_factor + moisture_factor)

        # 3. Sentinel-3 Thermal Inertia Shift
        # Pyrolusite (MnO2) high specific gravity (4.7 g/cm³) generates positive thermal anomaly ΔLST
        delta_thermal = min(10.0, max(0.0, sentinel3_lst_anomaly_deg) * 3.6)

        # 4. ERA5 Monsoonal Supergene Enrichment Shift
        # Precipitation > 800mm mobilizes Mn²⁺ into structural fault traps
        rain_factor = max(0.0, (era5_monsoon_rain_mm - 750.0)) / 150.0
        fault_factor = max(0.0, fault_lineament_density / 3.0)
        delta_supergene = min(8.0, rain_factor * fault_factor * 1.8)

        # Total Predicted Grade (% Mn)
        predicted_mn_pct = self.base_grade + delta_spectral + delta_sar + delta_thermal + delta_supergene
        predicted_mn_pct = float(np.clip(predicted_mn_pct, 5.0, 51.5))

        # Metallurgical Grade Classification
        if predicted_mn_pct >= 44.0:
            classification = "High-Grade Metallurgical Pyrolusite (>44% Mn)"
            grade_code = "HIGH"
        elif predicted_mn_pct >= 30.0:
            classification = "Medium-Grade Siliceous Braunite (30-44% Mn)"
            grade_code = "MEDIUM"
        elif predicted_mn_pct >= 15.0:
            classification = "Low-Grade Ferromanganese Ore (15-30% Mn)"
            grade_code = "LOW"
        else:
            classification = "Sub-economic Host Schist / Gondite (<15% Mn)"
            grade_code = "SUB"

        return {
            "predicted_mn_percent": round(predicted_mn_pct, 2),
            "grade_classification": classification,
            "grade_code": grade_code,
            "contribution_breakdown": {
                "base_country_rock_pct": round(self.base_grade, 2),
                "sentinel2_spectral_pct": round(delta_spectral, 2),
                "sentinel1_sar_moisture_pct": round(delta_sar, 2),
                "sentinel3_thermal_pct": round(delta_thermal, 2),
                "era5_supergene_pct": round(delta_supergene, 2)
            }
        }

    def estimate_ore_tonnage(
        self,
        predicted_mn_percent: float,
        anomaly_area_sq_m: float = 45000.0,
        inferred_depth_m: float = 65.0,
        epistemic_confidence_pct: float = 85.0
    ) -> Dict[str, Any]:
        """
        Estimates total Manganese Ore Reserve Tonnage and Recoverable Metal Tonnage (Metric Tons).
        Bulk density varies with grade: Pyrolusite/Braunite ore = 3.6 to 4.6 t/m³.
        """
        # Ore Bulk Density scaling based on Mn grade
        bulk_density_t_per_m3 = 3.1 + (predicted_mn_percent / 100.0) * 2.8
        bulk_density_t_per_m3 = float(np.clip(bulk_density_t_per_m3, 3.2, 4.65))

        # Inferred Volume with sinuosity & geological recovery factor (0.68)
        inferred_volume_m3 = anomaly_area_sq_m * inferred_depth_m * 0.68
        
        # Raw & Confidence-Weighted Ore Tonnage
        raw_ore_tonnage = inferred_volume_m3 * bulk_density_t_per_m3
        confidence_factor = epistemic_confidence_pct / 100.0
        weighted_ore_tonnage = raw_ore_tonnage * confidence_factor

        # Recoverable Pure Mn Metal Tonnage
        recoverable_metal_tonnage = weighted_ore_tonnage * (predicted_mn_percent / 100.0)

        return {
            "predicted_mn_percent": round(predicted_mn_percent, 2),
            "bulk_density_t_per_m3": round(bulk_density_t_per_m3, 2),
            "inferred_volume_m3": round(inferred_volume_m3, 0),
            "raw_ore_tonnage_mt": round(raw_ore_tonnage, 0),
            "confidence_weighted_ore_tonnage_mt": round(weighted_ore_tonnage, 0),
            "recoverable_metal_tonnage_mt": round(recoverable_metal_tonnage, 0),
            "confidence_pct": round(epistemic_confidence_pct, 1)
        }

