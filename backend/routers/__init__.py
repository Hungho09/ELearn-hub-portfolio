"""API routers for the LearnHub backend.

Each router handles a specific domain:
- auth: User registration and credential verification
- user: Profile management and avatar upload
- flashcard: Spaced repetition flashcard sessions
- vocabulary: Vocabulary CRUD operations
- review_logs: Review log access for ML model training
"""

from routers.auth import router as auth_router
from routers.user import router as user_router
from routers.focus import router as focus_router
from routers.flashcard import router as flashcard_router
from routers.vocabulary import router as vocabulary_router
from routers.review_logs import router as review_logs_router

__all__ = [
    "auth_router",
    "user_router",
    "focus_router",
    "flashcard_router",
    "vocabulary_router",
    "review_logs_router",
]
