"""Auto-grading module for comparing user-typed answers with correct translations.

Handles Vietnamese diacritics normalization and fuzzy matching using Levenshtein distance.
Designed for the flashcard system where users TYPE their answers instead of self-evaluating.

Grading logic:
- Exact match → rating 4 (Easy), accuracy 1.0
- Match ignoring Vietnamese diacritics → rating 3 (Good), accuracy 0.8
- Partial match (Levenshtein-based):
    - similarity >= 0.7 → rating 3 (Good), accuracy proportional
    - similarity >= 0.4 → rating 2 (Hard), accuracy proportional
    - similarity < 0.4 → rating 1 (Again), accuracy proportional
- No match at all → rating 1 (Again), accuracy 0.0
"""

import re
import unicodedata


def remove_vietnamese_diacritics(text: str) -> str:
    """Remove Vietnamese diacritical marks from text.

    Uses Unicode NFD normalization and filters out combining characters (category 'Mn').
    This allows "xin chao" to match "xin chào", "ca phe" to match "cà phê", etc.

    Args:
        text: Input string that may contain Vietnamese diacritics.

    Returns:
        String with diacritical marks removed.
    """
    # Normalize to decomposed form (base char + combining mark)
    normalized = unicodedata.normalize('NFD', text)
    # Filter out combining characters (category 'Mn' = Mark, Nonspacing)
    without_diacritics = ''.join(
        char for char in normalized
        if unicodedata.category(char) != 'Mn'
    )
    return without_diacritics


