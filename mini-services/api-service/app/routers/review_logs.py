from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ReviewLog, User
from app.sm2 import calculate_sm2, performance_score_to_quality

router = APIRouter(prefix="/api/review-logs", tags=["review-logs"])


# --- Pydantic schemas ---


class ReviewLogCreateRequest(BaseModel):
    course_id: str
    lesson_id: str
    performance_score: float
    next_review_date: datetime | None = None
    interval_days: int = 1
    ease_factor: float = 2.5
    review_count: int = 0


class ReviewLogUpdateRequest(BaseModel):
    performance_score: float | None = None
    interval_days: int | None = None
    ease_factor: float | None = None
    next_review_date: datetime | None = None
    review_count: int | None = None


class CalculateNextRequest(BaseModel):
    performance_score: float  # 0.0 to 1.0


class ReviewLogResponse(BaseModel):
    id: str
    user_id: str
    course_id: str
    lesson_id: str
    review_date: datetime
    performance_score: float
    next_review_date: datetime
    interval_days: int
    ease_factor: float
    review_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CalculateNextResponse(BaseModel):
    id: str
    new_ease_factor: float
    new_interval_days: int
    new_repetition: int
    next_review_date: datetime
    performance_score: float


# --- Helpers ---


def review_log_to_response(log: ReviewLog) -> ReviewLogResponse:
    return ReviewLogResponse(
        id=log.id,
        user_id=log.user_id,
        course_id=log.course_id,
        lesson_id=log.lesson_id,
        review_date=log.review_date,
        performance_score=log.performance_score,
        next_review_date=log.next_review_date,
        interval_days=log.interval_days,
        ease_factor=log.ease_factor,
        review_count=log.review_count,
        created_at=log.created_at,
        updated_at=log.updated_at,
    )


# --- Endpoints ---


@router.post("", response_model=ReviewLogResponse, status_code=status.HTTP_201_CREATED)
def create_review_log(
    body: ReviewLogCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)

    next_review = body.next_review_date if body.next_review_date else now + timedelta(days=body.interval_days)

    log = ReviewLog(
        user_id=current_user.id,
        course_id=body.course_id,
        lesson_id=body.lesson_id,
        performance_score=body.performance_score,
        next_review_date=next_review,
        interval_days=body.interval_days,
        ease_factor=body.ease_factor,
        review_count=body.review_count,
        review_date=now,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return review_log_to_response(log)


@router.get("", response_model=list[ReviewLogResponse])
def get_review_logs(
    course_id: str | None = Query(None, description="Filter by course ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(ReviewLog).filter(ReviewLog.user_id == current_user.id)
    if course_id:
        query = query.filter(ReviewLog.course_id == course_id)
    logs = query.order_by(ReviewLog.created_at.desc()).all()
    return [review_log_to_response(log) for log in logs]


@router.get("/due", response_model=list[ReviewLogResponse])
def get_due_reviews(
    course_id: str | None = Query(None, description="Filter by course ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    query = db.query(ReviewLog).filter(
        ReviewLog.user_id == current_user.id,
        ReviewLog.next_review_date <= now,
    )
    if course_id:
        query = query.filter(ReviewLog.course_id == course_id)
    logs = query.order_by(ReviewLog.next_review_date.asc()).all()
    return [review_log_to_response(log) for log in logs]


@router.put("/{log_id}", response_model=ReviewLogResponse)
def update_review_log(
    log_id: str,
    body: ReviewLogUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = db.query(ReviewLog).filter(ReviewLog.id == log_id, ReviewLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review log not found",
        )

    if body.performance_score is not None:
        log.performance_score = body.performance_score
    if body.interval_days is not None:
        log.interval_days = body.interval_days
    if body.ease_factor is not None:
        log.ease_factor = body.ease_factor
    if body.next_review_date is not None:
        log.next_review_date = body.next_review_date
    if body.review_count is not None:
        log.review_count = body.review_count

    db.commit()
    db.refresh(log)
    return review_log_to_response(log)


@router.delete("/{log_id}", status_code=status.HTTP_200_OK)
def delete_review_log(
    log_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = db.query(ReviewLog).filter(ReviewLog.id == log_id, ReviewLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review log not found",
        )

    db.delete(log)
    db.commit()
    return {"message": "Review log deleted successfully"}


@router.post("/calculate-next", response_model=CalculateNextResponse)
def calculate_next_review(
    body: CalculateNextRequest,
    log_id: str = Query(..., description="Review log ID"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    log = db.query(ReviewLog).filter(ReviewLog.id == log_id, ReviewLog.user_id == current_user.id).first()
    if not log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review log not found",
        )

    # Convert performance_score to SM-2 quality
    quality = performance_score_to_quality(body.performance_score)

    # Run SM-2 algorithm
    new_ease_factor, new_interval, new_repetition = calculate_sm2(
        quality=quality,
        ease_factor=log.ease_factor,
        interval=log.interval_days,
        repetition=log.review_count,
    )

    # Calculate next review date
    now = datetime.now(timezone.utc)
    next_review_date = now + timedelta(days=new_interval)

    # Update the review log
    log.ease_factor = new_ease_factor
    log.interval_days = new_interval
    log.review_count = new_repetition
    log.performance_score = body.performance_score
    log.next_review_date = next_review_date
    log.review_date = now

    db.commit()
    db.refresh(log)

    return CalculateNextResponse(
        id=log.id,
        new_ease_factor=new_ease_factor,
        new_interval_days=new_interval,
        new_repetition=new_repetition,
        next_review_date=next_review_date,
        performance_score=body.performance_score,
    )
