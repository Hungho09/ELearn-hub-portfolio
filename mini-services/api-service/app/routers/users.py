import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import AVATAR_UPLOAD_DIR
from app.database import get_db
from app.models import User

router = APIRouter(prefix="/api/user", tags=["users"])


# --- Pydantic schemas ---


class ProfileUpdateRequest(BaseModel):
    name: str | None = None
    bio: str | None = None


class ProfileResponse(BaseModel):
    id: str
    email: str
    name: str | None = None
    avatar: str | None = None
    bio: str | None = None
    role: str = "user"

    class Config:
        from_attributes = True


# --- Helpers ---


def user_to_response(user: User) -> ProfileResponse:
    return ProfileResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar=user.avatar,
        bio=user.bio,
        role=user.role,
    )


# --- Endpoints ---


@router.get("/profile", response_model=ProfileResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return user_to_response(current_user)


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if body.name is not None:
        current_user.name = body.name
    if body.bio is not None:
        current_user.bio = body.bio

    db.commit()
    db.refresh(current_user)
    return user_to_response(current_user)


@router.post("/avatar", response_model=ProfileResponse)
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Allowed: JPEG, PNG, GIF, WebP",
        )

    # Ensure upload directory exists
    os.makedirs(AVATAR_UPLOAD_DIR, exist_ok=True)

    # Generate unique filename
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "png"
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(AVATAR_UPLOAD_DIR, filename)

    # Save file
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)

    # Update user avatar path
    avatar_url = f"/images/uploads/{filename}"
    current_user.avatar = avatar_url
    db.commit()
    db.refresh(current_user)

    return user_to_response(current_user)
