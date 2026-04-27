# ML Model Directory

Place your trained ML model files here.

## Recommended Structure

```
ml_model/
├── model.pkl              # or .pt, .onnx, .h5 — your trained model file
├── predict.py             # Inference function (drop-in replacement for SM-2)
├── config.json            # Model hyperparams / metadata
└── train.py               # Training script (optional, for retraining)
```

## How to Replace SM-2 with Your Model

1. Create `predict.py` with a function matching this interface:

```python
def predict_next_review(
    rating: int,           # 1=Again, 2=Hard, 3=Good, 4=Easy
    ease_factor: float,    # Current ease factor
    interval_days: int,    # Current interval in days
    repetitions: int,      # Current repetition count
    # Add more params as needed from ReviewLog
) -> dict:
    """
    Returns:
        {
            "ease_factor": float,    # New ease factor
            "interval_days": int,    # New interval in days
            "repetitions": int,      # New repetition count
            "next_review_at": datetime,  # Next review date
        }
    """
    # Your model inference logic here
    pass
```

2. In `routers/flashcard.py`, replace the import:

```python
# OLD:
from spaced_repetition import calculate_sm2, get_initial_state

# NEW:
from ml_model.predict import predict_next_review as calculate_sm2
```

## Training Data

Export review logs for training via:
- `GET /api/review-logs/{user_id}/export` — Full JSON export of all review data
- `GET /api/review-logs/{user_id}` — Paginated review logs

Each log contains: rating, ease_factor, interval_days, repetitions,
response_time_ms, direction, session_id, reviewed_at, next_review_at
