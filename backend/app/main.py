from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import morph_router

app = FastAPI(title="YC", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(morph_router.router, prefix="/api/v1", tags=["morph"])


@app.get("/health")
def health_check():
    return {"status": "ok"}
