"""Integration tests for the gamification system wired into FastAPI endpoints."""

import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from main import app
from database import Base, get_db
from models import User, Vocabulary, ReviewLog
from gamification import (
    calculate_xp,
    FIRST_BLOOD,
    STREAK_3,
    STREAK_7,
    MASTER_10,
    SCHOLAR_100,
    NIGHT_OWL,
)

TEST_DB_URL = "sqlite:///./test_integration.db"
_test_engine = create_engine(TEST_DB_URL, echo=False, connect_args={"check_same_thread": False})
TestingSessionFactory = sessionmaker(bind=_test_engine)


def override_get_db():
    db = TestingSessionFactory()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


# ─── Fixtures ────────────────────────────────────────────────────

@pytest.fixture(scope="function", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=_test_engine)
    yield
    Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture(scope="function")
def db_session():
    db = TestingSessionFactory()
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


client = TestClient(app)


# ─── Helpers ──────────────────────────────────────────────────────

def create_user_with_xp(db, xp_points: int, level: int):
    """Create or update test user with specific XP and level."""
    user = db.query(User).filter(User.id == "test_user_123").first()
    if not user:
        user = User(
            id="test_user_123",
            email="test@gamify.dev",
            name="Test User",
            password="hashed_pw",
            xp_points=xp_points,
            current_level=level,
        )
        db.add(user)
    else:
        user.xp_points = xp_points
        user.current_level = level
    db.commit()
    db.refresh(user)
    return user


def create_vocab(db, difficulty: int = 1):
    vocab = Vocabulary(
        english="hello",
        vietnamese="xin chao",
        difficulty_level=difficulty,
        category="Greetings",
    )
    db.add(vocab)
    db.commit()
    db.refresh(vocab)
    return vocab


# ─── Stats endpoint returns gamification fields ──────────────────

class TestStatsEndpoint:
    def test_stats_includes_xp_and_level(self, db_session):
        create_user_with_xp(db_session, xp_points=350, level=3)
        create_vocab(db_session, difficulty=2)

        res = client.get("/api/flashcards/stats?user_id=test_user_123")
        assert res.status_code == 200
        data = res.json()
        assert "xpPoints" in data
        assert "currentLevel" in data
        assert "nextLevelXp" in data
        assert data["xpPoints"] == 350
        assert data["currentLevel"] == 3
        assert data["nextLevelXp"] == 500  # (3^2)*50 + 50

    def test_stats_new_user_has_zero_xp_level_1(self, db_session):
        create_user_with_xp(db_session, xp_points=0, level=1)
        create_vocab(db_session)

        res = client.get("/api/flashcards/stats?user_id=test_user_123")
        assert res.status_code == 200
        data = res.json()
        assert data["xpPoints"] == 0
        assert data["currentLevel"] == 1
        assert data["nextLevelXp"] == 100


# ─── Review endpoint awards XP ───────────────────────────────────

class TestReviewXP:
    def test_review_returns_xp_earned(self, db_session):
        create_user_with_xp(db_session, xp_points=0, level=1)
        vocab = create_vocab(db_session, difficulty=2)

        # Rating 3 (Good), difficulty 2: base 20 + bonus 10 = 30
        res = client.post(
            "/api/flashcards/review?user_id=test_user_123",
            json={
                "vocabulary_id": vocab.id,
                "rating": 3,
                "direction": "en_to_vi",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["xpEarned"] == 30
        assert "unlockedBadges" in data
        assert data["unlockedBadges"] == [FIRST_BLOOD]

    def test_review_easy_max_difficulty_bonus(self, db_session):
        create_user_with_xp(db_session, xp_points=0, level=1)
        vocab = create_vocab(db_session, difficulty=3)

        # Rating 4 (Easy), difficulty 3: base 30 + bonus 15 = 45
        res = client.post(
            "/api/flashcards/review?user_id=test_user_123",
            json={
                "vocabulary_id": vocab.id,
                "rating": 4,
                "direction": "en_to_vi",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["xpEarned"] == 45

    def test_review_invalid_rating_awards_zero_xp(self, db_session):
        create_user_with_xp(db_session, xp_points=0, level=1)
        vocab = create_vocab(db_session, difficulty=1)

        res = client.post(
            "/api/flashcards/review?user_id=test_user_123",
            json={
                "vocabulary_id": vocab.id,
                "rating": 0,
                "direction": "en_to_vi",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["xpEarned"] == 0


# ─── Level-up integration ────────────────────────────────────────

class TestLevelUp:
    def test_multi_level_jump(self, db_session):
        """User at L1 with 0 XP earns 1000+ XP → should jump to L4+."""
        create_user_with_xp(db_session, xp_points=0, level=1)
        vocab = create_vocab(db_session, difficulty=3)  # max bonus

        # Each review: rating=4, difficulty=3 → 45 XP. 23 reviews = 1035 XP
        for _ in range(23):
            res = client.post(
                "/api/flashcards/review?user_id=test_user_123",
                json={
                    "vocabulary_id": vocab.id,
                    "rating": 4,
                    "direction": "en_to_vi",
                },
            )
            data = res.json()

        # Verify user's level jumped (100 + 250 + 500 = 850 for L4)
        res = client.get("/api/flashcards/stats?user_id=test_user_123")
        data = res.json()
        assert data["currentLevel"] >= 4

    def test_exact_threshold_level_up(self, db_session):
        """105 XP from L1 should reach L2 (threshold = 100)."""
        create_user_with_xp(db_session, xp_points=0, level=1)
        vocab = create_vocab(db_session, difficulty=1)  # 35 XP per rating=4

        # 3 reviews × 35 = 105 XP ≥ 100 threshold
        for _ in range(3):
            client.post(
                "/api/flashcards/review?user_id=test_user_123",
                json={
                    "vocabulary_id": vocab.id,
                    "rating": 4,
                    "direction": "en_to_vi",
                },
            )

        res = client.get("/api/flashcards/stats?user_id=test_user_123")
        data = res.json()
        assert data["currentLevel"] >= 2


# ─── Badge unlock integration ────────────────────────────────────

class TestBadgeUnlocks:
    def test_first_blood_on_first_review(self, db_session):
        create_user_with_xp(db_session, xp_points=0, level=1)
        vocab = create_vocab(db_session)

        res = client.post(
            "/api/flashcards/review?user_id=test_user_123",
            json={
                "vocabulary_id": vocab.id,
                "rating": 3,
                "direction": "en_to_vi",
            },
        )
        data = res.json()
        assert FIRST_BLOOD in data["unlockedBadges"]

    def test_no_duplicate_badges(self, db_session):
        create_user_with_xp(db_session, xp_points=0, level=1)
        vocab = create_vocab(db_session)

        # First review
        res = client.post(
            "/api/flashcards/review?user_id=test_user_123",
            json={
                "vocabulary_id": vocab.id,
                "rating": 3,
                "direction": "en_to_vi",
            },
        )
        first_badges = set(res.json()["unlockedBadges"])

        # Second review — should NOT return FIRST_BLOOD again
        res = client.post(
            "/api/flashcards/review?user_id=test_user_123",
            json={
                "vocabulary_id": vocab.id,
                "rating": 3,
                "direction": "en_to_vi",
            },
        )
        second_badges = set(res.json()["unlockedBadges"])
        assert FIRST_BLOOD not in second_badges
        assert first_badges & second_badges == set()