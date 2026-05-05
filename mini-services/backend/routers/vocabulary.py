"""Vocabulary router - Vocabulary CRUD and enrichment operations.

Endpoints:
- GET  /api/vocabulary           - List all vocabulary (with filters)
- POST /api/vocabulary           - Add new vocabulary
- POST /api/vocabulary/enrich    - Enrich vocabulary from external APIs
- GET  /api/vocabulary/categories - List all categories with word counts
- GET  /api/vocabulary/random    - Get a random vocabulary item
"""

import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Vocabulary
from schemas import VocabularyCreate, VocabularyResponse, VocabularyCardResponse, EnrichResponse, CategoryInfo

router = APIRouter(prefix="/api/vocabulary", tags=["Vocabulary"])


# ─── Common English Words by Difficulty Level ──────────────────────
# 200+ words organized by difficulty, used for the enrich endpoint

COMMON_WORDS = {
    1: [  # Beginner
        "apple", "house", "car", "dog", "cat", "tree", "book", "chair", "door", "window",
        "table", "food", "clothes", "shoes", "bag", "pen", "paper", "phone", "computer", "bed",
        "kitchen", "bathroom", "garden", "street", "road", "city", "country", "river", "mountain", "sea",
        "sky", "star", "moon", "fire", "earth", "ground", "wall", "floor", "roof", "room",
        "name", "age", "job", "home", "family", "school", "office", "store", "market", "park",
        "morning", "afternoon", "evening", "night", "day", "week", "month", "year", "spring", "summer",
        "autumn", "winter", "sun", "cloud", "rain", "snow", "wind", "air", "light", "dark",
    ],
    2: [  # Intermediate
        "adventure", "ancient", "announce", "arrange", "attempt", "balance", "behavior", "believe",
        "borrow", "celebrate", "challenge", "collect", "comfort", "communicate", "compare", "complain",
        "concentrate", "confuse", "connect", "consider", "contain", "continue", "contribute", "create",
        "curious", "dangerous", "decide", "deliver", "depend", "describe", "design", "develop",
        "discover", "discuss", "distance", "divide", "educate", "efficient", "emotion", "encourage",
        "enormous", "environment", "essential", "examine", "example", "exercise", "experience", "explore",
        "familiar", "furniture", "generous", "government", "gradual", "guarantee", "happiness", "hesitate",
        "imagine", "improve", "include", "increase", "independent", "influence", "information", "inspect",
        "introduce", "investigate", "knowledge", "language", "material", "measure", "medicine", "mention",
        "necessary", "neighbor", "opinion", "organize", "participate", "patient", "perfect", "permit",
        "popular", "possible", "practice", "prepare", "prevent", "produce", "progress", "protect",
        "provide", "purpose", "realize", "recommend", "reduce", "regular", "relax", "remember",
        "repair", "replace", "require", "respect", "responsible", "satisfy", "separate", "similar",
        "situation", "solution", "strength", "succeed", "suggest", "support", "survive", "technology",
        "temperature", "tradition", "trouble", "understand", "value", "variety", "visible", "volunteer",
        "weather", "welcome", "wonder", "achieve", "advantage", "ambition", "appearance", "arrangement",
    ],
    3: [  # Advanced
        "accomplish", "acknowledge", "acquisition", "adequate", "advocate", "alleviate", "ambiguous",
        "analyze", "anticipate", "appreciate", "approximate", "articulate", "assassination", "atmosphere",
        "bureaucracy", "catastrophe", "circumstances", "coincidence", "comprehensive", "consequence",
        "contemporary", "controversy", "demonstrate", "deteriorate", "discrimination", "elaborate",
        "enthusiasm", "equivalent", "establish", "exaggerate", "extraordinary", "fundamental", "hypothesis",
        "implement", "inevitable", "infrastructure", "legitimate", "magnificent", "manipulate", "negotiate",
        "phenomenon", "predominant", "prejudice", "privilege", "propaganda", "psychology", "rehabilitate",
        "revolution", "sophisticated", "spontaneous", "substantiate", "supplementary", "surveillance",
        "sustainable", "temperament", "thorough", "unprecedented", "vulnerable", "accommodation",
        "administration", "authentication", "civilization", "collaboration", "consciousness", "constitution",
        "correspondence", "differentiate", "dissatisfaction", "entrepreneur", "experiment", "globalization",
        "humanitarian", "identification", "immigration", "interpretation", "investigation", "manufacture",
        "mathematician", "misinterpretation", "overwhelming", "philosophical", "professionalism",
        "recognition", "reconstruction", "representation", "semiconductor", "transportation",
    ],
}


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


