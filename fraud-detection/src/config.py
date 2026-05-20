import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@postgres:5432/fraud_detection")
MODEL_PATH = os.getenv("MODEL_PATH", "/app/models/fraud_model.joblib")
