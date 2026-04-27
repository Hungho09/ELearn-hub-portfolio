"""User router - Profile management and avatar upload.

Endpoints:
- GET  /api/user/profile  - Get user profile
- PUT  /api/user/profile  - Update user profile
- POST /api/user/avatar   - Upload avatar image
"""

import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import UserUpdateRequest, UserResponse

router = APIRouter(prefix="/api/user", tags=["User"])


@router.get("/profile", response_model=UserResponse)
def get_profile(user_id: str = Query(..., description="User ID from NextAuth session"), db: Session = Depends(get_db)):
    """Get user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(**user.to_dict())


@router.put("/profile", response_model=UserResponse)
def update_profile(
    request: UserUpdateRequest,
    user_id: str = Query(..., description="User ID from NextAuth session"),
    db: Session = Depends(get_db),
):
    """Update user profile (name and/or bio)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if request.name is not None:
        user.name = request.name
    if request.bio is not None:
        user.bio = request.bio

    user.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)

    return UserResponse(**user.to_dict())


@router.post("/avatar")
async def upload_avatar(
    user_id: str = Query(..., description="User ID from NextAuth session"),
    avatar: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload avatar image for a user.

    Saves the file to the Next.js public directory so it's accessible via URL.
    """
    ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    MAX_SIZE = 5 * 1024 * 1024  # 5MB

    # Validate file type
    if avatar.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP"
        )

    # Read file content
    content = await avatar.read()

    # Validate file size
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 5MB")

    # Generate unique filename
    ext = os.path.splitext(avatar.filename or "image.jpg")[1]
    if not ext:
        ext = f".{avatar.content_type.split('/')[1]}"
    filename = f"{uuid.uuid4().hex}{ext}"

    # Save to Next.js public directory
    upload_dir = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "public", "images", "uploads")
    )
    os.makedirs(upload_dir, exist_ok=True)
    filepath = os.path.join(upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    # Update user avatar in database
    avatar_url = f"/images/uploads/{filename}"
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.avatar = avatar_url
    user.updated_at = datetime.now(timezone.utc)
    db.commit()

    return {"avatarUrl": avatar_url}
