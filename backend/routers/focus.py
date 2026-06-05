"""FastAPI Focus Space Router — Vision Focus Tracking and EXP Rewards.

Handles real-time webcam landmark analysis and commits gamification rewards
when Pomodoro focus sessions successfully complete.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db
from models import User
from gamification import calculate_new_level, next_level_xp
import traceback

router = APIRouter(prefix="/api/workspace/focus", tags=["Focus Workspace"])

# Try to import PyTorch tracking module
try:
    from ml_model.focus_tracker import predict_focus, is_focus_model_loaded
    _TRACKER_AVAILABLE = True
except ImportError:
    _TRACKER_AVAILABLE = False


# ─── Pydantic Validation Schemas ─────────────────────────────────

class FocusTrackRequest(BaseModel):
    """Input sequence data containing 10 historical frames of 5 face metrics."""
    sequence: list[list[float]] = Field(
        ...,
        min_length=10,
        max_length=10,
        description="List of exactly 10 frames, each containing [EAR, MAR, Pitch, Yaw, Roll]"
    )


class FocusTrackResponse(BaseModel):
    """Result of vision model analysis."""
    focused: bool = Field(..., description="Whether the user is currently serious/focused")
    confidence: float = Field(..., description="LSTM classification confidence [0.0 - 1.0]")


class FocusCompleteRequest(BaseModel):
    """Saves final study results after completing Pomodoro."""
    user_id: str = Field(..., description="User ID from NextAuth session")
    xp_change: int = Field(..., description="Total accumulated XP from tracking (+ gain or - loss)")


class FocusCompleteResponse(BaseModel):
    """User gamification status after focus session rewards are applied."""
    xp_gained: int = Field(0, description="Amount of XP added")
    xp_lost: int = Field(0, description="Amount of XP subtracted")
    total_xp: int = Field(..., description="User's new total XP points")
    current_level: int = Field(..., description="User's new level")
    levels_gained: int = Field(..., description="Number of levels gained in this session")
    next_level_xp: int = Field(..., description="XP needed to reach next level milestone")


# ─── Router Endpoints ─────────────────────────────────────────────

@router.post("/track", response_model=FocusTrackResponse)
def track_focus(req: FocusTrackRequest):
    """Run real-time vision inference on client-side landmark features.

    Returns the focus state and prediction confidence.
    If the model fails to load (e.g. file corrupted), throws a clean HTTP 500.
    """
    if not _TRACKER_AVAILABLE:
        raise HTTPException(
            status_code=503,
            detail="Vision Focus tracking dependencies (PyTorch) are not available on the server."
        )

    try:
        # Run model inference on sequence [10, 5]
        is_focused, confidence = predict_focus(req.sequence)
        return FocusTrackResponse(focused=is_focused, confidence=confidence)
    except RuntimeError as re:
        # Catches loading errors caused by a corrupted/missing best_model_lstm.pth file
        raise HTTPException(
            status_code=500,
            detail=f"Focus tracking model loading failure: {str(re)}"
        )
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process focus prediction sequence: {type(e).__name__}: {str(e)}"
        )


@router.post("/complete", response_model=FocusCompleteResponse)
def complete_focus_session(req: FocusCompleteRequest, db: Session = Depends(get_db)):
    """Commit accumulated study session XP to the user database.

    Accrues focus rewards and subtracts distraction penalties.
    Updates levels dynamically using the gamification engine.
    """
    user = db.query(User).filter(User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_xp = user.xp_points
    old_level = user.current_level

    # Compute XP changes
    xp_gained = max(req.xp_change, 0)
    xp_lost = abs(min(req.xp_change, 0))

    # Apply changes with clamping to prevent negative XP
    new_xp = max(old_xp + req.xp_change, 0)
    user.xp_points = new_xp

    # Check for level up (levels gained)
    new_level, levels_gained = calculate_new_level(user.xp_points, user.current_level)
    if levels_gained > 0:
        user.current_level = new_level

    db.commit()
    db.refresh(user)

    print(f"[FocusSpace] Completed session for {req.user_id}: XP={old_xp} -> {user.xp_points} "
          f"(gained={xp_gained}, lost={xp_lost}), level={old_level} -> {user.current_level} "
          f"(gained={levels_gained} levels)")

    # Compute next level ceiling
    nxt_ceil = next_level_xp(user.current_level)

    return FocusCompleteResponse(
        xp_gained=xp_gained,
        xp_lost=xp_lost,
        total_xp=user.xp_points,
        current_level=user.current_level,
        levels_gained=levels_gained,
        next_level_xp=nxt_ceil
    )
