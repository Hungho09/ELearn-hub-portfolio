"""Database configuration and session management.

Uses SQLAlchemy with SQLite (PostgreSQL-ready design).
To switch to PostgreSQL, set PYTHON_DATABASE_URL to a PostgreSQL URL and install psycopg2.
This database is shared with the ML model for review log analysis.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# SQLite for development - switch to PostgreSQL for production:
# PYTHON_DATABASE_URL = "postgresql://user:password@localhost:5432/learnhub"
#
# When migrating to PostgreSQL, both this service and the ML model
# will share the same database.
# NOTE: We use PYTHON_DATABASE_URL to avoid conflict with Prisma's DATABASE_URL
#       (Prisma uses a different URL format that SQLAlchemy can't parse)
PYTHON_DATABASE_URL = os.environ.get("PYTHON_DATABASE_URL", "sqlite:///./learnhub.db")

engine_kwargs = {}
if PYTHON_DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(PYTHON_DATABASE_URL, echo=False, **engine_kwargs)

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
