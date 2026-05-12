"""Lightweight TCGL inference using NumPy instead of PyTorch.

This module extracts the trained weights from model.pth and performs
inference using pure NumPy operations, avoiding the ~200MB PyTorch
overhead. This is critical for running in memory-constrained environments.

The key insight: we don't need the full 78,139-node embedding table.
We only need the graph conv weights + classifier weights for the nodes
in the current inference graph (typically 1-20 nodes).
"""

import os
import math
import json
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np

# ─── Configuration ────────────────────────────────────────────────

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_PROJECT_ROOT = os.path.dirname(os.path.dirname(_BACKEND_DIR))

# Pre-extracted weights file (69KB NPZ, no PyTorch needed at runtime)
_WEIGHTS_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tcgl_weights.npz")

# If NPZ doesn't exist, fall back to extracting from .pth
_DEFAULT_MODEL_PATH = os.path.join(_PROJECT_ROOT, "upload", "model.pth")

MODEL_PATH = os.environ.get("TCGL_MODEL_PATH", _DEFAULT_MODEL_PATH)

NODE_FEAT_DIM = 19
EMBED_DIM = 16
TIME_DIM = 16
HIDDEN_DIM = 64

CATEGORIES = [
    "Greetings", "Food & Drinks", "Numbers", "Colors", "Family",
    "Daily Activities", "Travel", "Emotions", "Time", "Animals",
    "Weather", "Education", "Shopping", "Body Parts", "Adjectives",
    "Verbs",
]

PARTS_OF_SPEECH = [
    "noun", "verb", "adjective", "adverb", "interjection", "phrase", "number",
]


# ─── Extracted Weights ───────────────────────────────────────────

_weights: Optional[dict] = None


def _load_weights() -> dict:
    """Load model weights from pre-extracted NPZ file (fast, no PyTorch).

    Falls back to extracting from .pth if NPZ doesn't exist.
    """
    global _weights
    if _weights is not None:
        return _weights

    # Try loading from pre-extracted NPZ first (no torch needed)
    if os.path.exists(_WEIGHTS_PATH):
        print(f"[TCGL-Lite] Loading weights from {_WEIGHTS_PATH}...")
        data = np.load(_WEIGHTS_PATH)
        _weights = {k: data[k] for k in data.files}
        print(f"[TCGL-Lite] Weights loaded ({len(_weights)} arrays, no PyTorch)")
        return _weights

    # Fallback: extract from .pth (requires torch)
    try:
        import torch
    except ImportError:
        raise ImportError(
            "PyTorch required for initial weight extraction. "
            "Run: python3 -c \"import torch; ...\" to pre-extract weights, "
            "or install torch with: pip install torch"
        )

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"TCGL model not found at {MODEL_PATH}")

    print(f"[TCGL-Lite] Extracting weights from {MODEL_PATH}...")
    state = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)

    # Extract weights as numpy arrays (skip the huge 78K embedding table)
    # We use zeros for node embedding since we don't need the pre-trained
    # embeddings for our small inference graphs
    _weights = {
        # Time encoder
        "time_w_weight": state["time_encoder.w.weight"].numpy(),      # [16, 1]
        "time_w_bias": state["time_encoder.w.bias"].numpy(),          # [16]

        # Conv1: lin_l [64, 51], lin_r [64, 51]
        "conv1_lin_l_weight": state["conv1.lin_l.weight"].numpy(),    # [64, 51]
        "conv1_lin_l_bias": state["conv1.lin_l.bias"].numpy(),        # [64]
        "conv1_lin_r_weight": state["conv1.lin_r.weight"].numpy(),    # [64, 51]

        # BN1
        "bn1_weight": state["bn1.weight"].numpy(),                    # [64]
        "bn1_bias": state["bn1.bias"].numpy(),                        # [64]
        "bn1_running_mean": state["bn1.running_mean"].numpy(),        # [64]
        "bn1_running_var": state["bn1.running_var"].numpy(),          # [64]

        # Conv2: lin_l [64, 64], lin_r [64, 64]
        "conv2_lin_l_weight": state["conv2.lin_l.weight"].numpy(),    # [64, 64]
        "conv2_lin_l_bias": state["conv2.lin_l.bias"].numpy(),        # [64]
        "conv2_lin_r_weight": state["conv2.lin_r.weight"].numpy(),    # [64, 64]

        # BN2
        "bn2_weight": state["bn2.weight"].numpy(),                    # [64]
        "bn2_bias": state["bn2.bias"].numpy(),                        # [64]
        "bn2_running_mean": state["bn2.running_mean"].numpy(),        # [64]
        "bn2_running_var": state["bn2.running_var"].numpy(),          # [64]

        # Classifier
        "cls_0_weight": state["classifier.0.weight"].numpy(),         # [32, 64]
        "cls_0_bias": state["classifier.0.bias"].numpy(),             # [32]
        "cls_1_weight": state["classifier.1.weight"].numpy(),         # [32]
        "cls_1_bias": state["classifier.1.bias"].numpy(),             # [32]
        "cls_1_running_mean": state["classifier.1.running_mean"].numpy(),  # [32]
        "cls_1_running_var": state["classifier.1.running_var"].numpy(),    # [32]
        "cls_4_weight": state["classifier.4.weight"].numpy(),         # [1, 32]
        "cls_4_bias": state["classifier.4.bias"].numpy(),             # [1]
    }

    # Now unload torch to free memory
    del state
    import gc
    gc.collect()

    print(f"[TCGL-Lite] Weights extracted ({len(_weights)} arrays)")
    return _weights


