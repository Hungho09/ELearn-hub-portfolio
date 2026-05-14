"""TGCL Model — Dynamic Prediction & Online Learning Module.

This module provides the ACTIVE Temporal Graph Contrastive Learning
model that can both PREDICT and LEARN from user data.

Key capabilities:
  - predict_next_review(): Inference — predict next review schedule
  - online_learn(): After each review, update model weights via backprop
  - train_on_reviews(): Batch training on accumulated review logs
  - save_model(): Persist updated weights to disk

The model stays in memory as a PyTorch module, so gradient updates
are always possible. Weights are periodically saved to model.pth.

Integration:
  In routers/flashcard.py:
    from ml_model.predict import predict_next_review, get_initial_state

  The function signatures are compatible — drop-in replacement for SM-2.
"""

import os
import math
import threading
from datetime import datetime, timedelta, timezone
from typing import Optional

import torch
import torch.nn as nn
import numpy as np

from ml_model.model import TGCLModel

# ─── Configuration ────────────────────────────────────────────────

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PROJECT_ROOT = os.path.dirname(os.path.dirname(_BACKEND_DIR))
_DEFAULT_MODEL_PATH = os.path.join(_PROJECT_ROOT, "upload", "model.pth")
_SAVE_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "tcgl_learned.pth"
)

MODEL_PATH = os.environ.get("TGCL_MODEL_PATH", _DEFAULT_MODEL_PATH)

NODE_FEAT_DIM = 19
EMBED_DIM = 16
TIME_DIM = 16

# Online learning hyperparameters
ONLINE_LR = 0.001           # Learning rate for online updates
ONLINE_MAX_STEPS = 3        # Max gradient steps per review
ONLINE_LOSS_CLIP = 2.0      # Clip loss to prevent wild updates

# Batch training hyperparameters
BATCH_LR = 0.005
BATCH_EPOCHS = 10
BATCH_MAX_REVIEWS = 5000    # Max reviews to use for batch training

CATEGORIES = [
    "Greetings", "Food & Drinks", "Numbers", "Colors", "Family",
    "Daily Activities", "Travel", "Emotions", "Time", "Animals",
    "Weather", "Education", "Shopping", "Body Parts", "Adjectives",
    "Verbs",
]

PARTS_OF_SPEECH = [
    "noun", "verb", "adjective", "adverb", "interjection", "phrase", "number",
]


# ─── Model Singleton (thread-safe) ────────────────────────────────

_model: Optional[TGCLModel] = None
_optimizer: Optional[torch.optim.Adam] = None
_lock = threading.Lock()

# Training stats
_stats = {
    "total_predictions": 0,
    "total_online_updates": 0,
    "total_batch_trainings": 0,
    "last_online_loss": None,
    "last_batch_loss": None,
    "model_loaded_at": None,
    "model_saved_at": None,
    "model_source": None,  # "learned" or "pretrained"
}


def get_model() -> TGCLModel:
    """Get or initialize the TGCL model singleton."""
    global _model, _optimizer
    if _model is None:
        with _lock:
            if _model is None:
                _load_model_internal()
    return _model


