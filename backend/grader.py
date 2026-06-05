"""Auto-grading module for comparing user-typed answers with correct translations.

Uses a two-layer approach:
  1. COMET (Unbabel/wmt22-cometkiwi-da) for reference-free translation quality estimation
  2. Multilingual sentence embedding similarity as a semantic gate to detect
     unrelated answers that COMET alone might score too generously

The semantic gate prevents cases like:
  - "tạm biệt" vs "hi" → COMET ~0.54 (both are greetings, but different meaning)
  - "cảm ơn" vs "rice" → COMET ~0.63 (completely unrelated)

Falls back to Levenshtein distance if neither model is available.

Grading logic (COMET + semantic gate mode):
- Exact match → rating 4 (Easy), accuracy 1.0
- Match ignoring Vietnamese diacritics → rating 4 (Easy), accuracy 0.95
- COMET score adjusted by embedding similarity:
    - combined >= 0.80 → rating 4 (Easy)
    - combined >= 0.65 → rating 3 (Good)
    - combined >= 0.45 → rating 2 (Hard)
    - combined < 0.45 → rating 1 (Again)

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

# ─── COMET Model (Lazy Loading) ───────────────────────────────────

_comet_model = None
_comet_loading = False
_comet_available = None  # None = not checked, True/False = result
_comet_lock = threading.Lock()
_comet_load_time = None


# ─── Sentence Embedding Model (Semantic Gate) ─────────────────────

# We use a lightweight multilingual model for semantic similarity.
# This acts as a "gate" to detect unrelated answers that COMET might
# score too generously (e.g., "hi" vs "tạm biệt" are both greetings
# but have different meanings).
_embed_model = None
_embed_loading = False
_embed_available = None
_embed_lock = threading.Lock()
_embed_load_time = None

# Model: BAAI/bge-m3
# - Multilingual (supports EN, VI, and 100+ languages)
# - Run on CPU to save GPU VRAM for COMET
_EMBED_MODEL_NAME = "BAAI/bge-m3"


def is_comet_available() -> bool:
    """Check if COMET model is available and loaded."""
    return _comet_available is True and _comet_model is not None


def is_embed_available() -> bool:
    """Check if sentence embedding model is available and loaded."""
    return _embed_available is True and _embed_model is not None


def get_comet_status() -> dict:
    """Get detailed model status for diagnostics."""
    return {
        "comet_available": _comet_available,
        "comet_loading": _comet_loading,
        "comet_model_loaded": _comet_model is not None,
        "comet_load_time_seconds": round(_comet_load_time, 2) if _comet_load_time else None,
        "embed_available": _embed_available,
        "embed_loading": _embed_loading,
        "embed_model_loaded": _embed_model is not None,
        "embed_load_time_seconds": round(_embed_load_time, 2) if _embed_load_time else None,
        "embed_model_name": _EMBED_MODEL_NAME,
        "grader_mode": _get_grader_mode(),
    }


def _get_grader_mode() -> str:
    """Determine the current grading mode based on available models."""
    if is_comet_available() and is_embed_available():
        return "comet+embed"
    elif is_comet_available():
        return "comet_only"
    else:
        return "levenshtein"


def _load_comet_model():
    """Load the COMET model (called lazily on first use)."""
    global _comet_model, _comet_available, _comet_loading, _comet_load_time

    with _comet_lock:
        if _comet_available is not None:
            return

        _comet_loading = True
        start = time.time()

        try:
            from comet import download_model, load_from_checkpoint
            print("[Grader] Loading COMET model (Unbabel/wmt22-cometkiwi-da)...")
            model_path = download_model("Unbabel/wmt22-cometkiwi-da")
            _comet_model = load_from_checkpoint(model_path)
            _comet_load_time = time.time() - start
            _comet_available = True
            print(f"[Grader] ✅ COMET model loaded in {_comet_load_time:.1f}s")
        except ImportError:
            _comet_available = False
            print("[Grader] ⚠️ unbabel-comet not installed.")
        except Exception as e:
            _comet_available = False
            print(f"[Grader] ⚠️ COMET model failed to load: {e}")
        finally:
            _comet_loading = False


def _load_embed_model():
    """Load the sentence embedding model for semantic gating."""
    global _embed_model, _embed_available, _embed_loading, _embed_load_time

    with _embed_lock:
        if _embed_available is not None:
            return

        _embed_loading = True
        start = time.time()

        try:
            from sentence_transformers import SentenceTransformer
            print(f"[Grader] Loading embedding model ({_EMBED_MODEL_NAME}) on CPU...")
            _embed_model = SentenceTransformer(_EMBED_MODEL_NAME, device="cpu")
            _embed_load_time = time.time() - start
            _embed_available = True
            print(f"[Grader] ✅ Embedding model loaded in {_embed_load_time:.1f}s")
        except ImportError:
            _embed_available = False
            print("[Grader] ⚠️ sentence-transformers not installed. Semantic gate disabled.")
        except Exception as e:
            _embed_available = False
            print(f"[Grader] ⚠️ Embedding model failed to load: {e}. Semantic gate disabled.")
        finally:
            _embed_loading = False


def _compute_comet_score(source: str, hypothesis: str, reference: str) -> float:
    """Compute COMET score for a translation.

    Args:
        source: The original text.
        hypothesis: The user's translation.
        reference: The correct translation (unused in reference-free wmt22-cometkiwi-da model).

    Returns:
        A score between 0.0 and 1.0, or -1.0 if COMET is unavailable.
    """
    global _comet_model

    if _comet_model is None:
        _load_comet_model()

    if not is_comet_available():
        return -1.0

    try:
        data = [{"src": source, "mt": hypothesis}]
        predictions = _comet_model.predict(data, batch_size=1)
        score = predictions.scores[0]
        return max(0.0, min(1.0, score))
    except Exception as e:
        print(f"[Grader] COMET scoring error: {e}")
        return -1.0


def _compute_embed_similarity(text1: str, text2: str) -> float:
    """Compute cosine similarity between two texts using multilingual embeddings.

    This is the "semantic gate" — it detects whether two texts have related
    meanings regardless of language.

    Args:
        text1: First text (can be any language).
        text2: Second text (can be any language).

    Returns:
        A similarity score between 0.0 and 1.0, or -1.0 if unavailable.
    """
    global _embed_model

    if _embed_model is None:
        _load_embed_model()

    if not is_embed_available():
        return -1.0

    try:
        from sentence_transformers.util import cos_sim
        embeddings = _embed_model.encode([text1, text2], normalize_embeddings=True)
        similarity = cos_sim(embeddings[0], embeddings[1])
        return max(0.0, min(1.0, similarity.item()))
    except Exception as e:
        print(f"[Grader] Embedding similarity error: {e}")
        return -1.0


def _compute_combined_score(comet_score: float, embed_sim: float) -> float:
    """Combine COMET score with embedding similarity for a more accurate grade.

    The embedding similarity acts as a "gate":
    - If embed_sim is high (texts are semantically related), trust COMET score
    - If embed_sim is low (texts are unrelated), penalize heavily
    - If embed_sim is medium, blend the two scores

    This prevents cases like:
    - "tạm biệt" vs "hi": COMET=0.54, embed_sim=~0.35 → combined=~0.30
    - "cảm ơn" vs "rice": COMET=0.63, embed_sim=~0.05 → combined=~0.19
    """
    if embed_sim < 0.0:
        # Embedding model not available, use COMET alone
        return comet_score

    if embed_sim >= 0.70:
        # High semantic similarity — texts are clearly related
        # Trust COMET score with a small boost from embedding
        combined = 0.7 * comet_score + 0.3 * embed_sim
    elif embed_sim >= 0.45:
        # Medium semantic similarity — somewhat related
        # Blend COMET and embedding equally
        combined = 0.5 * comet_score + 0.5 * embed_sim
    elif embed_sim >= 0.25:
        # Low semantic similarity — barely related
        # Penalize: embedding similarity drags score down significantly
        combined = 0.3 * comet_score + 0.7 * embed_sim
    else:
        # Very low semantic similarity — unrelated texts
        # Heavy penalty: even if COMET is generous, this is likely wrong
        combined = 0.15 * comet_score + 0.85 * embed_sim

    return max(0.0, min(1.0, combined))


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


def check_answer(user_answer: str, correct_answer: str, direction: str = "en_to_vi",
                 source_text: str = None) -> dict:
    """Compare a user-typed answer against the correct translation.

    Uses a two-layer approach:
    1. COMET for translation quality estimation
    2. Multilingual sentence embedding similarity as a semantic gate

    Falls back to Levenshtein distance if models are unavailable.

    Args:
        user_answer: The answer typed by the user.
        correct_answer: The correct translation to compare against.
        direction: "en_to_vi" or "vi_to_en"
        source_text: The original text (English or Vietnamese depending on direction).
                     If None, the correct_answer is used as source (less accurate but works).

    Returns:
        Dictionary with:
        - rating: int (1-4) — suggested SM-2 rating
        - accuracy: float (0.0-1.0) — how close the answer was
        - is_correct: bool — whether rating >= 3 (Good or better)
        - match_type: str — "exact", "diacritics_ignored", "semantic", "partial", or "none"
        - similarity: float (0.0-1.0) — final similarity score
        - normalized_user: str — normalized user answer
        - normalized_correct: str — normalized correct answer
        - grader: str — "comet", "comet+embed", or "levenshtein"
        - comet_score: float — raw COMET score (for debugging)
        - embed_similarity: float — raw embedding similarity (for debugging)
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
            "comet_score": None,
            "embed_similarity": None,
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
            "comet_score": None,
            "embed_similarity": None,
        }

    # ── 3. COMET + Embedding semantic scoring ─────────────
    # Determine source text for COMET
    if source_text:
        src = source_text
    else:
        # Without explicit source, use correct_answer as source
        # This is a simplification — the caller should provide source_text
        src = correct_answer

    comet_score = _compute_comet_score(
        source=src,
        hypothesis=user_answer,
        reference=correct_answer,
    )

    if comet_score >= 0.0:
        # COMET is available — also compute embedding similarity as gate
        embed_sim = _compute_embed_similarity(user_answer, correct_answer)

        # Combine scores for final grading
        combined = _compute_combined_score(comet_score, embed_sim)

        # Determine grader label
        if embed_sim >= 0.0:
            grader_label = "comet+embed"
        else:
            grader_label = "comet"

        return _grade_from_combined(combined, comet_score, embed_sim, norm_user, norm_correct, grader_label)

    # ── 4. Levenshtein fallback ───────────────────────────
    return _grade_from_levenshtein(norm_user_no_diacritics, norm_correct_no_diacritics, norm_user, norm_correct)


