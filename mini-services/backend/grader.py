"""Auto-grading module for comparing user-typed answers with correct translations.

Uses LaBSE (Language-agnostic BERT Sentence Embedding) for semantic similarity,
with fallback to Levenshtein distance if the model is unavailable.

LaBSE excels at cross-lingual semantic matching:
- "Xin chào" vs "Hello" → 0.92 (same meaning ✅)
- "Xin chào" vs "Goodbye" → 0.69 (different meaning)
- "Đẹp" vs "Beautiful" → 0.96 (same meaning ✅)
- "Đẹp" vs "Xấu" → 0.54 (opposite meaning)

Grading logic (LaBSE mode):
- Exact match → rating 4 (Easy), accuracy 1.0
- Match ignoring Vietnamese diacritics → rating 4 (Easy), accuracy 0.95
- LaBSE semantic similarity:
    - similarity >= 0.85 → rating 4 (Easy), accuracy proportional
    - similarity >= 0.70 → rating 3 (Good), accuracy proportional
    - similarity >= 0.50 → rating 2 (Hard), accuracy proportional
    - similarity < 0.50 → rating 1 (Again), accuracy proportional

Grading logic (Levenshtein fallback):
- Exact match → rating 4 (Easy), accuracy 1.0
- Match ignoring Vietnamese diacritics → rating 3 (Good), accuracy 0.8
- Partial match (Levenshtein-based):
    - similarity >= 0.7 → rating 3 (Good)
    - similarity >= 0.4 → rating 2 (Hard)
    - similarity < 0.4 → rating 1 (Again)
"""

import re
import unicodedata
import threading
import time

# ─── LaBSE Model (Lazy Loading) ────────────────────────────────────

_labse_model = None
_labse_loading = False
_labse_available = None  # None = not checked, True/False = result
_labse_lock = threading.Lock()
_labse_load_time = None


def is_labse_available() -> bool:
    """Check if LaBSE model is available and loaded."""
    return _labse_available is True and _labse_model is not None


def get_labse_status() -> dict:
    """Get detailed LaBSE model status for diagnostics."""
    return {
        "available": _labse_available,
        "loading": _labse_loading,
        "model_loaded": _labse_model is not None,
        "load_time_seconds": round(_labse_load_time, 2) if _labse_load_time else None,
        "grader_mode": "labse" if is_labse_available() else "levenshtein",
    }


def _load_labse_model():
    """Load the LaBSE model (called lazily on first use)."""
    global _labse_model, _labse_available, _labse_loading, _labse_load_time

    with _labse_lock:
        if _labse_available is not None:
            return  # Already determined

        _labse_loading = True
        start = time.time()

        try:
            from sentence_transformers import SentenceTransformer
            print("[Grader] Loading LaBSE model (sentence-transformers/LaBSE)...")
            _labse_model = SentenceTransformer('sentence-transformers/LaBSE')
            _labse_load_time = time.time() - start
            _labse_available = True
            print(f"[Grader] ✅ LaBSE model loaded in {_labse_load_time:.1f}s — semantic grading enabled!")
        except ImportError:
            _labse_available = False
            print("[Grader] ⚠️ sentence-transformers not installed. Using Levenshtein fallback.")
        except Exception as e:
            _labse_available = False
            print(f"[Grader] ⚠️ LaBSE model failed to load: {e}. Using Levenshtein fallback.")
        finally:
            _labse_loading = False


def _compute_labse_similarity(text1: str, text2: str) -> float:
    """Compute cosine similarity between two texts using LaBSE embeddings.

    Returns a value between 0.0 and 1.0.
    """
    global _labse_model

    if _labse_model is None:
        _load_labse_model()

    if not is_labse_available():
        return -1.0  # Signal that LaBSE is not available

    try:
        from sentence_transformers.util import cos_sim
        embeddings = _labse_model.encode([text1, text2], normalize_embeddings=True)
        similarity = cos_sim(embeddings[0], embeddings[1])
        # Clamp to [0, 1]
        return max(0.0, min(1.0, similarity.item()))
    except Exception as e:
        print(f"[Grader] LaBSE similarity error: {e}")
        return -1.0


# ─── String Utilities ───────────────────────────────────────────────


def remove_vietnamese_diacritics(text: str) -> str:
    """Remove Vietnamese diacritical marks from text.

    Uses Unicode NFD normalization and filters out combining characters (category 'Mn').
    This allows "xin chao" to match "xin chào", "ca phe" to match "cà phê", etc.
    """
    normalized = unicodedata.normalize('NFD', text)
    without_diacritics = ''.join(
        char for char in normalized
        if unicodedata.category(char) != 'Mn'
    )
    return without_diacritics


def normalize_string(text: str) -> str:
    """Normalize a string for comparison: lowercase, trim, collapse spaces."""
    if not text:
        return ""
    result = text.lower()
    result = re.sub(r'\s+', ' ', result).strip()
    return result


# ─── Levenshtein Distance (Fallback) ───────────────────────────────


def levenshtein_distance(s1: str, s2: str) -> int:
    """Compute the Levenshtein distance between two strings.

    Uses O(min(m,n)) space dynamic programming approach.
    """
    if len(s1) < len(s2):
        s1, s2 = s2, s1

    m, n = len(s1), len(s2)

    if n == 0:
        return m
    if m == 0:
        return n

    previous_row = list(range(n + 1))

    for i in range(1, m + 1):
        current_row = [i]
        for j in range(1, n + 1):
            substitution_cost = 0 if s1[i - 1] == s2[j - 1] else 1
            current_row.append(min(
                previous_row[j] + 1,
                current_row[j - 1] + 1,
                previous_row[j - 1] + substitution_cost
            ))
        previous_row = current_row

    return previous_row[n]


