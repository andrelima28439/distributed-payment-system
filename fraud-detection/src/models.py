from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class TransactionRequest(BaseModel):
    amount: float
    card_last4: str
    merchant_id: str
    timestamp: datetime
    location: str
    customer_id: str
    ip_address: str


class TransactionAnalysis(BaseModel):
    transaction_id: str
    risk_score: float
    is_fraud: bool
    triggered_rules: list[dict]
    ml_score: float
    decision: str


class FraudReport(BaseModel):
    transaction_id: str
    confirmed_fraud: bool
    notes: Optional[str] = None


class PatternResponse(BaseModel):
    pattern_id: str
    pattern_type: str
    description: str
    severity: str
    detected_at: datetime
    transaction_count: int
