"""FastAPI entrypoint for the CCMS AI / Nyaya Setu prototype."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db
from routers import dashboard, extraction, upload, verification


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Nyaya Setu — CCMS AI",
    description="From Court Judgments to Verified Action Plans.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(extraction.router)
app.include_router(verification.router)
app.include_router(dashboard.router)


@app.get("/health")
def health():
    return {
        "ok": True,
        "ai_provider": "groq",
        "ai_configured": bool(settings.groq_api_key),
        "model": settings.groq_model,
    }


@app.get("/")
def root():
    return {
        "service": "Nyaya Setu — CCMS AI",
        "docs": "/docs",
        "health": "/health",
    }
