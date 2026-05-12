"""SQLAlchemy models for the API service.

Models:
- User: Application users (shared with NextAuth)
- Vocabulary: English-Vietnamese word pairs with metadata
- ReviewLog: Spaced repetition review records for ML model consumption

Designed to be PostgreSQL-compatible. Switch the engine in database.py to use PostgreSQL.
"""

from datetime import datetime, timezone
from sqlalchemy import String, Integer, Float, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class User(Base):
    """Application user model - compatible with NextAuth.js."""

    __tablename__ = "user"

    id: Mapped[str] = mapped_column(String(255), primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=True)
    password: Mapped[str] = mapped_column(String(255), nullable=True, comment="bcrypt hashed password")
    avatar: Mapped[str] = mapped_column(String(500), nullable=True)
    bio: Mapped[str] = mapped_column(Text, nullable=True)
    role: Mapped[str] = mapped_column(String(50), default="user")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    review_logs: Mapped[list["ReviewLog"]] = relationship(
        "ReviewLog", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User(id='{self.id}', email='{self.email}', name='{self.name}')>"

    def to_dict(self, exclude_password=True):
        """Convert to dictionary, optionally excluding password."""
        data = {
            "id": self.id,
            "email": self.email,
            "name": self.name,
            "avatar": self.avatar,
            "bio": self.bio,
            "role": self.role,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
        if not exclude_password:
            data["password"] = self.password
        return data


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

    def to_card_dict(self):
        """Convert to flashcard format matching the frontend interface."""
        return {
            "id": self.id,
            "english": self.english,
            "vietnamese": self.vietnamese,
            "pronunciation": self.pronunciation,
            "example_english": self.example_english,
            "example_vietnamese": self.example_vietnamese,
            "part_of_speech": self.part_of_speech,
            "category": self.category,
            "difficulty_level": self.difficulty_level,
        }

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
    user_id: Mapped[str] = mapped_column(String(255), ForeignKey("user.id"), nullable=False, index=True)
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

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="review_logs")
    vocabulary: Mapped["Vocabulary"] = relationship("Vocabulary", back_populates="review_logs")

    # Indexes for ML model queries
    __table_args__ = (
        Index("idx_review_user_vocab", "user_id", "vocabulary_id"),
        Index("idx_review_user_next", "user_id", "next_review_at"),
        Index("idx_review_user_reviewed", "user_id", "reviewed_at"),
    )

    def __repr__(self):
        return f"<ReviewLog(id={self.id}, user_id='{self.user_id}', vocab_id={self.vocabulary_id}, rating={self.rating})>"
