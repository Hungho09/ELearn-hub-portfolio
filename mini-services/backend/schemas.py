"""Pydantic schemas for request/response validation."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ─── Auth Schemas ────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    email: str = Field(..., min_length=1, max_length=255)
    password: str = Field(..., min_length=6, max_length=255)


class RegisterResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    role: str = "user"
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class LoginVerifyRequest(BaseModel):
    """Used by Next.js to verify credentials before creating NextAuth session."""
    email: str
    password: str


class LoginVerifyResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    role: str = "user"


# ─── User Schemas ────────────────────────────────────────────────

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str] = None
    avatar: Optional[str] = None
    bio: Optional[str] = None
    role: str = "user"
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class AvatarUploadResponse(BaseModel):
    avatarUrl: str


# ─── Vocabulary Schemas ──────────────────────────────────────────

class VocabularyCreate(BaseModel):
    english: str
    vietnamese: str
    pronunciation: Optional[str] = None
    example_english: Optional[str] = None
    example_vietnamese: Optional[str] = None
    part_of_speech: Optional[str] = None
    difficulty_level: int = Field(default=1, ge=1, le=3)
    category: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None


class VocabularyResponse(BaseModel):
    id: int
    english: str
    vietnamese: str
    pronunciation: Optional[str] = None
    example_english: Optional[str] = None
    example_vietnamese: Optional[str] = None
    part_of_speech: Optional[str] = None
    difficulty_level: int = 1
    category: Optional[str] = None
    audio_url: Optional[str] = None
    image_url: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class VocabularyCardResponse(BaseModel):
    """Flashcard format matching the frontend VocabCard interface."""
    id: int
    english: str
    vietnamese: str
    pronunciation: Optional[str] = None
    example_english: Optional[str] = None
    example_vietnamese: Optional[str] = None
    part_of_speech: Optional[str] = None
    category: Optional[str] = None
    difficulty_level: int = 1
    accepted_answers: list[str] = Field(default_factory=list, description="Alternative accepted answers")


# ─── Flashcard Session Schemas ───────────────────────────────────

class FlashcardSession(BaseModel):
    due_cards: list[VocabularyCardResponse]
    new_cards: list[VocabularyCardResponse]
    total_due: int
    total_new: int
    total_learned: int


class ReviewSubmit(BaseModel):
    vocabulary_id: int
    rating: int = Field(..., ge=1, le=4)
    direction: str = Field(default="en_to_vi", pattern="^(en_to_vi|vi_to_en)$")
    response_time_ms: Optional[int] = None
    session_id: Optional[str] = None
    user_answer: Optional[str] = None  # Typed answer for auto-grading
    auto_rating: Optional[bool] = None  # Whether the rating was auto-computed (frontend sends true/false)


class ReviewResult(BaseModel):
    vocabulary_id: int
    rating: int
    new_interval_days: int
    new_ease_factor: float
    new_repetitions: int
    next_review_at: Optional[datetime] = None


class ReviewLogResponse(BaseModel):
    id: int
    user_id: str
    vocabulary_id: int
    rating: int
    ease_factor: float
    interval_days: int
    repetitions: int
    reviewed_at: datetime
    next_review_at: Optional[datetime] = None
    response_time_ms: Optional[int] = None
    direction: str
    session_id: Optional[str] = None

    class Config:
        from_attributes = True


# ─── Stats Schemas ───────────────────────────────────────────────

class UserStats(BaseModel):
    total_reviews: int
    total_unique_words: int
    average_ease_factor: float
    words_mastered: int
    words_learning: int
    words_new: int
    streak_days: int
    reviews_today: int


class CategoryProgress(BaseModel):
    category: str
    total_words: int
    learned_words: int
    mastered_words: int
    average_ease_factor: float


# ─── Auto-Grading Schemas ─────────────────────────────────────────

class CheckAnswerRequest(BaseModel):
    """Request to check a typed answer against the correct translation."""
    vocabulary_id: int
    user_answer: str = Field(..., min_length=1, max_length=500)
    direction: str = Field(default="en_to_vi", pattern="^(en_to_vi|vi_to_en)$")


class CheckAnswerResponse(BaseModel):
    """Response from auto-grading a typed answer."""
    vocabulary_id: int
    correct_answer: str
    user_answer: str
    rating: int
    accuracy: float
    is_correct: bool
    match_type: str
    similarity: float
    pronunciation: Optional[str] = None
    example_english: Optional[str] = None
    example_vietnamese: Optional[str] = None


# ─── Vocabulary Enrich Schemas ────────────────────────────────────

class EnrichRequest(BaseModel):
    """Request to enrich vocabulary from external APIs."""
    count: int = Field(default=10, ge=1, le=50, description="Number of words to add")
    level: Optional[int] = Field(default=None, ge=1, le=3, description="Difficulty level filter")


class EnrichResponse(BaseModel):
    """Response from vocabulary enrichment."""
    added: int
    skipped: int
    errors: int
    items: list[VocabularyResponse]


class CategoryInfo(BaseModel):
    """Category with word count."""
    category: str
    word_count: int
