import logging
from datetime import datetime
from typing import Optional
import asyncpg

from src.config import DATABASE_URL

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None


async def get_pool() -> Optional[asyncpg.Pool]:
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=5)
            await _init_tables()
            logger.info("Connected to PostgreSQL")
        except Exception as e:
            logger.warning(f"PostgreSQL connection failed: {e}")
            _pool = None
    return _pool


async def _init_tables() -> None:
    pool = await get_pool()
    if pool is None:
        return
    async with pool.acquire() as conn:
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS fraud_history (
                id SERIAL PRIMARY KEY,
                transaction_id VARCHAR(100) UNIQUE NOT NULL,
                card_last4 VARCHAR(4),
                customer_id VARCHAR(100),
                amount DECIMAL(12,2),
                risk_score DECIMAL(5,2),
                confirmed_fraud BOOLEAN DEFAULT FALSE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS detected_patterns (
                id SERIAL PRIMARY KEY,
                pattern_type VARCHAR(100) NOT NULL,
                description TEXT,
                severity VARCHAR(20),
                transaction_id VARCHAR(100),
                detected_at TIMESTAMP DEFAULT NOW()
            )
        """)
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS model_training_data (
                id SERIAL PRIMARY KEY,
                amount DECIMAL(12,2),
                hour INT,
                day_of_week INT,
                transaction_count INT,
                velocity DECIMAL(10,2),
                location_distance DECIMAL(10,2),
                avg_amount_diff DECIMAL(10,2),
                is_fraud BOOLEAN,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)


async def save_fraud_report(transaction_id: str, card_last4: str, customer_id: str,
                            amount: float, risk_score: float, confirmed_fraud: bool,
                            notes: Optional[str] = None) -> bool:
    pool = await get_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO fraud_history (transaction_id, card_last4, customer_id, amount, risk_score, confirmed_fraud, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (transaction_id) DO UPDATE SET
                    confirmed_fraud = EXCLUDED.confirmed_fraud,
                    notes = EXCLUDED.notes
            """, transaction_id, card_last4, customer_id, amount, risk_score, confirmed_fraud, notes)
        return True
    except Exception as e:
        logger.error(f"Failed to save fraud report: {e}")
        return False


async def get_fraud_history(limit: int = 100) -> list[dict]:
    pool = await get_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM fraud_history ORDER BY created_at DESC LIMIT $1", limit
            )
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to fetch fraud history: {e}")
        return []


async def save_detected_pattern(pattern_type: str, description: str, severity: str,
                                transaction_id: str) -> bool:
    pool = await get_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO detected_patterns (pattern_type, description, severity, transaction_id)
                VALUES ($1, $2, $3, $4)
            """, pattern_type, description, severity, transaction_id)
        return True
    except Exception as e:
        logger.error(f"Failed to save detected pattern: {e}")
        return False


async def get_detected_patterns(limit: int = 50) -> list[dict]:
    pool = await get_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM detected_patterns ORDER BY detected_at DESC LIMIT $1", limit
            )
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to fetch detected patterns: {e}")
        return []


async def save_training_data(data: dict) -> bool:
    pool = await get_pool()
    if pool is None:
        return False
    try:
        async with pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO model_training_data (amount, hour, day_of_week, transaction_count,
                    velocity, location_distance, avg_amount_diff, is_fraud)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """, data.get("amount"), data.get("hour"), data.get("day_of_week"),
                data.get("transaction_count"), data.get("velocity"),
                data.get("location_distance"), data.get("avg_amount_diff"),
                data.get("is_fraud"))
        return True
    except Exception as e:
        logger.error(f"Failed to save training data: {e}")
        return False


async def get_training_data(limit: int = 1000) -> list[dict]:
    pool = await get_pool()
    if pool is None:
        return []
    try:
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM model_training_data ORDER BY created_at DESC LIMIT $1", limit
            )
            return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"Failed to fetch training data: {e}")
        return []
