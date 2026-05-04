"""TCGL Model Prediction Module for Flashcard Scheduling.

This module bridges the gap between the LearnHub flashcard system
and the Temporal Contrastive Graph Learning model.

It converts review log data into graph-structured input for the TCGL model,
runs inference, and translates the model's output into actionable
spaced repetition scheduling decisions.

Integration:
  In routers/flashcard.py, replace:
    from spaced_repetition import calculate_sm2, get_initial_state
  With:
    from ml_model.predict import predict_next_review, get_initial_state

  The function signatures are compatible — drop-in replacement.
"""

import os
import math
from datetime import datetime, timedelta, timezone
from typing import Optional

import torch
import numpy as np

from ml_model.model import TCGLModel, load_model

# ─── Configuration ────────────────────────────────────────────────

# Resolve model path relative to the project root
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PROJECT_ROOT = os.path.dirname(os.path.dirname(_BACKEND_DIR))
_DEFAULT_MODEL_PATH = os.path.join(_PROJECT_ROOT, "upload", "model.pth")

MODEL_PATH = os.environ.get("TCGL_MODEL_PATH", _DEFAULT_MODEL_PATH)

# Node feature dimension (must match model training)
NODE_FEAT_DIM = 19

# Category → index mapping (consistent with training)
CATEGORIES = [
    "Greetings", "Food & Drinks", "Numbers", "Colors", "Family",
    "Daily Activities", "Travel", "Emotions", "Time", "Animals",
    "Weather", "Education", "Shopping", "Body Parts", "Adjectives",
    "Verbs",
]

# Part of speech → index mapping
PARTS_OF_SPEECH = [
    "noun", "verb", "adjective", "adverb", "interjection", "phrase", "number",
]

# ─── Singleton Model Instance ─────────────────────────────────────

_model: Optional[TCGLModel] = None


def get_model() -> TCGLModel:
    """Get or initialize the TCGL model singleton."""
    global _model
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"TCGL model not found at {MODEL_PATH}. "
                f"Set TCGL_MODEL_PATH env var or place model.pth in upload/"
            )
        print(f"[TCGL] Loading model from {MODEL_PATH}...")
        _model = load_model(MODEL_PATH, device="cpu")
        print(f"[TCGL] Model loaded successfully on CPU")
    return _model


# ─── Feature Engineering ──────────────────────────────────────────