@router.post("/enrich", response_model=EnrichResponse)
def enrich_vocabulary(
    count: int = Query(default=10, ge=1, le=50, description="Number of words to add"),
    level: Optional[int] = Query(default=None, ge=1, le=3, description="Difficulty level filter"),
    db: Session = Depends(get_db),
):
    """Enrich vocabulary from external APIs.

    Fetches word details from the Free Dictionary API and Vietnamese
    translations from MyMemory Translation API. Has a built-in list of
    200+ common English words organized by difficulty level.

    Only adds words not already in the database.
    """
    import httpx

    # Select words from the appropriate difficulty level(s)
    if level:
        word_pool = COMMON_WORDS.get(level, [])
    else:
        # Mix from all levels
        word_pool = []
        for lvl_words in COMMON_WORDS.values():
            word_pool.extend(lvl_words)

    if not word_pool:
        raise HTTPException(status_code=400, detail="No words available for the specified level")

    # Get words already in the database
    existing_english = set(
        r[0].lower() for r in db.query(Vocabulary.english).all()
    )

    # Filter out already-added words
    candidate_words = [w for w in word_pool if w.lower() not in existing_english]

    if not candidate_words:
        return EnrichResponse(added=0, skipped=0, errors=0, items=[])

    # Shuffle and take up to `count` words
    random.shuffle(candidate_words)
    to_fetch = candidate_words[:count]

    added = 0
    skipped = 0
    errors = 0
    items = []

    with httpx.Client(timeout=10.0) as client:
        for word in to_fetch:
            try:
                # ── Fetch from Free Dictionary API ────────────
                pronunciation = None
                part_of_speech = None
                example_english = None
                difficulty = 1

                # Determine difficulty from which pool the word came from
                for lvl, lvl_words in COMMON_WORDS.items():
                    if word in lvl_words:
                        difficulty = lvl
                        break

                try:
                    dict_resp = client.get(
                        f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
                    )
                    if dict_resp.status_code == 200:
                        dict_data = dict_resp.json()
                        if isinstance(dict_data, list) and len(dict_data) > 0:
                            entry = dict_data[0]

                            # Get pronunciation
                            if "phonetic" in entry and entry["phonetic"]:
                                pronunciation = entry["phonetic"]
                            elif "phonetics" in entry:
                                for p in entry["phonetics"]:
                                    if p.get("text"):
                                        pronunciation = p["text"]
                                        break

                            # Get part of speech and example
                            if "meanings" in entry and len(entry["meanings"]) > 0:
                                meaning = entry["meanings"][0]
                                part_of_speech = meaning.get("partOfSpeech")

                                if "definitions" in meaning and len(meaning["definitions"]) > 0:
                                    defn = meaning["definitions"][0]
                                    if defn.get("example"):
                                        example_english = defn["example"]
                except Exception as e:
                    print(f"[enrich] Dictionary API error for '{word}': {e}")

                # ── Fetch Vietnamese translation from MyMemory ─
                vietnamese = None
                try:
                    trans_resp = client.get(
                        f"https://api.mymemory.translated.net/get?q={word}&langpair=en|vi"
                    )
                    if trans_resp.status_code == 200:
                        trans_data = trans_resp.json()
                        if "responseData" in trans_data and "translatedText" in trans_data["responseData"]:
                            translated = trans_data["responseData"]["translatedText"]
                            # MyMemory sometimes returns uppercase; capitalize properly
                            if translated and translated.upper() != word.upper():
                                vietnamese = translated
                            elif "matches" in trans_data and len(trans_data["matches"]) > 0:
                                # Try alternative matches
                                for match in trans_data["matches"]:
                                    alt = match.get("translation", "")
                                    if alt and alt.upper() != word.upper():
                                        vietnamese = alt
                                        break
                except Exception as e:
                    print(f"[enrich] Translation API error for '{word}': {e}")

                if not vietnamese:
                    # Skip words we can't translate
                    skipped += 1
                    continue

                # Capitalize properly
                english_word = word.capitalize()
                vietnamese = vietnamese.strip()

                # Determine category based on part of speech
                category = "General"
                if part_of_speech == "noun":
                    category = "General"
                elif part_of_speech == "verb":
                    category = "Verbs"
                elif part_of_speech in ("adjective", "adverb"):
                    category = "Adjectives"

                # Create example Vietnamese if we have the English example
                example_vietnamese = None
                if example_english:
                    try:
                        ex_trans = client.get(
                            f"https://api.mymemory.translated.net/get?q={example_english}&langpair=en|vi"
                        )
                        if ex_trans.status_code == 200:
                            ex_data = ex_trans.json()
                            if "responseData" in ex_data and "translatedText" in ex_data["responseData"]:
                                example_vietnamese = ex_data["responseData"]["translatedText"]
                    except Exception:
                        pass

                # Add to database
                vocab_item = Vocabulary(
                    english=english_word,
                    vietnamese=vietnamese,
                    pronunciation=pronunciation,
                    example_english=example_english,
                    example_vietnamese=example_vietnamese,
                    part_of_speech=part_of_speech,
                    difficulty_level=difficulty,
                    category=category,
                )
                db.add(vocab_item)
                db.flush()  # Get the ID

                items.append(VocabularyResponse(
                    id=vocab_item.id,
                    english=vocab_item.english,
                    vietnamese=vocab_item.vietnamese,
                    pronunciation=vocab_item.pronunciation,
                    example_english=vocab_item.example_english,
                    example_vietnamese=vocab_item.example_vietnamese,
                    part_of_speech=vocab_item.part_of_speech,
                    difficulty_level=vocab_item.difficulty_level,
                    category=vocab_item.category,
                    audio_url=vocab_item.audio_url,
                    image_url=vocab_item.image_url,
                    created_at=vocab_item.created_at,
                ))
                added += 1

            except Exception as e:
                print(f"[enrich] Error processing word '{word}': {e}")
                errors += 1

    db.commit()

    return EnrichResponse(
        added=added,
        skipped=skipped,
        errors=errors,
        items=items,
    )


