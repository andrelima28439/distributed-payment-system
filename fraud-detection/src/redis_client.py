import redis.asyncio as redis
import logging
from typing import Optional

from src.config import REDIS_URL

logger = logging.getLogger(__name__)

_redis: Optional[redis.Redis] = None


async def get_redis() -> Optional[redis.Redis]:
    global _redis
    if _redis is None:
        try:
            _redis = redis.from_url(REDIS_URL, decode_responses=True)
            await _redis.ping()
            logger.info("Connected to Redis")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            _redis = None
    return _redis


async def increment_card_counter(card_last4: str, ttl: int = 300) -> int:
    r = await get_redis()
    if r is None:
        return 0
    key = f"card_tx:{card_last4}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, ttl)
    return count


async def get_card_transaction_count(card_last4: str) -> int:
    r = await get_redis()
    if r is None:
        return 0
    key = f"card_tx:{card_last4}"
    val = await r.get(key)
    return int(val) if val else 0


async def set_last_location(customer_id: str, location: str) -> None:
    r = await get_redis()
    if r is None:
        return
    await r.setex(f"loc:{customer_id}", 86400, location)


async def get_last_location(customer_id: str) -> Optional[str]:
    r = await get_redis()
    if r is None:
        return None
    return await r.get(f"loc:{customer_id}")


async def get_customer_avg_amount(customer_id: str) -> Optional[float]:
    r = await get_redis()
    if r is None:
        return None
    val = await r.get(f"avg_amount:{customer_id}")
    return float(val) if val else None


async def set_customer_avg_amount(customer_id: str, avg: float) -> None:
    r = await get_redis()
    if r is None:
        return
    await r.setex(f"avg_amount:{customer_id}", 86400 * 30, avg)


async def add_to_blacklist(ip: str) -> None:
    r = await get_redis()
    if r is None:
        return
    await r.setex(f"blacklist:ip:{ip}", 86400, "1")


async def is_blacklisted(ip: str) -> bool:
    r = await get_redis()
    if r is None:
        return False
    val = await r.get(f"blacklist:ip:{ip}")
    return val == "1"


async def store_analysis_result(tx_id: str, result: dict, ttl: int = 86400) -> None:
    r = await get_redis()
    if r is None:
        return
    await r.setex(f"analysis:{tx_id}", ttl, str(result))


async def increment_ip_counter(ip_address: str, ttl: int = 300) -> int:
    r = await get_redis()
    if r is None:
        return 0
    key = f"ip_tx:{ip_address}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, ttl)
    return count


async def get_ip_small_amounts_count(ip_address: str, threshold: float = 50.0) -> int:
    r = await get_redis()
    if r is None:
        return 0
    key = f"ip_small:{ip_address}"
    val = await r.get(key)
    return int(val) if val else 0


async def increment_ip_small_amounts(ip_address: str, amount: float, ttl: int = 300) -> int:
    r = await get_redis()
    if r is None:
        return 0
    if amount >= 50.0:
        return 0
    key = f"ip_small:{ip_address}"
    count = await r.incr(key)
    if count == 1:
        await r.expire(key, ttl)
    return count