def encode_node_features(
    difficulty_level: int = 1,
    category: Optional[str] = None,
    part_of_speech: Optional[str] = None,
    review_count: int = 0,
    correct_count: int = 0,
    current_ease_factor: float = 2.5,
    current_interval: float = 0.0,
    current_repetitions: int = 0,
    avg_response_time_ms: float = 0.0,
    days_since_last_review: float = 0.0,
    last_rating: float = 0.0,
    direction_en_to_vi_ratio: float = 0.5,
    session_count: int = 0,
    consecutive_correct: int = 0,
    consecutive_incorrect: int = 0,
    total_time_spent_ms: float = 0.0,
    mastery_score: float = 0.0,
    forgetting_rate: float = 0.0,
) -> torch.Tensor:
    """Encode vocabulary + review state into a 19-dim feature vector.

    This must match the feature encoding used during model training.

    Feature indices:
      0:  difficulty_level (1-3, normalized to 0-1)
      1:  category_onehot (index into CATEGORIES, normalized)
      2:  part_of_speech_onehot (index into PARTS_OF_SPEECH, normalized)
      3:  review_count (log-normalized)
      4:  correct_count / review_count (accuracy, 0-1)
      5:  current_ease_factor (normalized, /5)
      6:  current_interval_days (log-normalized)
      7:  current_repetitions (normalized, /20)
      8:  avg_response_time_ms (log-normalized)
      9:  days_since_last_review (log-normalized)
      10: last_rating (normalized, /4)
      11: direction_en_to_vi_ratio (0-1)
      12: session_count (log-normalized)
      13: consecutive_correct (normalized, /10)
      14: consecutive_incorrect (normalized, /10)
      15: total_time_spent_ms (log-normalized)
      16: mastery_score (0-1, derived from ease_factor * interval)
      17: forgetting_rate (0-1, derived from incorrect/total)
      18: bias term (1.0)
    """
    def safe_log1p(x):
        return math.log1p(max(x, 0))

    def safe_div(a, b, default=0.0):
        return a / b if b > 0 else default

    cat_idx = CATEGORIES.index(category) if category in CATEGORIES else 0
    pos_idx = PARTS_OF_SPEECH.index(part_of_speech) if part_of_speech in PARTS_OF_SPEECH else 0

    features = [
        (difficulty_level - 1) / 2.0,                     # 0: difficulty (0-1)
        cat_idx / max(len(CATEGORIES) - 1, 1),            # 1: category (0-1)
        pos_idx / max(len(PARTS_OF_SPEECH) - 1, 1),       # 2: pos (0-1)
        safe_log1p(review_count) / 10.0,                  # 3: review_count
        safe_div(correct_count, review_count),             # 4: accuracy
        current_ease_factor / 5.0,                         # 5: ease_factor
        safe_log1p(current_interval) / 10.0,              # 6: interval
        current_repetitions / 20.0,                        # 7: repetitions
        safe_log1p(avg_response_time_ms) / 15.0,          # 8: response_time
        safe_log1p(days_since_last_review) / 10.0,        # 9: days_since_review
        last_rating / 4.0,                                 # 10: last_rating
        direction_en_to_vi_ratio,                          # 11: direction_ratio
        safe_log1p(session_count) / 5.0,                  # 12: session_count
        min(consecutive_correct / 10.0, 1.0),             # 13: consecutive_correct
        min(consecutive_incorrect / 10.0, 1.0),           # 14: consecutive_incorrect
        safe_log1p(total_time_spent_ms) / 20.0,           # 15: total_time
        mastery_score,                                     # 16: mastery
        forgetting_rate,                                   # 17: forgetting
        1.0,                                               # 18: bias
    ]

    assert len(features) == NODE_FEAT_DIM, f"Expected {NODE_FEAT_DIM} features, got {len(features)}"
    return torch.tensor([features], dtype=torch.float32)


# ─── Graph Construction ───────────────────────────────────────────


