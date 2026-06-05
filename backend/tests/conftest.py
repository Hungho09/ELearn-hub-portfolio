"""Shared fixtures for gamification integration tests."""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from database import Base
from models import User, Vocabulary

TEST_DB_URL = "sqlite:///./test_integration.db"

test_engine = create_engine(TEST_DB_URL, echo=False, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=test_engine)


@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_user(db_session):
    user = User(
        id="test_user_123",
        email="test@gamify.dev",
        name="Test User",
        password="hashed_pw",
        xp_points=0,
        current_level=1,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture(scope="function")
def test_vocab(db_session):
    vocab = Vocabulary(
        english="hello",
        vietnamese="xin chao",
        difficulty_level=2,
        category="Greetings",
    )
    db_session.add(vocab)
    db_session.commit()
    db_session.refresh(vocab)
    return vocab