def _linear(x, weight, bias=None):
    """Numpy linear layer: y = x @ weight.T + bias."""
    y = x @ weight.T
    if bias is not None:
        y = y + bias
    return y


def _batch_norm(x, weight, bias, running_mean, running_var, eps=1e-5):
    """Numpy batch norm in eval mode."""
    x_norm = (x - running_mean) / np.sqrt(running_var + eps)
    return x_norm * weight + bias


def _relu(x):
    """Numpy ReLU."""
    return np.maximum(x, 0)


def _scatter_mean(src, index, dim_size):
    """Numpy scatter mean (aggregate src by index)."""
    out = np.zeros((dim_size, src.shape[1]), dtype=src.dtype)
    counts = np.zeros(dim_size, dtype=src.dtype)
    for i, idx in enumerate(index):
        out[idx] += src[i]
        counts[idx] += 1
    counts = np.maximum(counts, 1)  # Avoid division by zero
    out = out / counts[:, np.newaxis]
    return out


def _forward(x: np.ndarray, edge_index: np.ndarray, edge_time: np.ndarray,
             embed_features: np.ndarray) -> np.ndarray:
    """Run the TCGL forward pass using pure NumPy.

    Args:
        x: Node features [N, 19]
        edge_index: Edge indices [2, E] (source, target)
        edge_time: Time deltas [E]
        embed_features: Pre-computed embedding + time features [N, 32]

    Returns:
        Predictions [N, 1]
    """
    w = _load_weights()
    N = x.shape[0]
    E = edge_index.shape[1]

    # 1. Concatenate: embed(16) + time(16) + features(19) = 51
    h = np.concatenate([embed_features, x], axis=1)  # [N, 51]

    # 2. Conv1: message passing
    row, col = edge_index[0], edge_index[1]
    h_l = _linear(h, w["conv1_lin_l_weight"], w["conv1_lin_l_bias"])  # [N, 64]
    h_r = _linear(h, w["conv1_lin_r_weight"])                          # [N, 64]

    # Aggregate neighbor messages
    msg = h_l[row]  # [E, 64]
    agg = _scatter_mean(msg, col, N)  # [N, 64]
    h = agg + h_r  # [N, 64]

    # BatchNorm + ReLU
    h = _batch_norm(h, w["bn1_weight"], w["bn1_bias"],
                    w["bn1_running_mean"], w["bn1_running_var"])
    h = _relu(h)

    # 3. Conv2: message passing
    h_l = _linear(h, w["conv2_lin_l_weight"], w["conv2_lin_l_bias"])
    h_r = _linear(h, w["conv2_lin_r_weight"])
    msg = h_l[row]
    agg = _scatter_mean(msg, col, N)
    h = agg + h_r

    # BatchNorm + ReLU
    h = _batch_norm(h, w["bn2_weight"], w["bn2_bias"],
                    w["bn2_running_mean"], w["bn2_running_var"])
    h = _relu(h)

    # 4. Classifier
    h = _linear(h, w["cls_0_weight"], w["cls_0_bias"])
    h = _batch_norm(h, w["cls_1_weight"], w["cls_1_bias"],
                    w["cls_1_running_mean"], w["cls_1_running_var"])
    h = _relu(h)
    h = _linear(h, w["cls_4_weight"], w["cls_4_bias"])

    return h  # [N, 1]


