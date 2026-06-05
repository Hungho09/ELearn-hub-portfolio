"""Review logs router - Review log access for ML model training.

Endpoints:
- GET /api/review-logs/{user_id}       - Get review logs for ML model
- GET /api/review-logs/{user_id}/export - Export all logs as JSON
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import ReviewLog
from schemas import ReviewLogResponse

router = APIRouter(prefix="/api/review-logs", tags=["Review Logs (ML)"])


@router.get("/{user_id}", response_model=list[ReviewLogResponse])
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

    logs = query.order_by(ReviewLog.reviewed_at.desc()).offset(skip).limit(limit).all()

    return [ReviewLogResponse(
        id=log.id,
        user_id=log.user_id,
        vocabulary_id=log.vocabulary_id,
        rating=log.rating,
        ease_factor=log.ease_factor,
        interval_days=log.interval_days,
        repetitions=log.repetitions,
        reviewed_at=log.reviewed_at,
        next_review_at=log.next_review_at,
        response_time_ms=log.response_time_ms,
        direction=log.direction,
        session_id=log.session_id,
    ) for log in logs]


@router.get("/{user_id}/export")
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
