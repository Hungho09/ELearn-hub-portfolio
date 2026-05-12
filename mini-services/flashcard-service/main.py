"""FastAPI Flashcard Service - English-Vietnamese vocabulary learning with spaced repetition.

API Endpoints:
- GET  /api/flashcards/session  - Get due cards + new cards for study session
- POST /api/flashcards/review   - Submit a review for a card
- GET  /api/flashcards/stats    - Get user learning statistics
- GET  /api/flashcards/categories - Get progress by category
- GET  /api/vocabulary          - List all vocabulary (with filters)
- POST /api/vocabulary          - Add new vocabulary
- GET  /api/review-logs/{user_id} - Get review logs for ML model
- GET  /health                  - Health check
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, case

from database import get_db
from models import Base, Vocabulary, ReviewLog
from schemas import (
    VocabularyCreate,
    VocabularyResponse,
    VocabularyCardResponse,
    ReviewSubmit,
    ReviewLogResponse,
    ReviewResult,
    FlashcardSession,
    UserStats,
    CategoryProgress,
)
from spaced_repetition import calculate_sm2, get_initial_state
from seed import seed_database

# ─── App Setup ────────────────────────────────────────────────────

app = FastAPI(
    title="LearnHub Flashcard Service",
    description="English-Vietnamese vocabulary learning with SM-2 spaced repetition",
    version="1.0.0",
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
    """Initialize database and seed data on startup."""
    from database import engine
    Base.metadata.create_all(bind=engine)
    seed_database()


# ─── Health Check ─────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "flashcard", "version": "1.0.0"}


# ─── Flashcard Session ───────────────────────────────────────────

@app.get("/api/flashcards/session", response_model=FlashcardSession)
def get_flashcard_session(
    user_id: str = Query(..., description="User ID from NextAuth session"),
    limit: int = Query(default=20, ge=1, le=50, description="Max cards to return"),
    db: Session = Depends(get_db),
):
    """Get a study session with due cards and new cards.

    Due cards: Cards the user has reviewed before and are due for review.
    New cards: Cards the user has never reviewed.
    """
    now = datetime.now(timezone.utc)

    # ── Get due cards ────────────────────────────────────
    # Cards that have been reviewed and next_review_at <= now
    due_subquery = (
        db.query(
            ReviewLog.vocabulary_id,
            func.max(ReviewLog.id).label("latest_log_id"),
        )
        .filter(ReviewLog.user_id == user_id)
        .group_by(ReviewLog.vocabulary_id)
        .subquery()
    )

    due_card_ids = (
        db.query(ReviewLog.vocabulary_id)
        .join(due_subquery, ReviewLog.id == due_subquery.c.latest_log_id)
        .filter(ReviewLog.next_review_at <= now)
        .limit(limit)
        .all()
    )
    due_ids = [r[0] for r in due_card_ids]

    due_vocab = db.query(Vocabulary).filter(Vocabulary.id.in_(due_ids)).all() if due_ids else []

    # ── Get new cards ────────────────────────────────────
    # Cards the user has never reviewed
    reviewed_ids = [
        r[0] for r in db.query(ReviewLog.vocabulary_id)
        .filter(ReviewLog.user_id == user_id)
        .distinct()
        .all()
    ]

    remaining = limit - len(due_vocab)
    new_vocab = (
        db.query(Vocabulary)
        .filter(~Vocabulary.id.in_(reviewed_ids) if reviewed_ids else True)
        .order_by(Vocabulary.difficulty_level, Vocabulary.id)
        .limit(remaining)
        .all()
    )

    # ── Count totals ─────────────────────────────────────
    total_reviewed = (
        db.query(func.count(func.distinct(ReviewLog.vocabulary_id)))
        .filter(ReviewLog.user_id == user_id)
        .scalar() or 0
    )

    total_vocab = db.query(func.count(Vocabulary.id)).scalar() or 0

    return FlashcardSession(
        due_cards=[VocabularyCardResponse.model_validate(v) for v in due_vocab],
        new_cards=[VocabularyCardResponse.model_validate(v) for v in new_vocab],
        total_due=len(due_ids),
        total_new=total_vocab - total_reviewed,
        total_learned=total_reviewed,
    )


# ─── Submit Review ────────────────────────────────────────────────

@app.post("/api/flashcards/review", response_model=ReviewResult)
def submit_review(
    review: ReviewSubmit,
    user_id: str = Query(..., description="User ID from NextAuth session"),
    db: Session = Depends(get_db),
):
    """Submit a review for a vocabulary card using SM-2 spaced repetition.

    Rating scale:
    - 1 (Again): Complete failure, reset progress
    - 2 (Hard): Difficult recall, short interval
    - 3 (Good): Successful recall, standard interval
    - 4 (Easy): Perfect recall, longer interval
    """
    # Verify vocabulary exists
    vocab = db.query(Vocabulary).filter(Vocabulary.id == review.vocabulary_id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail="Vocabulary not found")

    # Get current state from the latest review log
    latest_log = (
        db.query(ReviewLog)
        .filter(
            ReviewLog.user_id == user_id,
            ReviewLog.vocabulary_id == review.vocabulary_id,
        )
        .order_by(ReviewLog.reviewed_at.desc())
        .first()
    )

    # Calculate current SM-2 state
    if latest_log:
        current_ef = latest_log.ease_factor
        current_interval = latest_log.interval_days
        current_reps = latest_log.repetitions
    else:
        state = get_initial_state()
        current_ef = state["ease_factor"]
        current_interval = state["interval_days"]
        current_reps = state["repetitions"]

    # Run SM-2 algorithm
    result = calculate_sm2(
        rating=review.rating,
        current_ease_factor=current_ef,
        current_interval=current_interval,
        current_repetitions=current_reps,
    )

    # Create review log
    log = ReviewLog(
        user_id=user_id,
        vocabulary_id=review.vocabulary_id,
        rating=review.rating,
        ease_factor=result.ease_factor,
        interval_days=result.interval_days,
        repetitions=result.repetitions,
        reviewed_at=datetime.now(timezone.utc),
        next_review_at=result.next_review_at,
        response_time_ms=review.response_time_ms,
        direction=review.direction,
        session_id=review.session_id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    return ReviewResult(
        vocabulary_id=review.vocabulary_id,
        rating=review.rating,
        new_interval_days=result.interval_days,
        new_ease_factor=result.ease_factor,
        new_repetitions=result.repetitions,
        next_review_at=result.next_review_at,
    )


# ─── User Statistics ─────────────────────────────────────────────

@app.get("/api/flashcards/stats", response_model=UserStats)
def get_user_stats(
    user_id: str = Query(..., description="User ID from NextAuth session"),
    db: Session = Depends(get_db),
):
    """Get user learning statistics."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Total reviews
    total_reviews = (
        db.query(func.count(ReviewLog.id))
        .filter(ReviewLog.user_id == user_id)
        .scalar() or 0
    )

    # Total unique words reviewed
    total_unique_words = (
        db.query(func.count(func.distinct(ReviewLog.vocabulary_id)))
        .filter(ReviewLog.user_id == user_id)
        .scalar() or 0
    )

    # Average ease factor
    avg_ef = (
        db.query(func.avg(ReviewLog.ease_factor))
        .filter(ReviewLog.user_id == user_id)
        .scalar() or 2.5
    )

    # Words mastered (latest ease_factor >= 2.5 and interval >= 21 days)
    mastered_subquery = (
        db.query(
            ReviewLog.vocabulary_id,
            func.max(ReviewLog.id).label("latest_id"),
        )
        .filter(ReviewLog.user_id == user_id)
        .group_by(ReviewLog.vocabulary_id)
        .subquery()
    )

    words_mastered = (
        db.query(func.count())
        .select_from(ReviewLog)
        .join(mastered_subquery, ReviewLog.id == mastered_subquery.c.latest_id)
        .filter(
            ReviewLog.ease_factor >= 2.5,
            ReviewLog.interval_days >= 21,
        )
        .scalar() or 0
    )

    # Total vocab count
    total_vocab = db.query(func.count(Vocabulary.id)).scalar() or 0

    # Reviews today
    reviews_today = (
        db.query(func.count(ReviewLog.id))
        .filter(
            ReviewLog.user_id == user_id,
            ReviewLog.reviewed_at >= today_start,
        )
        .scalar() or 0
    )

    # Streak calculation (consecutive days with at least 1 review)
    streak = 0
    check_date = now.date()
    for i in range(365):  # Max 1 year streak
        day_start = datetime.combine(check_date, datetime.min.time()).replace(tzinfo=timezone.utc)
        day_end = day_start + timedelta(days=1)

        has_review = db.query(
            db.query(ReviewLog)
            .filter(
                ReviewLog.user_id == user_id,
                ReviewLog.reviewed_at >= day_start,
                ReviewLog.reviewed_at < day_end,
            )
            .exists()
        ).scalar()

        if has_review:
            streak += 1
            check_date -= timedelta(days=1)
        else:
            # Allow today to not have reviews yet (streak from yesterday)
            if i == 0:
                check_date -= timedelta(days=1)
                continue
            break

    return UserStats(
        total_reviews=total_reviews,
        total_unique_words=total_unique_words,
        average_ease_factor=round(avg_ef, 2),
        words_mastered=words_mastered,
        words_learning=total_unique_words - words_mastered,
        words_new=total_vocab - total_unique_words,
        streak_days=streak,
        reviews_today=reviews_today,
    )