def build_review_graph(review_logs: list[dict], vocab_items: list[dict]) -> tuple:
    """Construct a graph from review logs for TCGL model inference.

    The graph structure:
    - Nodes: vocabulary items that the user has interacted with
    - Edges: connect vocabulary reviewed in the same session or
             consecutively (temporal relationship)
    - Edge features: time delta between reviews

    Args:
        review_logs: List of review log dicts with keys:
                     vocabulary_id, rating, reviewed_at, session_id,
                     ease_factor, interval_days, repetitions,
                     response_time_ms, direction
        vocab_items: List of vocabulary dicts with keys:
                     id, difficulty_level, category, part_of_speech

    Returns:
        Tuple of (node_features, edge_index, edge_time)
    """
    if not review_logs:
        # No reviews yet — create a minimal graph with just the vocab node
        return None, None, None

    # Build vocab lookup
    vocab_map = {v["id"]: v for v in vocab_items}

    # Track per-vocabulary aggregated stats
    vocab_stats = {}
    for log in review_logs:
        vid = log["vocabulary_id"]
        if vid not in vocab_stats:
            vocab_stats[vid] = {
                "review_count": 0,
                "correct_count": 0,
                "ratings": [],
                "ease_factor": 2.5,
                "interval_days": 0,
                "repetitions": 0,
                "response_times": [],
                "directions": [],
                "last_reviewed_at": None,
                "session_ids": set(),
                "last_rating": 0,
                "consecutive_correct": 0,
                "consecutive_incorrect": 0,
            }

        stats = vocab_stats[vid]
        stats["review_count"] += 1
        if log.get("rating", 0) >= 3:
            stats["correct_count"] += 1
            stats["consecutive_correct"] += 1
            stats["consecutive_incorrect"] = 0
        else:
            stats["consecutive_incorrect"] += 1
            stats["consecutive_correct"] = 0
        stats["ratings"].append(log.get("rating", 0))
        stats["ease_factor"] = log.get("ease_factor", 2.5)
        stats["interval_days"] = log.get("interval_days", 0)
        stats["repetitions"] = log.get("repetitions", 0)
        if log.get("response_time_ms"):
            stats["response_times"].append(log["response_time_ms"])
        stats["directions"].append(log.get("direction", "en_to_vi"))
        if log.get("reviewed_at"):
            stats["last_reviewed_at"] = log["reviewed_at"]
        if log.get("session_id"):
            stats["session_ids"].add(log["session_id"])
        stats["last_rating"] = log.get("rating", 0)

    # Node features
    node_features = []
    node_ids = sorted(vocab_stats.keys())

    for vid in node_ids:
        stats = vocab_stats[vid]
        v = vocab_map.get(vid, {})

        # Compute days since last review
        days_since = 0.0
        if stats["last_reviewed_at"]:
            if isinstance(stats["last_reviewed_at"], str):
                last = datetime.fromisoformat(stats["last_reviewed_at"].replace("Z", "+00:00"))
            else:
                last = stats["last_reviewed_at"]
            days_since = (datetime.now(timezone.utc) - last).total_seconds() / 86400

        # Direction ratio
        en_to_vi = sum(1 for d in stats["directions"] if d == "en_to_vi")
        dir_ratio = en_to_vi / max(len(stats["directions"]), 1)

        # Mastery score: higher ease_factor + longer interval = more mastered
        mastery = min((stats["ease_factor"] / 5.0) * (stats["interval_days"] / 30.0), 1.0)

        # Forgetting rate
        forgetting = stats["consecutive_incorrect"] / max(stats["review_count"], 1)

        features = encode_node_features(
            difficulty_level=v.get("difficulty_level", 1),
            category=v.get("category"),
            part_of_speech=v.get("part_of_speech"),
            review_count=stats["review_count"],
            correct_count=stats["correct_count"],
            current_ease_factor=stats["ease_factor"],
            current_interval=stats["interval_days"],
            current_repetitions=stats["repetitions"],
            avg_response_time_ms=sum(stats["response_times"]) / max(len(stats["response_times"]), 1),
            days_since_last_review=days_since,
            last_rating=stats["last_rating"],
            direction_en_to_vi_ratio=dir_ratio,
            session_count=len(stats["session_ids"]),
            consecutive_correct=stats["consecutive_correct"],
            consecutive_incorrect=stats["consecutive_incorrect"],
            total_time_spent_ms=sum(stats["response_times"]),
            mastery_score=mastery,
            forgetting_rate=forgetting,
        )
        node_features.append(features)

    x = torch.cat(node_features, dim=0)  # [N, 19]

    # Build edges from sessions (connect words reviewed in same session)
    edges_src = []
    edges_dst = []
    edge_times = []

    # Group reviews by session
    sessions = {}
    for log in review_logs:
        sid = log.get("session_id")
        if sid:
            if sid not in sessions:
                sessions[sid] = []
            sessions[sid].append(log)

    # Also create temporal edges between consecutive reviews
    sorted_logs = sorted(review_logs, key=lambda l: l.get("reviewed_at", ""))
    vid_to_idx = {vid: idx for idx, vid in enumerate(node_ids)}

    for i in range(len(sorted_logs) - 1):
        vid1 = sorted_logs[i]["vocabulary_id"]
        vid2 = sorted_logs[i + 1]["vocabulary_id"]
        if vid1 != vid2 and vid1 in vid_to_idx and vid2 in vid_to_idx:
            idx1 = vid_to_idx[vid1]
            idx2 = vid_to_idx[vid2]
            # Bidirectional edges
            edges_src.extend([idx1, idx2])
            edges_dst.extend([idx2, idx1])

            # Time delta in days (normalized)
            try:
                t1 = sorted_logs[i].get("reviewed_at", "")
                t2 = sorted_logs[i + 1].get("reviewed_at", "")
                if isinstance(t1, str) and isinstance(t2, str):
                    dt1 = datetime.fromisoformat(t1.replace("Z", "+00:00"))
                    dt2 = datetime.fromisoformat(t2.replace("Z", "+00:00"))
                    delta_days = abs((dt2 - dt1).total_seconds()) / 86400
                else:
                    delta_days = 1.0
            except (ValueError, TypeError):
                delta_days = 1.0

            edge_times.extend([delta_days, delta_days])

    # Session-based edges
    for sid, logs in sessions.items():
        vids_in_session = list(set(l["vocabulary_id"] for l in logs if l["vocabulary_id"] in vid_to_idx))
        for i in range(len(vids_in_session)):
            for j in range(i + 1, len(vids_in_session)):
                idx1 = vid_to_idx[vids_in_session[i]]
                idx2 = vid_to_idx[vids_in_session[j]]
                edges_src.extend([idx1, idx2])
                edges_dst.extend([idx2, idx1])
                edge_times.extend([0.001, 0.001])  # Same session = near-zero time

    if not edges_src:
        # Self-loops as fallback
        for idx in range(len(node_ids)):
            edges_src.append(idx)
            edges_dst.append(idx)
            edge_times.append(1.0)

    edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)
    edge_time = torch.tensor(edge_times, dtype=torch.float32)

    return x, edge_index, edge_time


