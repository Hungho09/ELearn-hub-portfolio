"""Flashcard router - Spaced repetition flashcard sessions.

Uses TCGL (Temporal Contrastive Graph Learning) model for scheduling,
with SM-2 as automatic fallback if the model is unavailable.

The TCGL model can both PREDICT and LEARN from user data:
- Online learning: updates model weights after each review
- Batch training: fine-tune on accumulated review logs via /train endpoint

Endpoints:
- GET  /api/flashcards/session       - Get due cards + new cards for study session
- POST /api/flashcards/review        - Submit a review (TCGL predicts + learns, SM-2 fallback)
- POST /api/flashcards/check-answer  - Check a typed answer and auto-grade
- GET  /api/flashcards/stats         - Get user learning statistics
- GET  /api/flashcards/categories    - Get progress by category
- GET  /api/flashcards/model-info    - Get info about the active scheduling model
- POST /api/flashcards/train         - Batch train model on review data
- GET  /api/flashcards/training-stats - Get model training statistics
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Vocabulary, ReviewLog
from schemas import (
    VocabularyCardResponse,
    ReviewSubmit,
    ReviewResult,
    FlashcardSession,
    UserStats,
    CategoryProgress,
    CheckAnswerRequest,
    CheckAnswerResponse,
)
from spaced_repetition import calculate_sm2, get_initial_state
from grader import check_answer as grade_answer

# Lazy imports for TCGL model (requires torch, may not be available)
try:
    from ml_model.predict import (
        predict_next_review as tcgl_predict,
        get_model_info as tcgl_model_info,
        is_model_loaded,
        train_on_reviews,
        get_training_stats,
    )
    _TCGL_AVAILABLE = True
except ImportError:
    _TCGL_AVAILABLE = False
    print("[Flashcard] TCGL model not available (torch not installed). Using SM-2 fallback.")

    def tcgl_predict(*args, **kwargs):
        raise RuntimeError("TCGL model not available")

    def tcgl_model_info():
        return {"active_model": "SM-2 (SuperMemo)", "model_loaded": False, "can_learn": False, "error": "torch not installed"}

    def is_model_loaded():
        return False

    def train_on_reviews(*args, **kwargs):
        return {"status": "error", "reason": "TCGL model not available (torch not installed)"}

    def get_training_stats():
        return {"error": "TCGL model not available"}

router = APIRouter(prefix="/api/flashcards", tags=["Flashcards"])


# ─── Training Request Schema ──────────────────────────────────────


class TrainRequest(BaseModel):
    """Request body for batch training."""
    epochs: int = Field(default=10, ge=1, le=100, description="Number of training epochs")
    learning_rate: float = Field(default=0.005, ge=0.0001, le=0.1, description="Learning rate")
    max_reviews: int = Field(default=5000, ge=10, le=50000, description="Max reviews to use")


class TrainResponse(BaseModel):
    """Response from batch training."""
    status: str
    epochs: Optional[int] = None
    final_loss: Optional[float] = None
    losses: Optional[list[float]] = None
    reviews_used: Optional[int] = None
    vocab_coverage: Optional[int] = None
    nodes: Optional[int] = None
    edges: Optional[int] = None
    reason: Optional[str] = None
    learning_rate: Optional[float] = None


# ─── Endpoints ────────────────────────────────────────────────────


@router.get("/session", response_model=FlashcardSession)
def get_flashcard_session(
    user_id: str = Query(..., description="User ID from NextAuth session"),
    limit: int = Query(default=20, ge=1, le=50, description="Max cards to return"),
    db: Session = Depends(get_db),
):
    """Get a study session with due cards and new cards."""
    now = datetime.now(timezone.utc)

    # ── Get due cards ────────────────────────────────────
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
        due_cards=[VocabularyCardResponse(**v.to_card_dict()) for v in due_vocab],
        new_cards=[VocabularyCardResponse(**v.to_card_dict()) for v in new_vocab],
        total_due=len(due_ids),
        total_new=total_vocab - total_reviewed,
        total_learned=total_reviewed,
    )


@router.post("/check-answer", response_model=CheckAnswerResponse)
def check_flashcard_answer(
    req: CheckAnswerRequest,
    db: Session = Depends(get_db),
):
    """Check a user's typed answer against the correct translation.

    Uses the auto-grading module to compare answers with support for:
    - Exact matching
    - Vietnamese diacritics tolerance (e.g., "xin chao" matches "xin chào")
    - Fuzzy matching via Levenshtein distance

    Returns a rating, accuracy score, and match details.
    """
    # Look up the vocabulary item
    vocab = db.query(Vocabulary).filter(Vocabulary.id == req.vocabulary_id).first()
    if not vocab:
        raise HTTPException(status_code=404, detail="Vocabulary not found")

    # Determine the correct answer based on direction
    if req.direction == "en_to_vi":
        correct_answer = vocab.vietnamese
    else:
        correct_answer = vocab.english

    # Run the grader
    grade_result = grade_answer(
        user_answer=req.user_answer,
        correct_answer=correct_answer,
        direction=req.direction,
    )

    # Map grader match_type to frontend-friendly types
    match_type = grade_result["match_type"]
    similarity = grade_result["similarity"]
    if match_type == "diacritics_ignored":
        match_type = "close"
    elif match_type == "none":
        match_type = "incorrect"
    elif match_type == "partial" and similarity < 0.4:
        # Very low similarity partial matches should be treated as incorrect
        match_type = "incorrect"

    # Convert accuracy from 0-1 to 0-100 percentage
    accuracy_pct = round(grade_result["accuracy"] * 100, 1)

    return CheckAnswerResponse(
        vocabulary_id=req.vocabulary_id,
        correct_answer=correct_answer,
        user_answer=req.user_answer,
        rating=grade_result["rating"],
        accuracy=accuracy_pct,
        is_correct=grade_result["is_correct"],
        match_type=match_type,
        similarity=grade_result["similarity"],
        pronunciation=vocab.pronunciation,
        example_english=vocab.example_english,
        example_vietnamese=vocab.example_vietnamese,
    )


@router.post("/review", response_model=ReviewResult)
def submit_review(
    review: ReviewSubmit,
    user_id: str = Query(..., description="User ID from NextAuth session"),
    db: Session = Depends(get_db),
):
    """Submit a review for a vocabulary card.

    Uses the TCGL model for scheduling with online learning.
    The model updates its weights after each review to learn from user data.
    Falls back to SM-2 if the model is unavailable.

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

    # Calculate current state
    if latest_log:
        current_ef = latest_log.ease_factor
        current_interval = latest_log.interval_days
        current_reps = latest_log.repetitions
    else:
        state = get_initial_state()
        current_ef = state["ease_factor"]
        current_interval = state["interval_days"]
        current_reps = state["repetitions"]

    # ── Try TCGL model first, fall back to SM-2 ──────────────
    try:
        # Gather user's review history for graph construction
        user_reviews = (
            db.query(ReviewLog)
            .filter(ReviewLog.user_id == user_id)
            .order_by(ReviewLog.reviewed_at.desc())
            .limit(200)
            .all()
        )
        review_history = [
            {
                "vocabulary_id": r.vocabulary_id,
                "rating": r.rating,
                "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
                "session_id": r.session_id,
                "ease_factor": r.ease_factor,
                "interval_days": r.interval_days,
                "repetitions": r.repetitions,
                "response_time_ms": r.response_time_ms,
                "direction": r.direction,
            }
            for r in user_reviews
        ]

        # Get only vocabulary items referenced in review history + current card
        referenced_ids = list(set(
            [r.vocabulary_id for r in user_reviews] + [review.vocabulary_id]
        ))
        relevant_vocab = db.query(Vocabulary).filter(Vocabulary.id.in_(referenced_ids)).all()
        vocab_list = [
            {
                "id": v.id,
                "difficulty_level": v.difficulty_level,
                "category": v.category,
                "part_of_speech": v.part_of_speech,
            }
            for v in relevant_vocab
        ]

        vocab_info = {
            "id": vocab.id,
            "difficulty_level": vocab.difficulty_level,
            "category": vocab.category,
            "part_of_speech": vocab.part_of_speech,
        }

        # Run TCGL model (with online learning enabled)
        result = tcgl_predict(
            rating=review.rating,
            current_ease_factor=current_ef,
            current_interval=current_interval,
            current_repetitions=current_reps,
            user_id=user_id,
            vocabulary_id=review.vocabulary_id,
            vocab_info=vocab_info,
            user_review_history=review_history,
            all_vocab=vocab_list,
            direction=review.direction,
            response_time_ms=review.response_time_ms,
            session_id=review.session_id,
            enable_learning=True,  # Model learns from each review!
        )
        model_used = result.get("model_used", "tcgl")

    except Exception as e:
        print(f"[Flashcard] TCGL model failed: {e}. Using SM-2 fallback.")
        # SM-2 fallback
        sm2_result = calculate_sm2(
            rating=review.rating,
            current_ease_factor=current_ef,
            current_interval=current_interval,
            current_repetitions=current_reps,
        )
        result = {
            "ease_factor": sm2_result.ease_factor,
            "interval_days": sm2_result.interval_days,
            "repetitions": sm2_result.repetitions,
            "next_review_at": sm2_result.next_review_at,
        }
        model_used = "sm2_fallback"

    # Create review log (includes user_answer and auto_rating fields)
    log = ReviewLog(
        user_id=user_id,
        vocabulary_id=review.vocabulary_id,
        rating=review.rating,
        ease_factor=result["ease_factor"],
        interval_days=result["interval_days"],
        repetitions=result["repetitions"],
        reviewed_at=datetime.now(timezone.utc),
        next_review_at=result["next_review_at"],
        response_time_ms=review.response_time_ms,
        direction=review.direction,
        session_id=review.session_id,
        user_answer=review.user_answer,
        auto_rating=review.auto_rating,
    )
    db.add(log)
    db.commit()
    db.refresh(log)

    print(f"[Flashcard] Review saved: vocab={review.vocabulary_id}, rating={review.rating}, "
          f"interval={result['interval_days']}d, ease={result['ease_factor']}, model={model_used}"
          f"{', auto_rating=' + str(review.auto_rating) if review.auto_rating else ''}"
          f"{', user_answer=' + repr(review.user_answer[:30]) if review.user_answer else ''}")

    return ReviewResult(
        vocabulary_id=review.vocabulary_id,
        rating=review.rating,
        new_interval_days=result["interval_days"],
        new_ease_factor=result["ease_factor"],
        new_repetitions=result["repetitions"],
        next_review_at=result["next_review_at"],
    )