@router.get("/categories", response_model=list[CategoryInfo])
def list_categories(
    db: Session = Depends(get_db),
):
    """List all available vocabulary categories with word counts."""
    results = (
        db.query(
            Vocabulary.category,
            func.count(Vocabulary.id).label("word_count"),
        )
        .filter(Vocabulary.category.isnot(None))
        .group_by(Vocabulary.category)
        .order_by(Vocabulary.category)
        .all()
    )

    return [
        CategoryInfo(category=category, word_count=count)
        for category, count in results
    ]


@router.get("/random", response_model=VocabularyCardResponse)
def get_random_vocabulary(
    category: Optional[str] = Query(default=None, description="Filter by category"),
    difficulty: Optional[int] = Query(default=None, ge=1, le=3, description="Filter by difficulty level"),
    db: Session = Depends(get_db),
):
    """Get a random vocabulary item (useful for 'word of the day')."""
    query = db.query(Vocabulary)

    if category:
        query = query.filter(Vocabulary.category == category)
    if difficulty:
        query = query.filter(Vocabulary.difficulty_level == difficulty)

    # Get count for random offset
    total = query.count()
    if total == 0:
        raise HTTPException(status_code=404, detail="No vocabulary items found matching the criteria")

    # Pick a random offset
    offset = random.randint(0, total - 1)
    vocab = query.offset(offset).first()

    if not vocab:
        raise HTTPException(status_code=404, detail="No vocabulary items found")

    card_dict = vocab.to_card_dict()
    return VocabularyCardResponse(**card_dict)