# ─── Category Progress ───────────────────────────────────────────

@app.get("/api/flashcards/categories", response_model=list[CategoryProgress])
def get_category_progress(
    user_id: str = Query(..., description="User ID from NextAuth session"),
    db: Session = Depends(get_db),
):
    """Get learning progress by vocabulary category."""
    categories = (
        db.query(Vocabulary.category)
        .distinct()
        .filter(Vocabulary.category.isnot(None))
        .all()
    )

    result = []
    for (category,) in categories:
        # Total words in category
        total = (
            db.query(func.count(Vocabulary.id))
            .filter(Vocabulary.category == category)
            .scalar() or 0
        )

        # Words reviewed in this category
        learned = (
            db.query(func.count(func.distinct(ReviewLog.vocabulary_id)))
            .join(Vocabulary, ReviewLog.vocabulary_id == Vocabulary.id)
            .filter(
                ReviewLog.user_id == user_id,
                Vocabulary.category == category,
            )
            .scalar() or 0
        )

        # Mastered in this category
        mastered_subquery = (
            db.query(
                ReviewLog.vocabulary_id,
                func.max(ReviewLog.id).label("latest_id"),
            )
            .filter(ReviewLog.user_id == user_id)
            .group_by(ReviewLog.vocabulary_id)
            .subquery()
        )

        mastered = (
            db.query(func.count())
            .select_from(ReviewLog)
            .join(mastered_subquery, ReviewLog.id == mastered_subquery.c.latest_id)
            .join(Vocabulary, ReviewLog.vocabulary_id == Vocabulary.id)
            .filter(
                Vocabulary.category == category,
                ReviewLog.ease_factor >= 2.5,
                ReviewLog.interval_days >= 21,
            )
            .scalar() or 0
        )

        # Average ease factor in category
        avg_ef = (
            db.query(func.avg(ReviewLog.ease_factor))
            .join(Vocabulary, ReviewLog.vocabulary_id == Vocabulary.id)
            .filter(
                ReviewLog.user_id == user_id,
                Vocabulary.category == category,
            )
            .scalar() or 2.5
        )

        result.append(CategoryProgress(
            category=category,
            total_words=total,
            learned_words=learned,
            mastered_words=mastered,
            average_ease_factor=round(avg_ef, 2),
        ))

    return result


