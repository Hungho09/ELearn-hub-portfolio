from app.database import Base, engine


def init_db():
    """Create all tables in the database."""
    print("Creating database tables...")
    # Import models so they are registered with Base.metadata
    from app.models import User, ReviewLog  # noqa: F401

    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()