def normalize_string(text: str) -> str:
    """Normalize a string for comparison.

    Steps:
    1. Lowercase
    2. Trim whitespace
    3. Collapse multiple spaces into single space
    4. Strip leading/trailing whitespace again

    Args:
        text: Input string to normalize.

    Returns:
        Normalized string.
    """
    if not text:
        return ""
    # Lowercase
    result = text.lower()
    # Trim and collapse multiple spaces
    result = re.sub(r'\s+', ' ', result).strip()
    return result


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute the Levenshtein distance between two strings.

    Uses the classic dynamic programming approach with O(min(m,n)) space.
    No external dependencies required.

    The Levenshtein distance is the minimum number of single-character edits
    (insertions, deletions, or substitutions) required to change one string
    into the other.

    Args:
        s1: First string.
        s2: Second string.

    Returns:
        Integer edit distance between the two strings.
    """
    # Optimize: use the shorter string for the inner loop
    if len(s1) < len(s2):
        s1, s2 = s2, s1

    m, n = len(s1), len(s2)

    # Edge cases
    if n == 0:
        return m
    if m == 0:
        return n

    # Use two rows instead of full matrix for space efficiency
    previous_row = list(range(n + 1))

    for i in range(1, m + 1):
        current_row = [i]  # First column: deletion cost
        for j in range(1, n + 1):
            # Cost of substitution (0 if same char, 1 if different)
            substitution_cost = 0 if s1[i - 1] == s2[j - 1] else 1
            # Minimum of:
            # - Deletion (from previous row, same column + 1)
            # - Insertion (from current row, previous column + 1)
            # - Substitution (from previous row, previous column + cost)
            current_row.append(min(
                previous_row[j] + 1,        # deletion
                current_row[j - 1] + 1,      # insertion
                previous_row[j - 1] + substitution_cost  # substitution
            ))
        previous_row = current_row

    return previous_row[n]


def compute_similarity(s1: str, s2: str) -> float:
    """Compute similarity ratio between two strings using Levenshtein distance.

    Similarity = 1.0 - (distance / max_length)
    Returns a value between 0.0 and 1.0, where 1.0 means identical.

    Args:
        s1: First string.
        s2: Second string.

    Returns:
        Float similarity score between 0.0 and 1.0.
    """
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0

    distance = levenshtein_distance(s1, s2)
    return max(0.0, 1.0 - (distance / max_len))


def check_answer(user_answer: str, correct_answer: str, direction: str = "en_to_vi") -> dict:
    """Compare a user-typed answer against the correct translation.

    The grading logic applies multiple matching strategies in order:
    1. Exact match (after normalization) → rating 4 (Easy)
    2. Diacritics-ignored match → rating 3 (Good)
    3. Partial match using Levenshtein similarity
    4. No match → rating 1 (Again)

    For vi_to_en direction, both the Vietnamese answer and the Vietnamese correct
    answer have diacritics removed for the diacritics-ignored comparison.

    Args:
        user_answer: The answer typed by the user.
        correct_answer: The correct translation to compare against.
        direction: "en_to_vi" or "vi_to_en" — indicates which direction
                   the flashcard was testing.

    Returns:
        Dictionary with:
        - rating: int (1-4) — suggested SM-2 rating
        - accuracy: float (0.0-1.0) — how close the answer was
        - is_correct: bool — whether rating >= 3 (Good or better)
        - match_type: str — "exact", "diacritics_ignored", "partial", or "none"
        - similarity: float (0.0-1.0) — Levenshtein similarity score
        - normalized_user: str — normalized version of user's answer
        - normalized_correct: str — normalized version of correct answer
    """
    # Normalize both strings
    norm_user = normalize_string(user_answer)
    norm_correct = normalize_string(correct_answer)

    # ── 1. Exact match ────────────────────────────────────
    if norm_user == norm_correct:
        return {
            "rating": 4,
            "accuracy": 1.0,
            "is_correct": True,
            "match_type": "exact",
            "similarity": 1.0,
            "normalized_user": norm_user,
            "normalized_correct": norm_correct,
        }

    # ── 2. Diacritics-ignored match ───────────────────────
    norm_user_no_diacritics = remove_vietnamese_diacritics(norm_user)
    norm_correct_no_diacritics = remove_vietnamese_diacritics(norm_correct)

    if norm_user_no_diacritics == norm_correct_no_diacritics:
        return {
            "rating": 3,
            "accuracy": 0.8,
            "is_correct": True,
            "match_type": "diacritics_ignored",
            "similarity": 0.8,
            "normalized_user": norm_user,
            "normalized_correct": norm_correct,
        }

    # ── 3. Partial match (Levenshtein-based) ──────────────
    similarity = compute_similarity(norm_user_no_diacritics, norm_correct_no_diacritics)

    if similarity >= 0.7:
        # Good — close enough, minor errors
        rating = 3
        accuracy = similarity
    elif similarity >= 0.4:
        # Hard — significant errors but recognizable
        rating = 2
        accuracy = similarity
    else:
        # Again — too far off
        rating = 1
        accuracy = similarity

    match_type = "partial" if similarity > 0.0 else "none"

    return {
        "rating": rating,
        "accuracy": round(accuracy, 4),
        "is_correct": rating >= 3,
        "match_type": match_type,
        "similarity": round(similarity, 4),
        "normalized_user": norm_user,
        "normalized_correct": norm_correct,
    }


def get_accepted_answers(english: str, vietnamese: str) -> list[str]:
    """Compute a list of accepted answer variants for a vocabulary item.

    Includes:
    - The original Vietnamese translation (normalized)
    - The Vietnamese without diacritics
    - The original English word (normalized)
    - The English without diacritics (in case of borrowed words)

    Args:
        english: The English word/phrase.
        vietnamese: The Vietnamese word/phrase.

    Returns:
        List of unique accepted answer strings (normalized).
    """
    accepted = set()

    # Add normalized original forms
    norm_en = normalize_string(english)
    norm_vi = normalize_string(vietnamese)

    accepted.add(norm_en)
    accepted.add(norm_vi)

    # Add diacritics-stripped Vietnamese
    vi_no_diacritics = remove_vietnamese_diacritics(norm_vi)
    accepted.add(vi_no_diacritics)

    # Add diacritics-stripped English (for completeness)
    en_no_diacritics = remove_vietnamese_diacritics(norm_en)
    accepted.add(en_no_diacritics)

    # Remove empty strings
    accepted.discard("")

    return list(accepted)
