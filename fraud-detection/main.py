import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from src.models import TransactionRequest, FraudReport, TransactionAnalysis
from src.analyzer import analyze_transaction, report_fraud as analyzer_report_fraud
from src.ml_model import FraudMLModel
from src.database import get_detected_patterns as db_get_patterns

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ml_model = FraudMLModel()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting fraud detection service...")
    loaded = ml_model.load_model()
    if not loaded:
        logger.info("No saved model found, training with synthetic data...")
        ml_model.train_model()
        ml_model.save_model()
    await get_redis()
    yield
    logger.info("Shutting down fraud detection service...")


app = FastAPI(
    title="Fraud Detection Service",
    description="Distributed fraud detection for payment transactions",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return JSONResponse({
        "status": "healthy",
        "service": "fraud-detection",
        "model_loaded": ml_model.is_trained,
    })


@app.post("/analyze", response_model=TransactionAnalysis)
async def analyze(request: TransactionRequest):
    try:
        result = await analyze_transaction(request, ml_model)
        return result
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Transaction analysis failed")


@app.get("/score/{transaction_id}")
async def get_score(transaction_id: str):
    from src.redis_client import get_redis
    r = await get_redis()
    if r is None:
        raise HTTPException(status_code=503, detail="Redis unavailable")
    data = await r.get(f"analysis:{transaction_id}")
    if data is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    import ast
    try:
        result = ast.literal_eval(data)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to parse stored result")
    return JSONResponse(result)


@app.post("/report-fraud")
async def report_fraud(report: FraudReport):
    try:
        success = await analyzer_report_fraud(
            transaction_id=report.transaction_id,
            confirmed_fraud=report.confirmed_fraud,
            ml_model=ml_model,
            notes=report.notes,
        )
        if not success:
            raise HTTPException(status_code=500, detail="Failed to store fraud report")
        return JSONResponse({"status": "ok", "message": "Fraud report recorded"})
    except Exception as e:
        logger.error(f"Fraud report failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to process fraud report")


@app.get("/patterns")
async def get_patterns():
    try:
        patterns = await db_get_patterns()
        return {"patterns": patterns, "count": len(patterns)}
    except Exception as e:
        logger.error(f"Failed to fetch patterns: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch patterns")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