# ─── Prediction Interface ─────────────────────────────────────────


def predict_next_review(
    rating: int,
    current_ease_factor: float = 2.5,
    current_interval: int = 0,
    current_repetitions: int = 0,
    # Extended params for ML model
    user_id: str = "guest",
    vocabulary_id: int = 0,
    vocab_info: Optional[dict] = None,
    user_review_history: Optional[list[dict]] = None,
    all_vocab: Optional[list[dict]] = None,
    direction: str = "en_to_vi",
    response_time_ms: Optional[int] = None,
    session_id: Optional[str] = None,
) -> dict:
    """Predict the next review parameters using the TCGL model.

    This is the drop-in replacement for calculate_sm2().
    Falls back to SM-2 if the model cannot run.

    Args:
        rating: User's recall quality (1=Again, 2=Hard, 3=Good, 4=Easy)
        current_ease_factor: Current ease factor
        current_interval: Current interval in days
        current_repetitions: Current repetition count
        user_id: User ID
        vocabulary_id: Vocabulary item ID
        vocab_info: Dict with vocabulary metadata (category, difficulty_level, etc.)
        user_review_history: List of the user's past review logs
        all_vocab: List of all vocabulary items for graph construction
        direction: Review direction (en_to_vi / vi_to_en)
        response_time_ms: Time taken to respond
        session_id: Current study session ID

    Returns:
        Dict with keys:
            ease_factor: Updated ease factor
            interval_days: Predicted optimal interval
            repetitions: Updated repetition count
            next_review_at: Datetime for next review
            model_used: "tcgl" or "sm2_fallback"
    """
    try:
        model = get_model()

        # Build the review graph
        review_history = user_review_history or []

        # Add current review to history for context
        current_review = {
            "vocabulary_id": vocabulary_id,
            "rating": rating,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "session_id": session_id,
            "ease_factor": current_ease_factor,
            "interval_days": current_interval,
            "repetitions": current_repetitions,
            "response_time_ms": response_time_ms or 0,
            "direction": direction,
        }
        review_history = review_history + [current_review]

        vocab_items = all_vocab or []
        if vocab_info and vocab_info not in vocab_items:
            vocab_items = vocab_items + [vocab_info]

        # Build graph
        x, edge_index, edge_time = build_review_graph(review_history, vocab_items)

        if x is None:
            # No graph data, use single-node inference
            vocab_info = vocab_info or {}
            days_since = current_interval
            dir_ratio = 1.0 if direction == "en_to_vi" else 0.0

            x = encode_node_features(
                difficulty_level=vocab_info.get("difficulty_level", 1),
                category=vocab_info.get("category"),
                part_of_speech=vocab_info.get("part_of_speech"),
                review_count=current_repetitions,
                correct_count=current_repetitions if rating >= 3 else max(current_repetitions - 1, 0),
                current_ease_factor=current_ease_factor,
                current_interval=current_interval,
                current_repetitions=current_repetitions,
                avg_response_time_ms=response_time_ms or 0,
                days_since_last_review=days_since,
                last_rating=rating,
                direction_en_to_vi_ratio=dir_ratio,
                session_count=1,
                consecutive_correct=current_repetitions if rating >= 3 else 0,
                consecutive_incorrect=1 if rating < 3 else 0,
                total_time_spent_ms=response_time_ms or 0,
                mastery_score=min((current_ease_factor / 5.0) * (current_interval / 30.0), 1.0),
                forgetting_rate=0.0 if rating >= 3 else 1.0,
            )
            # Self-loop edge
            edge_index = torch.tensor([[0], [0]], dtype=torch.long)
            edge_time = torch.tensor([1.0], dtype=torch.float32)

        # Run model inference
        with torch.no_grad():
            prediction = model(x, edge_index, edge_time)  # [N, 1]

        # Get the prediction for the target node
        # The target vocabulary is the last one in the graph (most recently added)
        target_idx = x.size(0) - 1
        raw_output = prediction[target_idx, 0].item()

        # ─── Convert model output to scheduling parameters ─────

        # The model outputs a scalar that we interpret as a retention score.
        # Higher score → better retention → longer interval.
        # We use a sigmoid-like mapping to convert to interval days.

        # Clamp the raw output to a reasonable range
        retention_score = max(min(raw_output, 5.0), -5.0)

        # Convert retention score to interval using exponential mapping
        # Score > 0: user remembers well → increase interval
        # Score < 0: user is forgetting → decrease interval
        if rating >= 3:
            # Successful recall — positive scaling
            if current_interval == 0:
                base_interval = 1
            elif current_interval == 1:
                base_interval = 6
            else:
                base_interval = current_interval

            # Model-adjusted interval: scale based on retention score
            scale = 1.0 + (retention_score * 0.3)  # ±30% adjustment from model
            scale = max(scale, 0.5)  # Don't reduce by more than 50%
            new_interval = round(base_interval * scale)
            new_repetitions = current_repetitions + 1

            # Adjust ease factor
            ease_delta = 0.1 + (retention_score * 0.05)
            new_ease = max(current_ease_factor + ease_delta, 1.3)

        else:
            # Failed recall — reset with model guidance
            # Use model output to determine how much to reset
            # Even with failed recall, the model may say partial retention
            partial_retention = max(min(retention_score, 2.0), -2.0)

            new_interval = 1
            if partial_retention > 0.5:
                # Some residual memory — don't fully reset
                new_interval = max(round(current_interval * 0.2), 1)

            new_repetitions = 0
            new_ease = max(current_ease_factor - 0.2, 1.3)

        # Cap at 365 days
        new_interval = min(new_interval, 365)
        new_interval = max(new_interval, 1)

        # Easy rating bonus
        if rating == 4 and current_repetitions > 0:
            new_interval = round(new_interval * 1.3)

        # Hard rating: moderate interval
        if rating == 2:
            new_interval = max(round(current_interval * 1.2), 1)

        next_review_at = datetime.now(timezone.utc) + timedelta(days=new_interval)

        return {
            "ease_factor": round(new_ease, 2),
            "interval_days": new_interval,
            "repetitions": new_repetitions,
            "next_review_at": next_review_at,
            "model_used": "tcgl",
            "raw_output": round(raw_output, 4),
        }

    except Exception as e:
        print(f"[TCGL] Model inference failed: {e}. Falling back to SM-2.")
        # Fallback to SM-2 if model fails
        from spaced_repetition import calculate_sm2

        result = calculate_sm2(
            rating=rating,
            current_ease_factor=current_ease_factor,
            current_interval=current_interval,
            current_repetitions=current_repetitions,
        )

        return {
            "ease_factor": result.ease_factor,
            "interval_days": result.interval_days,
            "repetitions": result.repetitions,
            "next_review_at": result.next_review_at,
            "model_used": "sm2_fallback",
            "raw_output": None,
        }


def get_initial_state() -> dict:
    """Get initial learning state for a new card.

    Same interface as spaced_repetition.get_initial_state().
    """
    return {
        "ease_factor": 2.5,
        "interval_days": 0,
        "repetitions": 0,
        "next_review_at": None,
    }
