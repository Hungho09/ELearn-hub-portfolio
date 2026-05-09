"""Admin authorization dependency for FastAPI endpoints."""

from fastapi import Depends, HTTPException, Query
from sqlalchemy.orm import Session
from models import User
from database import get_db


def require_admin(
    user_id: str = Query(..., description="User ID - must have admin role"),
    db: Session = Depends(get_db),
) -> User:
    """Dependency that requires the user to have admin role.

    Returns the User object if admin, raises 403 otherwise.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user