def _grade_from_combined(combined: float, comet_score: float, embed_sim: float,
                          norm_user: str, norm_correct: str, grader_label: str) -> dict:
    """Grade based on combined COMET + embedding similarity score.

    Thresholds calibrated for the combined score:
    - 0.80+ : Easy (rating 4) — high quality, semantically equivalent
    - 0.65+ : Good (rating 3) — good translation, minor issues
    - 0.45+ : Hard (rating 2) — partially correct
    - <0.45 : Again (rating 1) — incorrect or unrelated
    """
    if combined >= 0.80:
        rating = 4
        match_type = "semantic"
    elif combined >= 0.65:
        rating = 3
        match_type = "semantic"
    elif combined >= 0.45:
        rating = 2
        match_type = "semantic"
    else:
        rating = 1
        match_type = "partial" if combined > 0.25 else "none"

    return {
        "rating": rating,
        "accuracy": round(combined, 4),
        "is_correct": rating >= 3,
        "match_type": match_type,
        "similarity": round(combined, 4),
        "normalized_user": norm_user,
        "normalized_correct": norm_correct,
        "grader": grader_label,
        "comet_score": round(comet_score, 4),
        "embed_similarity": round(embed_sim, 4) if embed_sim >= 0.0 else None,
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
        "comet_score": None,
        "embed_similarity": None,
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
