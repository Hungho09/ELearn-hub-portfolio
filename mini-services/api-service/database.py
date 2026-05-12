"""Database configuration and session management for the API service.

Uses SQLAlchemy with SQLite (PostgreSQL-ready design).
To switch to PostgreSQL, change the DATABASE_URL and install psycopg2.
This database is shared with the ML model for review log analysis.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# SQLite for development - switch to PostgreSQL for production:
# DATABASE_URL = "postgresql://user:password@localhost:5432/learnhub"
#
# Note: We use a SEPARATE database from the Next.js Prisma app.
# The Prisma DATABASE_URL (file:/path/to/custom.db) is not compatible with SQLAlchemy.
# When migrating to PostgreSQL, both services will share the same database.
DATABASE_URL = "sqlite:///./learnhub.db"

engine_kwargs = {}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, echo=False, **engine_kwargs)

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