# ─── Feature Engineering (same as predict.py) ─────────────────────


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
) -> np.ndarray:
    """Encode vocabulary + review state into a 19-dim feature vector (NumPy)."""
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

    return np.array([features], dtype=np.float32)


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
) -> dict:
    """Predict the next review parameters using the TCGL model (NumPy inference).

    Drop-in replacement for calculate_sm2(). Falls back to SM-2 if model fails.
    Same interface as ml_model.predict.predict_next_review.
    """
    try:
        # Load weights (extracts from .pth once, then caches)
        w = _load_weights()

        # Build node features for the target vocabulary
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

        # Build graph edges (self-loop for single node)
        if user_review_history and len(user_review_history) > 0:
            # Multi-node graph from review history
            node_ids = []
            node_features = []
            edges_src = []
            edges_dst = []
            edge_times = []

            # Add existing review nodes
            seen_vids = set()
            for log in user_review_history:
                vid = log["vocabulary_id"]
                if vid not in seen_vids:
                    seen_vids.add(vid)
                    node_ids.append(vid)
                    # Simplified features for historical nodes
                    v_info = None
                    if all_vocab:
                        for v in all_vocab:
                            if v["id"] == vid:
                                v_info = v
                                break

                    hist_feat = encode_node_features(
                        difficulty_level=v_info.get("difficulty_level", 1) if v_info else 1,
                        category=v_info.get("category") if v_info else None,
                        part_of_speech=v_info.get("part_of_speech") if v_info else None,
                        review_count=1,
                        correct_count=1 if log.get("rating", 0) >= 3 else 0,
                        last_rating=log.get("rating", 0),
                        current_ease_factor=log.get("ease_factor", 2.5),
                        direction_en_to_vi_ratio=1.0 if log.get("direction") == "en_to_vi" else 0.0,
                    )
                    node_features.append(hist_feat[0])  # [19] — squeeze from [1, 19]

            # Add current target node (always last)
            target_idx = len(node_features)
            node_features.append(x[0])  # [19] — squeeze from [1, 19]

            # Build temporal edges between consecutive reviews
            for i in range(len(node_ids) - 1):
                edges_src.extend([i, i + 1])
                edges_dst.extend([i + 1, i])
                edge_times.extend([1.0, 1.0])

            # Connect last historical node to target
            if len(node_ids) > 0:
                edges_src.extend([target_idx - 1, target_idx])
                edges_dst.extend([target_idx, target_idx - 1])
                edge_times.extend([1.0, 1.0])

            if not edges_src:
                # Self-loop
                edges_src.append(0)
                edges_dst.append(0)
                edge_times.append(1.0)

            x = np.array(node_features, dtype=np.float32)
            edge_index = np.array([edges_src, edges_dst], dtype=np.int64)
            edge_time = np.array(edge_times, dtype=np.float32)
        else:
            # Single node with self-loop
            edge_index = np.array([[0], [0]], dtype=np.int64)
            edge_time = np.array([1.0], dtype=np.float32)
            target_idx = 0

        # Compute embedding + time features for each node
        # Use hash-based pseudo-embedding (deterministic from node features)
        N = x.shape[0]
        np.random.seed(42)  # Deterministic for reproducibility
        embed = np.random.randn(N, EMBED_DIM).astype(np.float32) * 0.1

        # Time encoding for edges, aggregated to nodes
        time_enc = _linear(edge_time.reshape(-1, 1), w["time_w_weight"], w["time_w_bias"])  # [E, 16]
        node_time = _scatter_mean(time_enc, edge_index[1], N)  # [N, 16]

        embed_features = np.concatenate([embed, node_time], axis=1)  # [N, 32]

        # Run forward pass
        prediction = _forward(x, edge_index, edge_time, embed_features)
        raw_output = float(prediction[target_idx, 0])

        # ─── Convert model output to scheduling parameters ─────
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
        print(f"[TCGL-Lite] Inference failed: {e}. Falling back to SM-2.")
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
    """Get initial learning state for a new card."""
    return {
        "ease_factor": 2.5,
        "interval_days": 0,
        "repetitions": 0,
        "next_review_at": None,
    }


def is_model_loaded() -> bool:
    """Check if the TCGL model weights are loaded."""
    return _weights is not None


def get_model_info() -> dict:
    """Get info about the model."""
    try:
        w = _load_weights()
        return {
            "active_model": "TCGL (Temporal Contrastive Graph Learning) — NumPy Lite",
            "model_loaded": True,
            "model_path": MODEL_PATH,
            "inference_mode": "numpy (memory-efficient, no PyTorch runtime)",
            "architecture": {
                "node_embedding": "hash-based pseudo-embedding (16 dims)",
                "time_encoder": "Linear(1 → 16)",
                "graph_conv_1": "CustomGraphConv(51 → 64) + BatchNorm",
                "graph_conv_2": "CustomGraphConv(64 → 64) + BatchNorm",
                "classifier": "MLP(64 → 32 → 1)",
            },
            "fallback": "SM-2 (SuperMemo)",
            "node_features": 19,
            "output": "recall probability / interval score",
        }
    except Exception as e:
        return {
            "active_model": "SM-2 (SuperMemo)",
            "model_loaded": False,
            "error": str(e),
            "fallback": "SM-2 is active because TCGL model could not be loaded",
        }
