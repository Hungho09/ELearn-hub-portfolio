"""LearnHub Backend - Unified Python FastAPI service.

All backend API endpoints in one service with modular routers.
This replaces the previously separated api-service and flashcard-service.

Routers:
  Auth:
  - POST /api/auth/register     - Register a new user
  - POST /api/auth/verify       - Verify credentials (used by NextAuth proxy)

  User:
  - GET  /api/user/profile      - Get user profile
  - PUT  /api/user/profile      - Update user profile
  - POST /api/user/avatar       - Upload avatar image

  Flashcards:
  - GET  /api/flashcards/session   - Get due cards + new cards for study session
  - POST /api/flashcards/review    - Submit a review for a card
  - GET  /api/flashcards/stats     - Get user learning statistics
  - GET  /api/flashcards/categories - Get progress by category

  Vocabulary:
  - GET  /api/vocabulary         - List all vocabulary (with filters)
  - POST /api/vocabulary         - Add new vocabulary

  Review Logs (ML Model):
  - GET  /api/review-logs/{user_id}     - Get review logs for ML model
  - GET  /api/review-logs/{user_id}/export - Export all logs as JSON

  Health:
  - GET  /health                  - Health check
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine
from models import Base
from routers import (
    auth_router,
    user_router,
    flashcard_router,
    vocabulary_router,
    review_logs_router,
)
from seed import seed_database

# ─── App Setup ────────────────────────────────────────────────────

app = FastAPI(
    title="LearnHub Backend",
    description="Unified Python backend for LearnHub - Auth, Flashcards, Vocabulary, Review Logs",
    version="2.0.0",
)

# CORS - allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    """Initialize database, seed data, and pre-load TCGL model on startup."""
    Base.metadata.create_all(bind=engine)
    seed_database()

    # Pre-load the TCGL model at startup
    try:
        from ml_model.predict import get_model
        get_model()  # Loads model + creates optimizer
        print("[startup] TCGL model pre-loaded (can predict AND learn)")
    except Exception as e:
        print(f"[startup] TCGL model not available: {e}. SM-2 fallback will be used.")


# ─── Include Routers ──────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(flashcard_router)
app.include_router(vocabulary_router)
app.include_router(review_logs_router)


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/health")
def health_check():
    # Check TCGL model status
    tcgl_status = "not_loaded"
    try:
        from ml_model.predict import is_model_loaded
        tcgl_status = "loaded" if is_model_loaded() else "not_loaded"
    except Exception:
        tcgl_status = "unavailable"

    return {
        "status": "ok",
        "service": "learnhub-backend",
        "version": "2.0.0",
        "database": "sqlite",
        "tcgl_model": tcgl_status,
        "routers": {
            "auth": ["/api/auth/register", "/api/auth/verify"],
            "user": ["/api/user/profile", "/api/user/avatar"],
            "flashcards": ["/api/flashcards/session", "/api/flashcards/review", "/api/flashcards/check-answer", "/api/flashcards/stats", "/api/flashcards/categories", "/api/flashcards/model-info", "/api/flashcards/train", "/api/flashcards/training-stats"],
            "vocabulary": ["/api/vocabulary", "/api/vocabulary/enrich", "/api/vocabulary/categories", "/api/vocabulary/random"],
            "review_logs": ["/api/review-logs/{user_id}", "/api/review-logs/{user_id}/export"],
        },
    }
