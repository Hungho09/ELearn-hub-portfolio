"""Pydantic schemas for request/response validation."""

from datetime import datetime
from pydantic import BaseModel, Field


# ─── Vocabulary Schemas ───────────────────────────────────────────

class VocabularyBase(BaseModel):
    english: str
    vietnamese: str
    pronunciation: str | None = None
    example_english: str | None = None
    example_vietnamese: str | None = None
    part_of_speech: str | None = None
    difficulty_level: int = 1
    category: str | None = None


class VocabularyCreate(VocabularyBase):
    pass


class VocabularyResponse(VocabularyBase):
    id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class VocabularyCardResponse(BaseModel):
    """Minimal data for flashcard display."""
    id: int
    english: str
    vietnamese: str
    pronunciation: str | None = None
    example_english: str | None = None
    example_vietnamese: str | None = None
    part_of_speech: str | None = None
    category: str | None = None
    difficulty_level: int

    model_config = {"from_attributes": True}


# ─── Review Log Schemas ──────────────────────────────────────────

class ReviewSubmit(BaseModel):
    """Submit a review for a vocabulary card."""
    vocabulary_id: int
    rating: int = Field(ge=1, le=4, description="1=Again, 2=Hard, 3=Good, 4=Easy")
    direction: str = Field(default="en_to_vi", pattern="^(en_to_vi|vi_to_en)$")
    response_time_ms: int | None = None
    session_id: str | None = None


class ReviewLogResponse(BaseModel):
    id: int
    user_id: str
    vocabulary_id: int
    rating: int
    ease_factor: float
    interval_days: int
    repetitions: int
    reviewed_at: datetime
    next_review_at: datetime | None = None
    direction: str
    response_time_ms: int | None = None

    model_config = {"from_attributes": True}


# ─── Card State Schema ───────────────────────────────────────────

class CardState(BaseModel):
    """Current learning state for a vocabulary card."""
    vocabulary_id: int
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_at: datetime | None = None
    total_reviews: int = 0


# ─── Flashcard Session Schemas ────────────────────────────────────

class FlashcardSession(BaseModel):
    """A study session with cards to review and new cards."""
    due_cards: list[VocabularyCardResponse]
    new_cards: list[VocabularyCardResponse]
    total_due: int
    total_new: int
    total_learned: int


class ReviewResult(BaseModel):
    """Result after submitting a review."""
    vocabulary_id: int
    rating: int
    new_interval_days: int
    new_ease_factor: float
    new_repetitions: int
    next_review_at: datetime | None = None


# ─── Stats Schemas ───────────────────────────────────────────────

class UserStats(BaseModel):
    """User learning statistics."""
    total_reviews: int
    total_unique_words: int
    average_ease_factor: float
    words_mastered: int  # ease_factor >= 2.5 and interval >= 21
    words_learning: int  # has reviews but not mastered
    words_new: int  # no reviews yet
    streak_days: int
    reviews_today: int


class CategoryProgress(BaseModel):
    """Progress by vocabulary category."""
    category: str
    total_words: int
    learned_words: int
    mastered_words: int
    average_ease_factor: float