def _load_model_internal():
    """Internal: load model (must be called within _lock)."""
    global _model, _optimizer

    # Try loading the learned model first (has our online updates)
    if os.path.exists(_SAVE_MODEL_PATH):
        print(f"[TGCL] Loading LEARNED model from {_SAVE_MODEL_PATH}...")
        _model = TGCLModel()
        state_dict = torch.load(_SAVE_MODEL_PATH, map_location="cpu", weights_only=False)
        _model.load_state_dict(state_dict, strict=True)
        _stats["model_source"] = "learned"
    elif os.path.exists(MODEL_PATH):
        print(f"[TGCL] Loading PRETRAINED model from {MODEL_PATH}...")
        _model = TGCLModel()
        state_dict = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
        _model.load_state_dict(state_dict, strict=True)
        _stats["model_source"] = "pretrained"
    else:
        print("[TGCL] No model file found. Initializing fresh model...")
        _model = TGCLModel(num_nodes=200)  # Small for our 123 vocab items
        _stats["model_source"] = "fresh"

    _model.to("cpu")

    # Freeze the huge embedding layer — we only update conv + classifier
    # The 78K embedding is from pre-training; our small vocab only uses
    # a tiny fraction. Freezing saves memory and prevents overfitting.
    _model.node_embedding.weight.requires_grad = False

    # Create optimizer for trainable params only
    trainable_params = [p for p in _model.parameters() if p.requires_grad]
    _optimizer = torch.optim.Adam(trainable_params, lr=ONLINE_LR)

    _model.eval()  # Start in eval mode
    _stats["model_loaded_at"] = datetime.now(timezone.utc).isoformat()

    n_trainable = sum(p.numel() for p in trainable_params)
    n_total = sum(p.numel() for p in _model.parameters())
    print(f"[TGCL] Model ready on CPU — {n_trainable:,} trainable / {n_total:,} total params")


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

    Feature indices:
      0:  difficulty_level (0-1)
      1:  category (normalized index)
      2:  part_of_speech (normalized index)
      3:  review_count (log-normalized)
      4:  accuracy (0-1)
      5:  ease_factor (/5)
      6:  interval_days (log-normalized)
      7:  repetitions (/20)
      8:  avg_response_time_ms (log-normalized)
      9:  days_since_last_review (log-normalized)
      10: last_rating (/4)
      11: direction_en_to_vi_ratio (0-1)
      12: session_count (log-normalized)
      13: consecutive_correct (/10)
      14: consecutive_incorrect (/10)
      15: total_time_spent_ms (log-normalized)
      16: mastery_score (0-1)
      17: forgetting_rate (0-1)
      18: bias (1.0)
    """
    def safe_log1p(x):
        return math.log1p(max(x, 0))

    def safe_div(a, b, default=0.0):
        return a / b if b > 0 else default

    cat_idx = CATEGORIES.index(category) if category in CATEGORIES else 0
    pos_idx = PARTS_OF_SPEECH.index(part_of_speech) if part_of_speech in PARTS_OF_SPEECH else 0

    features = [
        (difficulty_level - 1) / 2.0,
        cat_idx / max(len(CATEGORIES) - 1, 1),
        pos_idx / max(len(PARTS_OF_SPEECH) - 1, 1),
        safe_log1p(review_count) / 10.0,
        safe_div(correct_count, review_count),
        current_ease_factor / 5.0,
        safe_log1p(current_interval) / 10.0,
        current_repetitions / 20.0,
        safe_log1p(avg_response_time_ms) / 15.0,
        safe_log1p(days_since_last_review) / 10.0,
        last_rating / 4.0,
        direction_en_to_vi_ratio,
        safe_log1p(session_count) / 5.0,
        min(consecutive_correct / 10.0, 1.0),
        min(consecutive_incorrect / 10.0, 1.0),
        safe_log1p(total_time_spent_ms) / 20.0,
        mastery_score,
        forgetting_rate,
        1.0,
    ]

    assert len(features) == NODE_FEAT_DIM, f"Expected {NODE_FEAT_DIM} features, got {len(features)}"
    return torch.tensor([features], dtype=torch.float32)


# ─── Graph Construction ───────────────────────────────────────────


def build_review_graph(
    review_logs: list[dict],
    vocab_items: list[dict],
    target_vocab_id: Optional[int] = None,
) -> tuple:
    """Construct a graph from review logs for TGCL model inference.

    Args:
        review_logs: List of review log dicts
        vocab_items: List of vocabulary dicts
        target_vocab_id: The vocabulary ID we're predicting for (if None, all nodes)

    Returns:
        Tuple of (node_features, edge_index, edge_time, target_idx, vocab_to_idx)
    """
    if not review_logs and not vocab_items:
        return None, None, None, 0, {}

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
    vocab_to_idx = {vid: idx for idx, vid in enumerate(node_ids)}

    for vid in node_ids:
        stats = vocab_stats[vid]
        v = vocab_map.get(vid, {})

        days_since = 0.0
        if stats["last_reviewed_at"]:
            if isinstance(stats["last_reviewed_at"], str):
                try:
                    last = datetime.fromisoformat(stats["last_reviewed_at"].replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    last = datetime.now(timezone.utc)
            else:
                last = stats["last_reviewed_at"]

            # Ensure both datetimes are timezone-aware for subtraction
            now_utc = datetime.now(timezone.utc)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            days_since = (now_utc - last).total_seconds() / 86400

        en_to_vi = sum(1 for d in stats["directions"] if d == "en_to_vi")
        dir_ratio = en_to_vi / max(len(stats["directions"]), 1)
        mastery = min((stats["ease_factor"] / 5.0) * (stats["interval_days"] / 30.0), 1.0)
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

    # Build edges
    edges_src = []
    edges_dst = []
    edge_times = []

    # Temporal edges between consecutive reviews
    sorted_logs = sorted(review_logs, key=lambda l: l.get("reviewed_at", ""))

    for i in range(len(sorted_logs) - 1):
        vid1 = sorted_logs[i]["vocabulary_id"]
        vid2 = sorted_logs[i + 1]["vocabulary_id"]
        if vid1 != vid2 and vid1 in vocab_to_idx and vid2 in vocab_to_idx:
            idx1 = vocab_to_idx[vid1]
            idx2 = vocab_to_idx[vid2]
            edges_src.extend([idx1, idx2])
            edges_dst.extend([idx2, idx1])

            try:
                t1 = sorted_logs[i].get("reviewed_at", "")
                t2 = sorted_logs[i + 1].get("reviewed_at", "")
                if isinstance(t1, str) and isinstance(t2, str):
                    dt1 = datetime.fromisoformat(t1.replace("Z", "+00:00"))
                    dt2 = datetime.fromisoformat(t2.replace("Z", "+00:00"))
                    # Ensure both are timezone-aware
                    if dt1.tzinfo is None:
                        dt1 = dt1.replace(tzinfo=timezone.utc)
                    if dt2.tzinfo is None:
                        dt2 = dt2.replace(tzinfo=timezone.utc)
                    delta_days = abs((dt2 - dt1).total_seconds()) / 86400
                else:
                    delta_days = 1.0
            except (ValueError, TypeError):
                delta_days = 1.0
            edge_times.extend([delta_days, delta_days])

    # Session-based edges
    sessions = {}
    for log in review_logs:
        sid = log.get("session_id")
        if sid:
            if sid not in sessions:
                sessions[sid] = []
            sessions[sid].append(log)

    for sid, logs in sessions.items():
        vids_in_session = list(set(
            l["vocabulary_id"] for l in logs if l["vocabulary_id"] in vocab_to_idx
        ))
        for i in range(len(vids_in_session)):
            for j in range(i + 1, len(vids_in_session)):
                idx1 = vocab_to_idx[vids_in_session[i]]
                idx2 = vocab_to_idx[vids_in_session[j]]
                edges_src.extend([idx1, idx2])
                edges_dst.extend([idx2, idx1])
                edge_times.extend([0.001, 0.001])

    if not edges_src:
        for idx in range(len(node_ids)):
            edges_src.append(idx)
            edges_dst.append(idx)
            edge_times.append(1.0)

    edge_index = torch.tensor([edges_src, edges_dst], dtype=torch.long)
    edge_time = torch.tensor(edge_times, dtype=torch.float32)

    # Determine target index
    target_idx = 0
    if target_vocab_id is not None and target_vocab_id in vocab_to_idx:
        target_idx = vocab_to_idx[target_vocab_id]

    return x, edge_index, edge_time, target_idx, vocab_to_idx


# ─── Contrastive Loss for Training ────────────────────────────────


def _contrastive_loss(
    predictions: torch.Tensor,
    targets: torch.Tensor,
    edge_index: torch.Tensor,
    margin: float = 1.0,
) -> torch.Tensor:
    """Temporal Graph Contrastive Loss.

    Positive pairs: nodes connected by edges (reviewed in same session / temporal sequence)
    Negative pairs: nodes NOT connected

    For positive pairs: we want their predicted retention scores to be similar
    if they were reviewed together (temporal coherence).

    For the supervised part: we compare prediction vs target (rating-based).
    """
    # Supervised component: MSE between prediction and target
    preds_flat = predictions.view(-1)  # [N]
    supervised = nn.functional.mse_loss(preds_flat, targets)

    # Contrastive component (optional, only if enough edges)
    n_edges = edge_index.size(1)
    if n_edges >= 2:
        row, col = edge_index[0], edge_index[1]

        # Positive: connected pairs should have similar predictions
        pos_diff = preds_flat[row] - preds_flat[col]
        pos_loss = (pos_diff ** 2).mean()

        # Combine: mostly supervised, some contrastive
        total_loss = supervised + 0.1 * pos_loss
    else:
        total_loss = supervised

    return total_loss


# ─── Prediction Interface ─────────────────────────────────────────


def predict_next_review(
    rating: int,
    current_ease_factor: float = 2.5,
    current_interval: int = 0,
    current_repetitions: int = 0,
    user_id: str = "guest",
    vocabulary_id: int = 0,
    vocab_info: Optional[dict] = None,
    user_review_history: Optional[list[dict]] = None,
    all_vocab: Optional[list[dict]] = None,
    direction: str = "en_to_vi",
    response_time_ms: Optional[int] = None,
    session_id: Optional[str] = None,
    enable_learning: bool = True,
) -> dict:
    """Predict the next review parameters using the TGCL model.

    This is the drop-in replacement for calculate_sm2().
    After prediction, performs online learning (gradient update) if enable_learning=True.

    Falls back to SM-2 if the model cannot run.
    """
    try:
        model = get_model()
        _stats["total_predictions"] += 1

        # Build the review graph
        review_history = list(user_review_history or [])

        # Add current review to history for graph context
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
        review_history.append(current_review)

        vocab_items = list(all_vocab or [])
        if vocab_info and vocab_info not in vocab_items:
            vocab_items.append(vocab_info)

        # Build graph
        result = build_review_graph(review_history, vocab_items, target_vocab_id=vocabulary_id)
        x, edge_index, edge_time, target_idx, _ = result

        if x is None:
            # No graph data — single-node inference
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
            edge_index = torch.tensor([[0], [0]], dtype=torch.long)
            edge_time = torch.tensor([1.0], dtype=torch.float32)
            target_idx = 0

        # ── Inference ─────────────────────────────────────────
        model.eval()
        with torch.no_grad():
            prediction = model(x, edge_index, edge_time)  # [N, 1]
            raw_output = prediction[target_idx, 0].item()

        # ── Online Learning ───────────────────────────────────
        if enable_learning:
            _online_learn(x, edge_index, edge_time, target_idx, rating)

        # ── Convert model output to scheduling parameters ─────
        retention_score = max(min(raw_output, 5.0), -5.0)

        if rating >= 3:
            if current_interval == 0:
                base_interval = 1
            elif current_interval == 1:
                base_interval = 6
            else:
                base_interval = current_interval

            scale = 1.0 + (retention_score * 0.3)
            scale = max(scale, 0.5)
            new_interval = round(base_interval * scale)
            new_repetitions = current_repetitions + 1

            ease_delta = 0.1 + (retention_score * 0.05)
            new_ease = max(current_ease_factor + ease_delta, 1.3)
        else:
            partial_retention = max(min(retention_score, 2.0), -2.0)
            new_interval = 1
            if partial_retention > 0.5:
                new_interval = max(round(current_interval * 0.2), 1)
            new_repetitions = 0
            new_ease = max(current_ease_factor - 0.2, 1.3)

        new_interval = min(new_interval, 365)
        new_interval = max(new_interval, 1)

        if rating == 4 and current_repetitions > 0:
            new_interval = round(new_interval * 1.3)
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
        print(f"[TGCL] Model inference failed: {e}. Falling back to SM-2.")
        import traceback
        traceback.print_exc()
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


# ─── Online Learning ──────────────────────────────────────────────


def _online_learn(
    x: torch.Tensor,
    edge_index: torch.Tensor,
    edge_time: torch.Tensor,
    target_idx: int,
    actual_rating: int,
):
    """Perform online gradient update after each review.

    The model learns from the actual user rating:
      - Rating >= 3 (Good/Easy) → target retention = high (0.8-1.0)
      - Rating < 3 (Again/Hard) → target retention = low (0.0-0.3)

    Only the graph conv layers and classifier are updated (embedding is frozen).

    Note: BatchNorm1d requires >1 sample in training mode. When we have a
    single-node graph, we keep BN layers in eval mode (using running stats)
    so that gradients still flow through the other layers.
    """
    global _optimizer

    try:
        model = get_model()
        if _optimizer is None:
            return

        N = x.size(0)

        # BatchNorm needs >1 sample for training mode.
        # For small graphs, set BN to eval mode but keep everything else trainable.
        if N <= 1:
            # Put model in train mode, then override BN layers to eval
            model.train()
            for module in model.modules():
                if isinstance(module, nn.BatchNorm1d):
                    module.eval()
        else:
            model.train()

        # Target: map rating to retention probability
        rating_to_target = {1: 0.1, 2: 0.3, 3: 0.7, 4: 0.95}
        target_val = rating_to_target.get(actual_rating, 0.5)

        # For the target node, create a target tensor
        targets = torch.full((N,), 0.5, dtype=torch.float32)
        targets[target_idx] = target_val

        for _ in range(ONLINE_MAX_STEPS):
            _optimizer.zero_grad()
            predictions = model(x, edge_index, edge_time)  # [N, 1]
            loss = _contrastive_loss(predictions, targets, edge_index)

            # Clip loss to prevent catastrophic updates
            if loss.item() > ONLINE_LOSS_CLIP:
                loss = loss * (ONLINE_LOSS_CLIP / loss.item())

            loss.backward()
            _optimizer.step()

        model.eval()
        _stats["total_online_updates"] += 1
        _stats["last_online_loss"] = round(loss.item(), 6)

    except Exception as e:
        print(f"[TGCL] Online learning failed: {e}")
        model = get_model()
        if model is not None:
            model.eval()


# ─── Batch Training ───────────────────────────────────────────────


def train_on_reviews(
    review_logs: list[dict],
    vocab_items: list[dict],
    epochs: int = BATCH_EPOCHS,
    learning_rate: float = BATCH_LR,
) -> dict:
    """Batch train the model on accumulated review data.

    This is called via the /api/flashcards/train endpoint.
    Uses all available review data to fine-tune the model.

    Args:
        review_logs: List of review log dicts from the database
        vocab_items: List of vocabulary dicts
        epochs: Number of training epochs
        learning_rate: Learning rate for this training session

    Returns:
        Dict with training stats
    """
    global _optimizer

    model = get_model()
    if len(review_logs) < 2:
        return {
            "status": "skipped",
            "reason": "Need at least 2 review logs to train",
            "reviews_provided": len(review_logs),
        }

    # Rebuild optimizer with batch learning rate
    trainable_params = [p for p in model.parameters() if p.requires_grad]
    batch_optimizer = torch.optim.Adam(trainable_params, lr=learning_rate)

    # Build the full graph
    result = build_review_graph(review_logs, vocab_items)
    x, edge_index, edge_time, _, _ = result

    if x is None:
        return {"status": "skipped", "reason": "Could not build graph from data"}

    # Create targets based on per-vocabulary aggregated ratings
    vocab_stats = {}
    for log in review_logs:
        vid = log["vocabulary_id"]
        if vid not in vocab_stats:
            vocab_stats[vid] = {"ratings": [], "count": 0, "correct": 0}
        vocab_stats[vid]["ratings"].append(log.get("rating", 3))
        vocab_stats[vid]["count"] += 1
        if log.get("rating", 0) >= 3:
            vocab_stats[vid]["correct"] += 1

    # Build target tensor: retention probability per node
    N = x.size(0)
    targets = torch.full((N,), 0.5, dtype=torch.float32)

    # Map vocab stats to node indices
    node_ids = sorted(vocab_stats.keys())
    for idx, vid in enumerate(node_ids):
        stats = vocab_stats[vid]
        # Retention = accuracy (correct/total)
        accuracy = stats["correct"] / max(stats["count"], 1)
        targets[idx] = accuracy

    # Training loop
    model.train()
    losses = []

    for epoch in range(epochs):
        batch_optimizer.zero_grad()
        predictions = model(x, edge_index, edge_time)  # [N, 1]
        loss = _contrastive_loss(predictions, targets, edge_index)
        loss.backward()
        batch_optimizer.step()
        losses.append(loss.item())

    model.eval()

    # Save the updated model
    save_model()

    _stats["total_batch_trainings"] += 1
    _stats["last_batch_loss"] = round(losses[-1], 6)

    return {
        "status": "success",
        "epochs": epochs,
        "losses": [round(l, 6) for l in losses],
        "final_loss": round(losses[-1], 6),
        "nodes": N,
        "edges": edge_index.size(1),
        "reviews_used": len(review_logs),
        "vocab_coverage": len(vocab_stats),
        "learning_rate": learning_rate,
    }


# ─── Model Persistence ────────────────────────────────────────────


def save_model(path: Optional[str] = None) -> str:
    """Save the current model weights to disk.

    Args:
        path: Custom save path. Defaults to tcgl_learned.pth in ml_model/

    Returns:
        Path where model was saved
    """
    model = get_model()
    save_path = path or _SAVE_MODEL_PATH

    with _lock:
        torch.save(model.state_dict(), save_path)

    _stats["model_saved_at"] = datetime.now(timezone.utc).isoformat()
    _stats["model_source"] = "learned"
    print(f"[TGCL] Model saved to {save_path}")
    return save_path


# ─── Info & Status ────────────────────────────────────────────────


def get_initial_state() -> dict:
    """Get initial learning state for a new card."""
    return {
        "ease_factor": 2.5,
        "interval_days": 0,
        "repetitions": 0,
        "next_review_at": None,
    }


def is_model_loaded() -> bool:
    """Check if the TGCL model is loaded."""
    return _model is not None


def get_model_info() -> dict:
    """Get comprehensive info about the model and its learning state."""
    try:
        model = get_model()
        trainable = sum(p.numel() for p in model.parameters() if p.requires_grad)
        total = sum(p.numel() for p in model.parameters())

        return {
            "active_model": "TGCL (Temporal Graph Contrastive Learning) — Dynamic PyTorch",
            "model_loaded": True,
            "can_learn": True,
            "model_source": _stats["model_source"],
            "model_loaded_at": _stats["model_loaded_at"],
            "model_saved_at": _stats["model_saved_at"],
            "architecture": {
                "node_embedding": f"nn.Embedding({model.node_embedding.num_embeddings}, {model.node_embedding.embedding_dim}) — FROZEN",
                "time_encoder": "Linear(1 → 16)",
                "graph_conv_1": "CustomGraphConv(51 → 64) + BatchNorm — TRAINABLE",
                "graph_conv_2": "CustomGraphConv(64 → 64) + BatchNorm — TRAINABLE",
                "classifier": "MLP(64 → 32 → 1) — TRAINABLE",
            },
            "parameters": {
                "total": total,
                "trainable": trainable,
                "frozen": total - trainable,
            },
            "learning": {
                "online_lr": ONLINE_LR,
                "online_steps_per_review": ONLINE_MAX_STEPS,
                "batch_lr": BATCH_LR,
                "batch_default_epochs": BATCH_EPOCHS,
                "total_predictions": _stats["total_predictions"],
                "total_online_updates": _stats["total_online_updates"],
                "total_batch_trainings": _stats["total_batch_trainings"],
                "last_online_loss": _stats["last_online_loss"],
                "last_batch_loss": _stats["last_batch_loss"],
            },
            "fallback": "SM-2 (SuperMemo)",
            "node_features": NODE_FEAT_DIM,
            "output": "recall probability / interval score",
            "save_path": _SAVE_MODEL_PATH,
        }
    except Exception as e:
        return {
            "active_model": "SM-2 (SuperMemo)",
            "model_loaded": False,
            "can_learn": False,
            "error": str(e),
            "fallback": "SM-2 is active because TGCL model could not be loaded",
        }


def get_training_stats() -> dict:
    """Get detailed training statistics."""
    return {
        **_stats,
        "learned_model_exists": os.path.exists(_SAVE_MODEL_PATH),
        "pretrained_model_exists": os.path.exists(MODEL_PATH),
    }
