"""Database configuration and session management for the flashcard service.

Uses SQLAlchemy with SQLite (PostgreSQL-ready design).
To switch to PostgreSQL, change the DATABASE_URL and install psycopg2.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# SQLite for development - switch to PostgreSQL for production:
# DATABASE_URL = "postgresql://user:password@localhost:5432/learnhub"
DATABASE_URL = "sqlite:///./flashcard.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite specific
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
