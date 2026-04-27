"""SQLAlchemy models for the flashcard service.

Models:
- Vocabulary: English-Vietnamese word pairs with metadata
- ReviewLog: Spaced repetition review records for ML model consumption

Designed to be PostgreSQL-compatible. Switch the engine in database.py to use PostgreSQL.
"""

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Vocabulary(Base):
    """English-Vietnamese vocabulary pairs for flashcard learning."""

    __tablename__ = "vocabulary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    english: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    vietnamese: Mapped[str] = mapped_column(String(255), nullable=False)
    pronunciation: Mapped[str] = mapped_column(String(255), nullable=True, comment="IPA or phonetic spelling")
    example_english: Mapped[str] = mapped_column(Text, nullable=True, comment="Example sentence in English")
    example_vietnamese: Mapped[str] = mapped_column(Text, nullable=True, comment="Example sentence in Vietnamese")
    part_of_speech: Mapped[str] = mapped_column(String(50), nullable=True, comment="noun, verb, adjective, etc.")
    difficulty_level: Mapped[int] = mapped_column(Integer, default=1, comment="1=beginner, 2=intermediate, 3=advanced")
    category: Mapped[str] = mapped_column(String(100), nullable=True, comment="topic category: food, travel, etc.")
    audio_url: Mapped[str] = mapped_column(String(500), nullable=True, comment="URL to pronunciation audio")
    image_url: Mapped[str] = mapped_column(String(500), nullable=True, comment="URL to associated image")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationship to review logs
    review_logs: Mapped[list["ReviewLog"]] = relationship(
        "ReviewLog", back_populates="vocabulary", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Vocabulary(id={self.id}, english='{self.english}', vietnamese='{self.vietnamese}')>"


class ReviewLog(Base):
    """Spaced repetition review logs - primary data source for ML model.

    Stores every review attempt with SM-2 algorithm parameters.
    The ML model can read these logs to:
    - Analyze forgetting curves
    - Optimize review scheduling
    - Predict vocabulary difficulty
    - Personalize review intervals
    """

    __tablename__ = "review_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False, index=True, comment="User ID from NextAuth")
    vocabulary_id: Mapped[int] = mapped_column(Integer, ForeignKey("vocabulary.id"), nullable=False)

    # SM-2 Algorithm Parameters
    rating: Mapped[int] = mapped_column(Integer, nullable=False, comment="1=Again, 2=Hard, 3=Good, 4=Easy")
    ease_factor: Mapped[float] = mapped_column(Float, default=2.5, comment="SM-2 ease factor (>=1.3)")
    interval_days: Mapped[int] = mapped_column(Integer, default=0, comment="Days until next review")
    repetitions: Mapped[int] = mapped_column(Integer, default=0, comment="Number of successful repetitions")

    # Timing data
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    next_review_at: Mapped[datetime] = mapped_column(DateTime, nullable=True, comment="Scheduled next review time")
    response_time_ms: Mapped[int] = mapped_column(Integer, nullable=True, comment="Time taken to answer in ms")

    # Review context
    direction: Mapped[str] = mapped_column(
        String(20), default="en_to_vi",
        comment="en_to_vi or vi_to_en - which direction was tested"
    )
    session_id: Mapped[str] = mapped_column(String(255), nullable=True, comment="Study session identifier")

    # Relationship
    vocabulary: Mapped["Vocabulary"] = relationship("Vocabulary", back_populates="review_logs")

    # Indexes for ML model queries
    __table_args__ = (
        Index("idx_review_user_vocab", "user_id", "vocabulary_id"),
        Index("idx_review_user_next", "user_id", "next_review_at"),
        Index("idx_review_user_reviewed", "user_id", "reviewed_at"),
    )

    def __repr__(self):
        return f"<ReviewLog(id={self.id}, user_id='{self.user_id}', vocab_id={self.vocabulary_id}, rating={self.rating})>"
