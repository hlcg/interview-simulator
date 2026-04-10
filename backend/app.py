from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def root():
    return {"message": "Server is running with Hypercorn"}

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "interview-backend", "server": "hypercorn"}

if __name__ == "__main__":
    import hypercorn.asyncio
    import asyncio
    asyncio.run(hypercorn.asyncio.serve(app, hypercorn.Config(bind="0.0.0.0:8000")))