def compute_similarity(s1: str, s2: str) -> float:
    """Compute similarity ratio using Levenshtein distance (0.0 to 1.0)."""
    if not s1 and not s2:
        return 1.0
    if not s1 or not s2:
        return 0.0

    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0

    distance = levenshtein_distance(s1, s2)
    return max(0.0, 1.0 - (distance / max_len))


# ─── Main Grading Function ─────────────────────────────────────────


def check_answer(user_answer: str, correct_answer: str, direction: str = "en_to_vi") -> dict:
    """Compare a user-typed answer against the correct translation.

    Uses LaBSE semantic similarity when available, falls back to Levenshtein.

    Args:
        user_answer: The answer typed by the user.
        correct_answer: The correct translation to compare against.
        direction: "en_to_vi" or "vi_to_en"

    Returns:
        Dictionary with:
        - rating: int (1-4) — suggested SM-2 rating
        - accuracy: float (0.0-1.0) — how close the answer was
        - is_correct: bool — whether rating >= 3 (Good or better)
        - match_type: str — "exact", "diacritics_ignored", "semantic", "partial", or "none"
        - similarity: float (0.0-1.0) — similarity score
        - normalized_user: str — normalized user answer
        - normalized_correct: str — normalized correct answer
        - grader: str — "labse" or "levenshtein"
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
            "grader": "exact",
        }

    # ── 2. Diacritics-ignored match ───────────────────────
    norm_user_no_diacritics = remove_vietnamese_diacritics(norm_user)
    norm_correct_no_diacritics = remove_vietnamese_diacritics(norm_correct)

    if norm_user_no_diacritics == norm_correct_no_diacritics:
        return {
            "rating": 4,
            "accuracy": 0.95,
            "is_correct": True,
            "match_type": "diacritics_ignored",
            "similarity": 0.95,
            "normalized_user": norm_user,
            "normalized_correct": norm_correct,
            "grader": "exact",
        }

    # ── 3. Try LaBSE semantic similarity ──────────────────
    labse_sim = _compute_labse_similarity(user_answer, correct_answer)

    if labse_sim >= 0.0:
        # LaBSE is available — use semantic similarity for grading
        return _grade_from_labse(labse_sim, norm_user, norm_correct)

    # ── 4. Levenshtein fallback ───────────────────────────
    # For vi→en: user types English, correct answer is English → same language, Levenshtein works.
    # For en→vi: user types Vietnamese, correct answer is Vietnamese → same language, Levenshtein works.
    # Both directions compare user_answer against correct_answer in SAME language.
    return _grade_from_levenshtein(norm_user_no_diacritics, norm_correct_no_diacritics, norm_user, norm_correct)


def _grade_from_labse(similarity: float, norm_user: str, norm_correct: str) -> dict:
    """Grade based on LaBSE semantic similarity score.

    Thresholds calibrated for cross-lingual EN-VI matching:
    - 0.85+ : Easy (rating 4) — very close semantic match
    - 0.70+ : Good (rating 3) — correct meaning, possibly different wording
    - 0.50+ : Hard (rating 2) — partially correct or related meaning
    - <0.50 : Again (rating 1) — incorrect or unrelated
    """
    if similarity >= 0.85:
        rating = 4
        match_type = "semantic"
    elif similarity >= 0.70:
        rating = 3
        match_type = "semantic"
    elif similarity >= 0.50:
        rating = 2
        match_type = "semantic"
    else:
        rating = 1
        match_type = "partial" if similarity > 0.3 else "none"

    accuracy = similarity

    return {
        "rating": rating,
        "accuracy": round(accuracy, 4),
        "is_correct": rating >= 3,
        "match_type": match_type,
        "similarity": round(similarity, 4),
        "normalized_user": norm_user,
        "normalized_correct": norm_correct,
        "grader": "labse",
    }


def _grade_from_levenshtein(norm_user_no_diacritics: str, norm_correct_no_diacritics: str,
                             norm_user: str, norm_correct: str) -> dict:
    """Grade based on Levenshtein string similarity (fallback)."""
    similarity = compute_similarity(norm_user_no_diacritics, norm_correct_no_diacritics)

    if similarity >= 0.7:
        rating = 3
        accuracy = similarity
    elif similarity >= 0.4:
        rating = 2
        accuracy = similarity
    else:
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
        "grader": "levenshtein",
    }


def get_accepted_answers(english: str, vietnamese: str) -> list[str]:
    """Compute a list of accepted answer variants for a vocabulary item.

    Includes:
    - The original Vietnamese translation (normalized)
    - The Vietnamese without diacritics
    - The original English word (normalized)
    - The English without diacritics (in case of borrowed words)
    """
    accepted = set()

    norm_en = normalize_string(english)
    norm_vi = normalize_string(vietnamese)

    accepted.add(norm_en)
    accepted.add(norm_vi)

    vi_no_diacritics = remove_vietnamese_diacritics(norm_vi)
    accepted.add(vi_no_diacritics)

    en_no_diacritics = remove_vietnamese_diacritics(norm_en)
    accepted.add(en_no_diacritics)

    accepted.discard("")

    return list(accepted)
