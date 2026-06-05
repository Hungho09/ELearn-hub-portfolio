"""SM-2 Spaced Repetition Algorithm implementation.

Based on the SuperMemo SM-2 algorithm by Piotr Wozniak.
Adapted for flashcard vocabulary learning with 4-level rating system.

Rating scale:
- 1 (Again): Complete failure, reset progress
- 2 (Hard): Difficult recall, short interval
- 3 (Good): Successful recall, standard interval
- 4 (Easy): Perfect recall, longer interval
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass
class SM2Result:
    """Result of SM-2 algorithm calculation."""
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review_at: datetime


def calculate_sm2(
    rating: int,
    current_ease_factor: float = 2.5,
    current_interval: int = 0,
    current_repetitions: int = 0,
) -> SM2Result:
    """
    Calculate the next review parameters using SM-2 algorithm.

    Args:
        rating: User's recall quality (1=Again, 2=Hard, 3=Good, 4=Easy)
        current_ease_factor: Current ease factor (minimum 1.3)
        current_interval: Current interval in days
        current_repetitions: Number of successful repetitions

    Returns:
        SM2Result with updated parameters and next review date
    """
    ease = max(current_ease_factor, 1.3)
    interval = current_interval
    repetitions = current_repetitions

    if rating >= 3:
        # Successful recall
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(current_interval * ease)

        repetitions += 1
    else:
        # Failed recall - reset
        repetitions = 0
        interval = 1

    # Adjust ease factor based on rating
    # EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
    # Adapted for 4-level scale (mapped to SM-2's 0-5 scale)
    q_map = {1: 0, 2: 2, 3: 4, 4: 5}
    q = q_map.get(rating, 3)
    ease_delta = 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
    ease = max(ease + ease_delta, 1.3)

    # Hard rating: reduce interval slightly
    if rating == 2:
        interval = max(round(current_interval * 1.2), 1)

    # Easy rating: bonus interval
    if rating == 4 and current_repetitions > 0:
        interval = round(interval * 1.3)

    # Cap maximum interval at 365 days
    interval = min(interval, 365)

    next_review_at = datetime.now(timezone.utc) + timedelta(days=interval)

    return SM2Result(
        ease_factor=round(ease, 2),
        interval_days=interval,
        repetitions=repetitions,
        next_review_at=next_review_at,
    )


def get_initial_state() -> dict:
    """Get initial learning state for a new card."""
    return {
        "ease_factor": 2.5,
        "interval_days": 0,
        "repetitions": 0,
        "next_review_at": None,
    }
