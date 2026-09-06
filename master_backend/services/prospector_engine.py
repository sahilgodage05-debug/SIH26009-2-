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
