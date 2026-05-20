import logging
import uuid
from datetime import datetime
from typing import Optional

from src.models import TransactionRequest, TransactionAnalysis
from src.rules_engine import evaluate_all_rules
from src.ml_model import FraudMLModel
from src.redis_client import (
    is_blacklisted,
    store_analysis_result,
    add_to_blacklist,
    get_card_transaction_count,
    get_customer_avg_amount,
    set_customer_avg_amount,
)
from src.database import (
    save_fraud_report,
    get_detected_patterns,
    save_detected_pattern,
    save_training_data,
)

logger = logging.getLogger(__name__)


async def analyze_transaction(
    request: TransactionRequest,
    ml_model: FraudMLModel,
) -> TransactionAnalysis:
    tx_id = str(uuid.uuid4())

    blacklisted = await is_blacklisted(request.ip_address)
    if blacklisted:
        result = TransactionAnalysis(
            transaction_id=tx_id,
            risk_score=100.0,
            is_fraud=True,
            triggered_rules=[{
                "rule": "blacklisted_ip",
                "severity": "critical",
                "description": f"IP {request.ip_address} is blacklisted",
                "score": 100,
            }],
            ml_score=1.0,
            decision="rejected",
        )
        await store_analysis_result(tx_id, result.model_dump())
        return result

    rule_results = await evaluate_all_rules(
        card_last4=request.card_last4,
        customer_id=request.customer_id,
        location=request.location,
        timestamp=request.timestamp,
        amount=request.amount,
        ip_address=request.ip_address,
    )

    tx_count = await get_card_transaction_count(request.card_last4)
    avg_amount = await get_customer_avg_amount(request.customer_id)
    avg_amount_diff = abs(request.amount - (avg_amount or request.amount))

    ml_score = ml_model.predict(
        amount=request.amount,
        timestamp=request.timestamp,
        tx_count=tx_count,
        velocity=len(rule_results) * 0.5,
        location_distance=1.0 if any(r["rule"] == "sudden_location_change" for r in rule_results) else 0.0,
        avg_amount_diff=avg_amount_diff,
    )

    risk_score = ml_model.calculate_risk_score(ml_score, rule_results)

    is_fraud = risk_score > 60 or any(r.get("severity") in ("critical", "high") for r in rule_results if r.get("score", 0) >= 25)

    decision = "rejected" if is_fraud else "approved"

    if is_fraud:
        await add_to_blacklist(request.ip_address)

    for rule in rule_results:
        await save_detected_pattern(
            pattern_type=rule["rule"],
            description=rule["description"],
            severity=rule["severity"],
            transaction_id=tx_id,
        )

    if avg_amount is None:
        await set_customer_avg_amount(request.customer_id, request.amount)

    result = TransactionAnalysis(
        transaction_id=tx_id,
        risk_score=risk_score,
        is_fraud=is_fraud,
        triggered_rules=rule_results,
        ml_score=round(ml_score, 4),
        decision=decision,
    )

    await store_analysis_result(tx_id, result.model_dump())
    logger.info(f"Transaction {tx_id}: risk={risk_score}, decision={decision}")
    return result


async def report_fraud(
    transaction_id: str,
    confirmed_fraud: bool,
    ml_model: FraudMLModel,
    notes: Optional[str] = None,
) -> bool:
    success = await save_fraud_report(
        transaction_id=transaction_id,
        card_last4="",
        customer_id="",
        amount=0.0,
        risk_score=0.0,
        confirmed_fraud=confirmed_fraud,
        notes=notes,
    )

    if confirmed_fraud:
        training_data = {
            "amount": 0.0,
            "hour": datetime.utcnow().hour,
            "day_of_week": datetime.utcnow().weekday(),
            "transaction_count": 1,
            "velocity": 0.0,
            "location_distance": 100.0,
            "avg_amount_diff": 50.0,
            "is_fraud": True,
        }
        await save_training_data(training_data)

    return success
