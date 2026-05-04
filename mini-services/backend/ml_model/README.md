# ML Model Directory — TCGL Integration

## Current Model: Temporal Contrastive Graph Learning (TCGL)

Your trained TCGL model (`model.pth`) is integrated as the primary
flashcard scheduling algorithm. **The model can both predict AND learn
from user data** — it updates its weights after each review.

## File Structure

```
ml_model/
├── __init__.py             # Package init
├── model.py                # Full PyTorch TCGL model class definition
├── predict.py              # ACTIVE: Dynamic prediction + online learning + batch training
├── predict_lite.py         # ARCHIVED: NumPy-only inference (frozen, no learning)
├── tcgl_weights.npz        # ARCHIVED: Pre-extracted weights for predict_lite.py
├── tcgl_learned.pth        # Auto-generated: Saved model after online/batch training
└── README.md               # This file
```

## How It Learns

### 1. Online Learning (Automatic)
After every review submission (`POST /api/flashcards/review`):
- The model predicts the retention score for the card
- It compares the prediction against the actual rating
- It performs 3 gradient steps to update the graph conv + classifier weights
- The embedding layer stays frozen (pre-trained, too large to overfit)

### 2. Batch Training (On-Demand)
Call `POST /api/flashcards/train` to fine-tune on all accumulated data:
- Builds a full graph from all your review logs
- Trains for 10 epochs (configurable)
- Saves the updated model to `tcgl_learned.pth`
- Next startup loads the learned model automatically

### 3. Model Persistence
- After batch training → model saved to `tcgl_learned.pth`
- After online learning → model stays in memory (not auto-saved)
- On restart → learned model loaded first, then pretrained, then fresh init

## Architecture

```
Input: Graph(nodes=vocab words, edges=review history, times=time deltas)
  │
  ├── Node Embedding: nn.Embedding(78139, 16) — FROZEN
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
  ┌─── CustomGraphConv(51→64) + BatchNorm + ReLU — TRAINABLE
  │
  ┌─── CustomGraphConv(64→64) + BatchNorm + ReLU — TRAINABLE
  │
  └─── Classifier MLP: 64→32→1 (recall probability) — TRAINABLE
```

## API Endpoints

- `POST /api/flashcards/review` — Review a card (TCGL predicts + learns, SM-2 fallback)
- `POST /api/flashcards/train` — Batch train model on all review data
- `GET  /api/flashcards/model-info` — Model status, architecture, learning stats
- `GET  /api/flashcards/training-stats` — Detailed training statistics
- `GET  /api/review-logs/{user_id}/export` — Export all review data

## To Retrain the Model from Scratch

1. Export review logs: `GET /api/review-logs/{user_id}/export`
2. Train your model externally using the review data
3. Save as `model.pth` with the same architecture (or update `model.py`)
4. Delete `tcgl_learned.pth` so the new model gets loaded
5. Restart the backend

## To Use a Different Model

Replace `predict.py` with your own inference module. Keep the same
interface for `predict_next_review()` and `get_initial_state()`.
Update the import in `routers/flashcard.py` to point to your new module.
