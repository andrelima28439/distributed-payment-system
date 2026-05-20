import logging
import os
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
import joblib
from typing import Optional

from src.config import MODEL_PATH

logger = logging.getLogger(__name__)


def _build_features(amount: float, timestamp, tx_count: int = 1, velocity: float = 0.0,
                    location_distance: float = 0.0, avg_amount_diff: float = 0.0) -> np.ndarray:
    hour = timestamp.hour if hasattr(timestamp, 'hour') else 0
    day_of_week = timestamp.weekday() if hasattr(timestamp, 'weekday') else 0
    return np.array([[amount, hour, day_of_week, tx_count, velocity, location_distance, avg_amount_diff]])


def generate_training_data(n_samples: int = 1000) -> pd.DataFrame:
    np.random.seed(42)
    n_fraud = int(n_samples * 0.05)

    amounts = np.concatenate([
        np.random.exponential(100, n_samples - n_fraud),
        np.random.exponential(500, n_fraud),
    ])
    hours = np.concatenate([
        np.random.randint(6, 23, n_samples - n_fraud),
        np.random.randint(0, 5, n_fraud),
    ])
    days = np.random.randint(0, 7, n_samples)
    tx_counts = np.random.poisson(2, n_samples)
    velocity = np.random.exponential(1, n_samples)
    location_dist = np.concatenate([
        np.random.exponential(10, n_samples - n_fraud),
        np.random.exponential(200, n_fraud),
    ])
    avg_diff = np.concatenate([
        np.random.normal(0, 20, n_samples - n_fraud),
        np.random.normal(150, 100, n_fraud),
    ])

    return pd.DataFrame({
        "amount": amounts,
        "hour": hours,
        "day_of_week": days,
        "transaction_count": tx_counts,
        "velocity": velocity,
        "location_distance": location_dist,
        "avg_amount_diff": avg_diff,
    })


class FraudMLModel:
    def __init__(self):
        self.model: Optional[IsolationForest] = None
        self.is_trained = False

    def train_model(self, data: Optional[pd.DataFrame] = None) -> None:
        if data is None:
            data = generate_training_data()
        self.model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42,
            n_jobs=-1,
        )
        self.model.fit(data)
        self.is_trained = True
        logger.info("ML model trained successfully")

    def predict(self, amount: float, timestamp, tx_count: int = 1,
                velocity: float = 0.0, location_distance: float = 0.0,
                avg_amount_diff: float = 0.0) -> float:
        if self.model is None:
            return 0.0
        features = _build_features(amount, timestamp, tx_count, velocity, location_distance, avg_amount_diff)
        score = self.model.score_samples(features)[0]
        normalized = 1.0 - (score + 0.5) / 1.0
        return max(0.0, min(1.0, normalized))

    def calculate_risk_score(self, ml_score: float, rule_results: list[dict]) -> float:
        rule_score = sum(r.get("score", 0) for r in rule_results)
        max_rule_score = 70.0
        normalized_rules = min(rule_score, max_rule_score) / max_rule_score
        ml_weight = 1.0 - normalized_rules * 0.3
        combined = (ml_score * ml_weight * 30) + normalized_rules * max_rule_score
        return round(min(100.0, combined), 2)

    def save_model(self) -> None:
        if self.model is None:
            logger.warning("No model to save")
            return
        os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
        joblib.dump(self.model, MODEL_PATH)
        logger.info(f"Model saved to {MODEL_PATH}")

    def load_model(self) -> bool:
        if not os.path.exists(MODEL_PATH):
            logger.info(f"No saved model found at {MODEL_PATH}")
            return False
        try:
            self.model = joblib.load(MODEL_PATH)
            self.is_trained = True
            logger.info(f"Model loaded from {MODEL_PATH}")
            return True
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            return False

    def update_model(self, new_data: pd.DataFrame) -> None:
        if self.model is None:
            self.train_model(new_data)
            return
        existing = generate_training_data(500)
        combined = pd.concat([existing, new_data], ignore_index=True)
        self.train_model(combined)
        self.save_model()
        logger.info(f"Model updated with {len(new_data)} new samples")
