# ML Model Directory — TCGL Integration

## Current Model: Temporal Contrastive Graph Learning (TCGL)

Your trained TCGL model (`model.pth`) is already integrated as the primary
flashcard scheduling algorithm, replacing SM-2.

## File Structure

```
ml_model/
├── __init__.py             # Package init
├── model.py                # Full PyTorch TCGL model class (for retraining/development)
├── predict.py              # Full inference with PyTorch (heavy, ~200MB)
├── predict_lite.py         # NumPy-only inference (lightweight, ~1.2MB) ← ACTIVE
├── tcgl_weights.npz        # Pre-extracted weights (69KB, no PyTorch at runtime)
└── README.md               # This file
```

## Architecture

```
Input: Graph(nodes=vocab words, edges=review history, times=time deltas)
  │
  ├── Node Embedding: hash-based pseudo-embedding (16 dims)
  ├── Time Encoder: Linear(1 → 16)
  └── Node Features: 19-dim feature vector per vocabulary
      │
      ├── [0]  difficulty_level (normalized 0-1)
      ├── [1]  category (normalized index)
      ├── [2]  part_of_speech (normalized index)
      ├── [3]  review_count (log-normalized)
      ├── [4]  accuracy (0-1)
      ├── [5]  current_ease_factor (/5)
      ├── [6]  current_interval_days (log-normalized)
      ├── [7]  repetitions (/20)
      ├── [8]  avg_response_time_ms (log-normalized)
      ├── [9]  days_since_last_review (log-normalized)
      ├── [10] last_rating (/4)
      ├── [11] direction_en_to_vi_ratio (0-1)
      ├── [12] session_count (log-normalized)
      ├── [13] consecutive_correct (/10)
      ├── [14] consecutive_incorrect (/10)
      ├── [15] total_time_spent_ms (log-normalized)
      ├── [16] mastery_score (0-1)
      ├── [17] forgetting_rate (0-1)
      └── [18] bias (1.0)
       │
  ┌─── CustomGraphConv(51→64) + BatchNorm + ReLU
  │
  ┌─── CustomGraphConv(64→64) + BatchNorm + ReLU
  │
  └─── Classifier MLP: 64→32→1 (recall probability / interval score)
```

## How It Works

1. **Review submitted** → Flashcard router calls `predict_lite.predict_next_review()`
2. **Graph built** from user's review history (nodes=vocab, edges=temporal+session)
3. **Inference** via NumPy forward pass through model weights
4. **Output** → scalar → mapped to interval days + ease factor
5. **SM-2 fallback** → automatic if model fails for any reason

## API Endpoints

- `GET /api/flashcards/model-info` — Shows active model status
- `POST /api/flashcards/review` — Uses TCGL (with SM-2 fallback)
- `GET /api/review-logs/{user_id}/export` — Export all review data for retraining

## To Retrain the Model

1. Export review logs: `GET /api/review-logs/{user_id}/export`
2. Train your model using the review data
3. Save as `model.pth` with the same architecture (or update `model.py`)
4. Re-extract weights: `python3 -c "from ml_model.predict_lite import _load_weights; ..."`
5. Or manually: extract numpy arrays from state_dict, save as `tcgl_weights.npz`

## To Use a Different Model

Replace `predict_lite.py` with your own inference module. Keep the same
interface for `predict_next_review()` and `get_initial_state()`.
Update the import in `routers/flashcard.py` to point to your new module.
