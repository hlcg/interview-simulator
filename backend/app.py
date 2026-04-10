from fastapi import FastAPI

app = FastAPI()

# Fonction utilitaire pour logger dans /tmp/debug.log
def debug_log(message):
    try:
        with open("/tmp/debug.log", "a") as f:
            f.write(f"{message}\n")
            f.flush()
    except Exception as e:
        print(f"ERROR writing to debug.log: {e}")

debug_log("=" * 60)
debug_log("🚀 STARTING MINIMAL APP")
debug_log("=" * 60)

@app.get("/")
def root():
    debug_log("📍 ROOT / endpoint called")
    return {"message": "Server is running"}

@app.get("/api/health")
def health():
    debug_log("📍 /api/health endpoint called")
    return {"status": "ok", "service": "interview-backend"}

debug_log("✅ All routes registered")
debug_log("=" * 60)
debug_log("🎉 APP READY - Waiting for requests")
debug_log("=" * 60)

if __name__ == "__main__":
    import uvicorn
    debug_log("🚀 Starting uvicorn...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