# ─── Vocabulary CRUD ──────────────────────────────────────────────

@app.get("/api/vocabulary", response_model=list[VocabularyResponse])
def list_vocabulary(
    category: Optional[str] = Query(default=None),
    difficulty: Optional[int] = Query(default=None, ge=1, le=3),
    search: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List vocabulary with optional filters."""
    query = db.query(Vocabulary)

    if category:
        query = query.filter(Vocabulary.category == category)
    if difficulty:
        query = query.filter(Vocabulary.difficulty_level == difficulty)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Vocabulary.english.ilike(search_term)) |
            (Vocabulary.vietnamese.ilike(search_term))
        )

    return query.offset(skip).limit(limit).all()


@app.post("/api/vocabulary", response_model=VocabularyResponse, status_code=201)
def create_vocabulary(vocab: VocabularyCreate, db: Session = Depends(get_db)):
    """Add a new vocabulary item."""
    item = Vocabulary(**vocab.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


# ─── Review Logs (for ML Model) ──────────────────────────────────

@app.get("/api/review-logs/{user_id}", response_model=list[ReviewLogResponse])
def get_review_logs(
    user_id: str,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=100, ge=1, le=1000),
    vocabulary_id: Optional[int] = Query(default=None),
    direction: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    """Get review logs for a user - primary data source for ML model.

    The ML model can use these logs to:
    - Analyze forgetting curves per user/vocabulary
    - Predict optimal review intervals
    - Identify difficult words
    - Personalize learning paths
    """
    query = db.query(ReviewLog).filter(ReviewLog.user_id == user_id)

    if vocabulary_id:
        query = query.filter(ReviewLog.vocabulary_id == vocabulary_id)
    if direction:
        query = query.filter(ReviewLog.direction == direction)

    return query.order_by(ReviewLog.reviewed_at.desc()).offset(skip).limit(limit).all()


@app.get("/api/review-logs/{user_id}/export")
def export_review_logs(
    user_id: str,
    db: Session = Depends(get_db),
):
    """Export all review logs for a user as JSON (for ML model training)."""
    logs = (
        db.query(ReviewLog)
        .filter(ReviewLog.user_id == user_id)
        .order_by(ReviewLog.reviewed_at)
        .all()
    )

    return {
        "user_id": user_id,
        "total_logs": len(logs),
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "logs": [
            {
                "vocabulary_id": log.vocabulary_id,
                "english": log.vocabulary.english,
                "vietnamese": log.vocabulary.vietnamese,
                "rating": log.rating,
                "ease_factor": log.ease_factor,
                "interval_days": log.interval_days,
                "repetitions": log.repetitions,
                "reviewed_at": log.reviewed_at.isoformat(),
                "next_review_at": log.next_review_at.isoformat() if log.next_review_at else None,
                "response_time_ms": log.response_time_ms,
                "direction": log.direction,
                "session_id": log.session_id,
            }
            for log in logs
        ],
    }
