"""Gamification logic — XP calculation, level-up, and badge unlocks.

Pure logic module, no database dependencies. All functions take
simple values and return results; the caller handles persistence.
"""

from datetime import datetime, timezone
from typing import Optional


# ─── Badge codes ──────────────────────────────────────────────────

FIRST_BLOOD = "FIRST_BLOOD"
STREAK_3 = "STREAK_3"
STREAK_7 = "STREAK_7"
MASTER_10 = "MASTER_10"
SCHOLAR_100 = "SCHOLAR_100"
NIGHT_OWL = "NIGHT_OWL"

ALL_BADGE_CODES = [FIRST_BLOOD, STREAK_3, STREAK_7, MASTER_10, SCHOLAR_100, NIGHT_OWL]

BADGE_LABELS = {
    FIRST_BLOOD: "Bước chân đầu tiên",
    STREAK_3: "Lính mới chăm chỉ",
    STREAK_7: "Chiến binh kỷ luật",
    MASTER_10: "Bậc thầy nhập môn",
    SCHOLAR_100: "Học giả kiên trì",
    NIGHT_OWL: "Cú đêm",
}


# ─── XP calculation ──────────────────────────────────────────────

# Maps rating (1-4) to base XP
RATING_BASE_XP = {1: 5, 2: 10, 3: 20, 4: 30}


def calculate_xp(rating: int, difficulty_level: int = 1) -> int:
    """Calculate total XP earned for a review.

    Args:
        rating: 1=Again, 2=Hard, 3=Good, 4=Easy
        difficulty_level: 1=beginner, 2=intermediate, 3=advanced

    Returns:
        Total XP (base + bonus), or 0 for invalid rating.
    """
    if rating not in RATING_BASE_XP:
        return 0
    base = RATING_BASE_XP[rating]
    # Bonus XP = difficulty_level * 5, capped at 15 (max difficulty 3)
    bonus = min(difficulty_level * 5, 15)
    return base + bonus


# ─── Level calculation ───────────────────────────────────────────

def next_level_xp(current_level: int) -> int:
    """Calculate XP required for the next level.

    Formula: (level^2) * 50 + 50

    Examples:
        Level 1 → 2: needs 100 XP
        Level 2 → 3: needs 250 XP
        Level 3 → 4: needs 500 XP
    """
    return (current_level ** 2) * 50 + 50


def calculate_new_level(xp_points: int, current_level: int) -> tuple[int, int]:
    """Check if user levels up, handling multi-level jumps.

    Args:
        xp_points: User's current total XP (after adding earned XP)
        current_level: User's current level

    Returns:
        Tuple of (new_level, levels_gained)
    """
    levels_gained = 0
    level = current_level
    while level < 50 and xp_points >= next_level_xp(level):
        xp_points -= next_level_xp(level)
        level += 1
        levels_gained += 1
    return level, levels_gained


# ─── Badge checking ──────────────────────────────────────────────

class BadgeCheckResult:
    """Result of badge eligibility check."""

    def __init__(self):
        self.new_badges: list[str] = []
        self.unlocked: dict[str, dict] = {}  # badge_code → {reason, timestamp}

    def add(self, code: str, reason: str):
        if code not in self.unlocked:
            self.new_badges.append(code)
            self.unlocked[code] = {
                "reason": reason,
                "unlocked_at": datetime.now(timezone.utc),
            }


def check_badges(
    user_id: str,
    old_badges: set[str],
    *,
    total_reviews: int = 0,
    is_first_review: bool = False,
    streak_days: int = 0,
    mastered_words: int = 0,
    hour_of_day: Optional[int] = None,
) -> BadgeCheckResult:
    """Check which badges should be unlocked based on current stats.

    Args:
        user_id: The user's ID
        old_badges: Set of badge codes the user already has
        total_reviews: Total number of reviews completed
        is_first_review: True if this is the very first review
        streak_days: Current consecutive-day streak
        mastered_words: Number of mastered vocabulary items
        hour_of_day: Hour (0-23) in UTC, or None to use current time

    Returns:
        BadgeCheckResult with newly eligible badges
    """
    result = BadgeCheckResult()

    # FIRST_BLOOD: First review ever
    if is_first_review and FIRST_BLOOD not in old_badges:
        result.add(FIRST_BLOOD, "Completed first review")

    # STREAK_3: 3-day streak
    if streak_days >= 3 and STREAK_3 not in old_badges:
        result.add(STREAK_3, f"3-day streak ({streak_days} days)")

    # STREAK_7: 7-day streak
    if streak_days >= 7 and STREAK_7 not in old_badges:
        result.add(STREAK_7, f"7-day streak ({streak_days} days)")

    # MASTER_10: 10 mastered words
    if mastered_words >= 10 and MASTER_10 not in old_badges:
        result.add(MASTER_10, f"{mastered_words} words mastered")

    # SCHOLAR_100: 100 total reviews
    if total_reviews >= 100 and SCHOLAR_100 not in old_badges:
        result.add(SCHOLAR_100, f"{total_reviews} total reviews")

    # NIGHT_OWL: Review between 22:00 and 04:00 UTC
    if hour_of_day is not None:
        if hour_of_day >= 22 or hour_of_day < 4:
            if NIGHT_OWL not in old_badges:
                result.add(NIGHT_OWL, f"Reviewed at {hour_of_day:02d}:00 UTC")

    return result