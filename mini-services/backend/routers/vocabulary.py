"""Vocabulary router - Vocabulary CRUD operations.

Endpoints:
- GET  /api/vocabulary  - List all vocabulary (with filters)
- POST /api/vocabulary  - Add new vocabulary
"""

from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models import Vocabulary
from schemas import VocabularyCreate, VocabularyResponse

router = APIRouter(prefix="/api/vocabulary", tags=["Vocabulary"])


@router.get("", response_model=list[VocabularyResponse])
def list_vocabulary(
    category: Optional[str] = Query(default=None),
    difficulty: Optional[int] = Query(default=None, ge=1, le=3),
    search: Optional[str] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """List vocabulary with optional filters."""
    query = db.query(Vocabulary)

    if category:
        query = query.filter(Vocabulary.category == category)
    if difficulty:
        query = query.filter(Vocabulary.difficulty_level == difficulty)
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Vocabulary.english.ilike(search_term)) |
            (Vocabulary.vietnamese.ilike(search_term))
        )

    results = query.offset(skip).limit(limit).all()
    return [VocabularyResponse(
        id=v.id,
        english=v.english,
        vietnamese=v.vietnamese,
        pronunciation=v.pronunciation,
        example_english=v.example_english,
        example_vietnamese=v.example_vietnamese,
        part_of_speech=v.part_of_speech,
        difficulty_level=v.difficulty_level,
        category=v.category,
        audio_url=v.audio_url,
        image_url=v.image_url,
        created_at=v.created_at,
    ) for v in results]


@router.post("", response_model=VocabularyResponse, status_code=201)
def create_vocabulary(vocab: VocabularyCreate, db: Session = Depends(get_db)):
    """Add a new vocabulary item."""
    item = Vocabulary(**vocab.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return VocabularyResponse(
        id=item.id,
        english=item.english,
        vietnamese=item.vietnamese,
        pronunciation=item.pronunciation,
        example_english=item.example_english,
        example_vietnamese=item.example_vietnamese,
        part_of_speech=item.part_of_speech,
        difficulty_level=item.difficulty_level,
        category=item.category,
        audio_url=item.audio_url,
        image_url=item.image_url,
        created_at=item.created_at,
    )
