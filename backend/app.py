from fastapi import FastAPI
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    stream=sys.stdout,
    force=True
)
logger = logging.getLogger(__name__)

logger.info("=" * 60)
logger.info("🚀 STARTING MINIMAL APP")
logger.info("=" * 60)

app = FastAPI()
logger.info("✅ FastAPI app created")

@app.get("/")
def root():
    logger.info("📍 ROOT / endpoint called")
    return {"message": "Server is running"}

@app.get("/api/health")
def health():
    logger.info("📍 /api/health endpoint called")
    return {"status": "ok", "service": "interview-backend"}

logger.info("✅ All routes registered")
logger.info("=" * 60)
logger.info("🎉 APP READY - Waiting for requests")
logger.info("=" * 60)

if __name__ == "__main__":
    import uvicorn
    logger.info("🚀 Starting uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
