def performance_score_to_quality(score: float) -> int:
    """
    Convert a performance score (0.0-1.0) to an SM-2 quality rating (0-5).

    0.0-0.2  -> 0 (complete blackout)
    0.2-0.4  -> 1 (incorrect; but remembered upon seeing the answer)
    0.4-0.6  -> 2 (incorrect; but the answer seemed easy to recall)
    0.6-0.75 -> 3 (correct with serious difficulty)
    0.75-0.9 -> 4 (correct after hesitation)
    0.9-1.0  -> 5 (perfect response)
    """
    if score < 0.2:
        return 0
    elif score < 0.4:
        return 1
    elif score < 0.6:
        return 2
    elif score < 0.75:
        return 3
    elif score < 0.9:
        return 4
    else:
        return 5


def calculate_sm2(
    quality: int,
    ease_factor: float,
    interval: int,
    repetition: int,
) -> tuple[float, int, int]:
    """
    SM-2 Algorithm by Piotr Wozniak.

    quality: 0-5 rating
        0 = complete blackout
        1 = incorrect; remembered upon seeing the answer
        2 = incorrect; the answer seemed easy to recall
        3 = correct with serious difficulty
        4 = correct after hesitation
        5 = perfect response
    ease_factor: current ease factor (>= 1.3)
    interval: current interval in days
    repetition: current repetition count

    Returns: (new_ease_factor, new_interval, new_repetition)
    """
    # Ensure minimum ease factor
    if ease_factor < 1.3:
        ease_factor = 1.3

    if quality >= 3:
        # Correct response
        if repetition == 0:
            new_interval = 1
        elif repetition == 1:
            new_interval = 6
        else:
            new_interval = round(interval * ease_factor)
        new_repetition = repetition + 1
    else:
        # Incorrect response – reset repetition
        new_repetition = 0
        new_interval = 1

    # Update ease factor
    new_ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    # Ensure minimum ease factor
    if new_ease_factor < 1.3:
        new_ease_factor = 1.3

    return (new_ease_factor, new_interval, new_repetition)
