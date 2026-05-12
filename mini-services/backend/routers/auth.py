"""Auth router - User registration and credential verification.

Endpoints:
- POST /api/auth/register  - Register a new user
- POST /api/auth/verify    - Verify credentials (used by NextAuth proxy)
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import User
from schemas import RegisterRequest, RegisterResponse, LoginVerifyRequest, LoginVerifyResponse
from auth import hash_password, verify_password, validate_email

router = APIRouter(prefix="/api/auth", tags=["Auth"])


@router.post("/register", response_model=RegisterResponse, status_code=201)
def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user.

    This creates the user in the Python-managed database.
    The Next.js proxy calls this endpoint when a user registers.
    NextAuth then creates a session for the user.
    """
    # Validate required fields
    if not request.name or not request.email or not request.password:
        raise HTTPException(status_code=400, detail="Name, email, and password are required")

    # Validate email format
    if not validate_email(request.email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # Validate password length
    if len(request.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == request.email).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Hash password
    hashed_pw = hash_password(request.password)

    # Generate user ID (compatible with cuid format)
    user_id = f"u_{uuid.uuid4().hex[:24]}"

    # Create user
    user = User(
        id=user_id,
        email=request.email,
        name=request.name,
        password=hashed_pw,
        role="user",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return RegisterResponse(**user.to_dict())


@router.post("/verify")
def verify_credentials(request: LoginVerifyRequest, db: Session = Depends(get_db)):
    """Verify user credentials.

    Used by the Next.js NextAuth proxy to validate email/password
    before creating a session. Returns user data if valid.
    """
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not user.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(request.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return LoginVerifyResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        avatar=user.avatar,
        role=user.role,
    )
