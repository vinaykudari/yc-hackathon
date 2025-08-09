from fastapi import FastAPI

from app.routers import morph_router

app = FastAPI(title="YC", version="1.0.0")

app.include_router(morph_router.router, prefix="/api/v1", tags=["morph"])


@app.get("/health")
def health_check():
    return {"status": "OK"}
