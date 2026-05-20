import logging
from datetime import datetime
from typing import Optional
import asyncio

from src.redis_client import (
    increment_card_counter,
    get_last_location,
    set_last_location,
    get_customer_avg_amount,
    increment_ip_small_amounts,
)

logger = logging.getLogger(__name__)


async def check_multiple_transactions_same_card(card_last4: str) -> Optional[dict]:
    count = await increment_card_counter(card_last4)
    if count > 5:
        return {
            "rule": "multiple_transactions_same_card",
            "severity": "high",
            "description": f"Card {card_last4} used {count} times in 5 minutes",
            "score": min(30, count * 5),
        }
    return None


async def check_sudden_location_change(customer_id: str, location: str) -> Optional[dict]:
    last_location = await get_last_location(customer_id)
    if last_location and last_location != location:
        return {
            "rule": "sudden_location_change",
            "severity": "medium",
            "description": f"Location changed from {last_location} to {location}",
            "score": 20,
        }
    await set_last_location(customer_id, location)
    return None


async def check_suspicious_hours(timestamp: datetime) -> Optional[dict]:
    hour = timestamp.hour
    if 0 <= hour < 5:
        return {
            "rule": "suspicious_hours",
            "severity": "low",
            "description": f"Transaction at suspicious hour: {hour}:00",
            "score": 10,
        }
    return None


async def check_unusual_amount(customer_id: str, amount: float) -> Optional[dict]:
    avg_amount = await get_customer_avg_amount(customer_id)
    if avg_amount and amount > 3 * avg_amount:
        ratio = amount / avg_amount
        return {
            "rule": "unusual_amount",
            "severity": "high",
            "description": f"Amount ${amount:.2f} is {ratio:.1f}x above average ${avg_amount:.2f}",
            "score": min(35, int(ratio * 5)),
        }
    return None


async def check_card_testing_pattern(ip_address: str, amount: float) -> Optional[dict]:
    small_count = await increment_ip_small_amounts(ip_address, amount)
    if small_count >= 5:
        return {
            "rule": "card_testing_pattern",
            "severity": "high",
            "description": f"IP {ip_address} made {small_count} small transactions in 5 minutes",
            "score": 30,
        }
    return None


async def evaluate_all_rules(
    card_last4: str,
    customer_id: str,
    location: str,
    timestamp: datetime,
    amount: float,
    ip_address: str,
) -> list[dict]:
    rules = await asyncio.gather(
        check_multiple_transactions_same_card(card_last4),
        check_sudden_location_change(customer_id, location),
        check_suspicious_hours(timestamp),
        check_unusual_amount(customer_id, amount),
        check_card_testing_pattern(ip_address, amount),
    )
    return [r for r in rules if r is not None]
