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

# ─── Database Migration ────────────────────────────────────────────

def _migrate_database():
    """Add missing columns to existing SQLite tables.

    SQLAlchemy's create_all() only creates NEW tables — it does NOT
    add columns to existing tables. This function uses ALTER TABLE
    to add any missing columns.
    """
    from sqlalchemy import inspect, text

    inspector = inspect(engine)
    columns_to_add = {
        "review_log": [
            ("user_answer", "VARCHAR(500)"),
            ("auto_rating", "INTEGER"),
        ],
    }

    with engine.connect() as conn:
        for table_name, columns in columns_to_add.items():
            if not inspector.has_table(table_name):
                continue

            existing = {col["name"] for col in inspector.get_columns(table_name)}

            for col_name, col_type in columns:
                if col_name not in existing:
                    try:
                        conn.execute(text(
                            f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"
                        ))
                        conn.commit()
                        print(f"[migration] Added column {table_name}.{col_name}")
                    except Exception as e:
                        print(f"[migration] Could not add {table_name}.{col_name}: {e}")


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
    """Initialize database, migrate schema, seed data, and pre-load models on startup."""
    Base.metadata.create_all(bind=engine)

    # Migrate: ensure new columns exist (SQLite doesn't support ALTER COLUMN)
    _migrate_database()

    seed_database()

    # Pre-load the TGCL model at startup
    try:
        from ml_model.predict import get_model
        get_model()  # Loads model + creates optimizer
        print("[startup] TGCL model pre-loaded (can predict AND learn)")
    except Exception as e:
        print(f"[startup] TGCL model not available: {e}. SM-2 fallback will be used.")

    # Pre-load the LaBSE model for semantic grading
    try:
        from grader import _load_labse_model
        _load_labse_model()
    except Exception as e:
        print(f"[startup] LaBSE model not available: {e}. Levenshtein fallback will be used.")


# ─── Include Routers ──────────────────────────────────────────────

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(flashcard_router)
app.include_router(vocabulary_router)
app.include_router(review_logs_router)


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/health")
def health_check():
    # Check TGCL model status
    tcgl_status = "not_loaded"
    try:
        from ml_model.predict import is_model_loaded
        tcgl_status = "loaded" if is_model_loaded() else "not_loaded"
    except Exception:
        tcgl_status = "unavailable"

    # Check LaBSE grader status
    labse_status = "not_loaded"
    try:
        from grader import get_labse_status
        labse_info = get_labse_status()
        labse_status = "loaded" if labse_info["available"] else "not_available"
    except Exception:
        labse_status = "unavailable"

    return {
        "status": "ok",
        "service": "learnhub-backend",
        "version": "2.0.0",
        "database": "sqlite",
        "tcgl_model": tcgl_status,
        "labse_grader": labse_status,
        "routers": {
            "auth": ["/api/auth/register", "/api/auth/verify"],
            "user": ["/api/user/profile", "/api/user/avatar"],
            "flashcards": ["/api/flashcards/session", "/api/flashcards/review", "/api/flashcards/check-answer", "/api/flashcards/stats", "/api/flashcards/categories", "/api/flashcards/model-info", "/api/flashcards/train", "/api/flashcards/training-stats"],
            "vocabulary": ["/api/vocabulary", "/api/vocabulary/enrich", "/api/vocabulary/categories", "/api/vocabulary/random"],
            "review_logs": ["/api/review-logs/{user_id}", "/api/review-logs/{user_id}/export"],
        },
    }