@router.post("/train", response_model=TrainResponse)
def batch_train_model(
    req: TrainRequest,
    user_id: str = Query(..., description="User ID — trains on YOUR review data"),
    db: Session = Depends(get_db),
):
    """Batch train the TCGL model on accumulated review data.

    This fine-tunes the model using all your past review logs.
    The model learns patterns in your forgetting curves and
    adapts its predictions to your learning style.

    After training, the model is automatically saved to disk.
    """
    # Gather ALL review logs for this user
    user_reviews = (
        db.query(ReviewLog)
        .filter(ReviewLog.user_id == user_id)
        .order_by(ReviewLog.reviewed_at.asc())
        .limit(req.max_reviews)
        .all()
    )

    review_logs = [
        {
            "vocabulary_id": r.vocabulary_id,
            "rating": r.rating,
            "reviewed_at": r.reviewed_at.isoformat() if r.reviewed_at else None,
            "session_id": r.session_id,
            "ease_factor": r.ease_factor,
            "interval_days": r.interval_days,
            "repetitions": r.repetitions,
            "response_time_ms": r.response_time_ms,
            "direction": r.direction,
        }
        for r in user_reviews
    ]

    # Get only vocabulary items referenced in the reviews
    referenced_ids = list(set(r.vocabulary_id for r in user_reviews))
    relevant_vocab = db.query(Vocabulary).filter(Vocabulary.id.in_(referenced_ids)).all()
    vocab_items = [
        {
            "id": v.id,
            "difficulty_level": v.difficulty_level,
            "category": v.category,
            "part_of_speech": v.part_of_speech,
        }
        for v in relevant_vocab
    ]

    # Train!
    try:
        result = train_on_reviews(
            review_logs=review_logs,
            vocab_items=vocab_items,
            epochs=req.epochs,
            learning_rate=req.learning_rate,
        )
    except Exception as e:
        return TrainResponse(
            status="error",
            reason=f"Training failed: {str(e)}",
            reviews_used=len(review_logs),
        )

    return TrainResponse(**result)


@router.get("/model-info")
def get_model_info():
    """Get information about the active scheduling model."""
    return tcgl_model_info()


@router.get("/training-stats")
def get_train_stats():
    """Get detailed model training statistics."""
    return get_training_stats()


@router.get("/stats", response_model=UserStats)
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

    # Streak calculation
    streak = 0
    check_date = now.date()
    for i in range(365):
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


@router.get("/categories", response_model=list[CategoryProgress])
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
        total = (
            db.query(func.count(Vocabulary.id))
            .filter(Vocabulary.category == category)
            .scalar() or 0
        )

        learned = (
            db.query(func.count(func.distinct(ReviewLog.vocabulary_id)))
            .join(Vocabulary, ReviewLog.vocabulary_id == Vocabulary.id)
            .filter(
                ReviewLog.user_id == user_id,
                Vocabulary.category == category,
            )
            .scalar() or 0
        )

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
