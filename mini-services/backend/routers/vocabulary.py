"""Vocabulary router - Vocabulary CRUD and enrichment operations.

Endpoints:
- GET  /api/vocabulary           - List all vocabulary (with filters)
- POST /api/vocabulary           - Add new vocabulary
- POST /api/vocabulary/enrich    - Enrich vocabulary from external APIs (Glosbe + MyMemory)
- POST /api/vocabulary/auto-enrich - Auto-enrich in bulk (100+ words at a time)
- GET  /api/vocabulary/categories - List all categories with word counts
- GET  /api/vocabulary/random    - Get a random vocabulary item
"""

import random
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from database import get_db
from models import Vocabulary
from schemas import VocabularyCreate, VocabularyResponse, VocabularyCardResponse, EnrichResponse, CategoryInfo

router = APIRouter(prefix="/api/vocabulary", tags=["Vocabulary"])


# ─── Comprehensive English Words by Difficulty Level ──────────────
# 1000+ words organized by difficulty, used for the enrich endpoint

COMMON_WORDS = {
    1: [  # Beginner (~400 words)
        # Basic objects
        "apple", "house", "car", "dog", "cat", "tree", "book", "chair", "door", "window",
        "table", "food", "clothes", "shoes", "bag", "pen", "paper", "phone", "computer", "bed",
        "kitchen", "bathroom", "garden", "street", "road", "city", "country", "river", "mountain", "sea",
        "sky", "star", "moon", "fire", "earth", "ground", "wall", "floor", "roof", "room",
        "name", "age", "job", "home", "family", "school", "office", "store", "market", "park",
        "morning", "afternoon", "evening", "night", "day", "week", "month", "year", "spring", "summer",
        "autumn", "winter", "sun", "cloud", "rain", "snow", "wind", "air", "light", "dark",
        # Common nouns
        "water", "milk", "egg", "rice", "bread", "meat", "fish", "chicken", "fruit", "vegetable",
        "coffee", "tea", "sugar", "salt", "oil", "butter", "cheese", "soup", "cake", "ice",
        "mother", "father", "brother", "sister", "baby", "grandmother", "grandfather", "uncle", "aunt", "cousin",
        "son", "daughter", "husband", "wife", "parent", "friend", "neighbor", "child", "boy", "girl",
        "man", "woman", "person", "people", "teacher", "student", "doctor", "nurse", "driver", "farmer",
        "head", "hand", "eye", "ear", "nose", "mouth", "hair", "face", "finger", "toe",
        "arm", "leg", "foot", "back", "neck", "shoulder", "knee", "heart", "stomach", "tooth",
        "red", "blue", "green", "yellow", "white", "black", "orange", "pink", "purple", "brown",
        "dog", "cat", "bird", "fish", "horse", "cow", "pig", "rabbit", "duck", "chicken",
        "mouse", "snake", "monkey", "tiger", "lion", "bear", "elephant", "frog", "ant", "bee",
        "car", "bus", "train", "bicycle", "airplane", "boat", "ship", "truck", "taxi", "motorcycle",
        "shirt", "pants", "dress", "skirt", "hat", "jacket", "coat", "sock", "shoe", "glove",
        "happy", "sad", "angry", "tired", "hungry", "thirsty", "cold", "hot", "big", "small",
        "good", "bad", "new", "old", "fast", "slow", "long", "short", "tall", "short",
        "beautiful", "ugly", "easy", "hard", "clean", "dirty", "rich", "poor", "strong", "weak",
        "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "hundred", "thousand", "million", "zero", "first", "second", "third", "half", "quarter", "double",
        # Common verbs
        "go", "come", "eat", "drink", "sleep", "walk", "run", "sit", "stand", "look",
        "see", "hear", "speak", "listen", "read", "write", "play", "work", "study", "teach",
        "learn", "think", "know", "want", "need", "like", "love", "hate", "help", "try",
        "open", "close", "start", "stop", "give", "take", "buy", "sell", "pay", "send",
        "make", "do", "say", "tell", "ask", "answer", "call", "wait", "leave", "arrive",
        "cook", "wash", "clean", "drive", "fly", "swim", "sing", "dance", "laugh", "cry",
        "wake", "carry", "hold", "pull", "push", "turn", "move", "show", "watch", "find",
        "use", "keep", "bring", "put", "set", "grow", "cut", "fall", "break", "spend",
    ],
    2: [  # Intermediate (~400 words)
        # Abstract nouns
        "adventure", "ancient", "balance", "behavior", "celebrate", "challenge", "comfort",
        "communication", "comparison", "concentration", "connection", "contribution", "curiosity",
        "danger", "decision", "distance", "education", "emotion", "encouragement", "energy",
        "environment", "entertainment", "equipment", "evidence", "exchange", "experience",
        "explanation", "exploration", "freedom", "friendship", "generation", "government",
        "growth", "guidance", "happiness", "health", "hesitation", "honesty", "hunger",
        "identity", "imagination", "importance", "impression", "improvement", "incident",
        "independence", "influence", "information", "injury", "inspiration", "instruction",
        "introduction", "invitation", "judgment", "justice", "knowledge", "language",
        "leadership", "library", "literature", "memory", "message", "method", "mistake",
        "moment", "movement", "mystery", "nation", "nature", "necessity", "negotiation",
        "observation", "opinion", "opportunity", "organization", "patience", "permission",
        "personality", "perspective", "philosophy", "planning", "pleasure", "population",
        "position", "possibility", "poverty", "prediction", "preparation", "presentation",
        "pressure", "principle", "priority", "probability", "problem", "process", "progress",
        "project", "promise", "protection", "protest", "quality", "quantity", "question",
        "reaction", "reason", "recognition", "recommendation", "recovery", "reduction",
        "reflection", "relationship", "religion", "reputation", "requirement", "research",
        "resource", "respect", "responsibility", "result", "reward", "risk", "rule",
        "safety", "satisfaction", "schedule", "science", "security", "selection", "service",
        "shelter", "situation", "skill", "solution", "spirit", "strategy", "strength",
        "struggle", "success", "suggestion", "support", "surprise", "survival", "symbol",
        "system", "talent", "technology", "temperature", "theory", "thought", "tradition",
        "trouble", "trust", "truth", "understanding", "unity", "value", "variety",
        "victory", "violence", "virtue", "vision", "volunteer", "wealth", "weapon",
        "weather", "wedding", "welcome", "wisdom", "wonder", "wood", "workshop", "worry",
        # Common adjectives
        "ambitious", "anxious", "appropriate", "attractive", "available", "aware",
        "beautiful", "beneficial", "bitter", "boring", "brave", "brilliant",
        "capable", "careful", "casual", "certain", "charming", "cheap",
        "cheerful", "clear", "clever", "comfortable", "common", "complex",
        "confident", "confused", "conscious", "consistent", "constant", "convenient",
        "cool", "correct", "creative", "critical", "cruel", "curious",
        "dangerous", "dear", "decent", "delicious", "desperate", "different",
        "difficult", "disappointed", "discrete", "distant", "distinct", "disturbed",
        "dramatic", "dull", "eager", "efficient", "elaborate", "elegant",
        "embarrassed", "emotional", "energetic", "enormous", "enthusiastic", "essential",
        "exact", "excellent", "excited", "exciting", "expensive", "experienced",
        "extraordinary", "faithful", "familiar", "famous", "fancy", "fantastic",
        "fascinating", "favorable", "fearful", "federal", "fierce", "flexible",
        "fortunate", "fragile", "frequent", "friendly", "frustrated", "funny",
        "generous", "gentle", "genuine", "glorious", "graceful", "grateful",
        "guilty", "handsome", "helpful", "hopeful", "horrible", "hostile",
        "humble", "humorous", "ignorant", "illegal", "imaginary", "immediate",
        "immense", "impatient", "impressive", "incredible", "independent", "innocent",
        "intelligent", "intense", "interesting", "invisible", "jealous", "junior",
        "keen", "kind", "late", "lazy", "legal", "legendary",
        "likely", "lonely", "loose", "loud", "lovely", "lucky",
        "magnificent", "mature", "mean", "mysterious", "narrow", "naughty",
        "nearby", "neat", "nervous", "noble", "normal", "obvious",
        "odd", "official", "ordinary", "original", "painful", "peaceful",
        "peculiar", "permanent", "pleasant", "polite", "popular", "powerful",
        "precious", "pregnant", "primitive", "private", "probable", "professional",
        "proper", "proud", "psychological", "public", "pure", "rare",
        "reasonable", "regular", "reliable", "remarkable", "remote", "responsible",
        "rough", "rude", "sacred", "sensitive", "serious", "severe",
        "sharp", "significant", "silly", "sincere", "slight", "smart",
        "smooth", "social", "solid", "sophisticated", "specific", "spiritual",
        "stable", "steady", "strange", "strict", "sudden", "suitable",
        "super", "sure", "suspicious", "sweet", "talented", "terrible",
        "thick", "thin", "thorough", "tight", "tiny", "tired",
        "tough", "typical", "unable", "uncomfortable", "unfair", "unfortunate",
        "unique", "unusual", "upset", "urgent", "useful", "vacant",
        "vague", "valid", "valuable", "vast", "violent", "visible",
        "vital", "vivid", "voluntary", "warm", "wealthy", "weekly",
        "weird", "wet", "wide", "wild", "wise", "worthy",
    ],
    3: [  # Advanced (~200 words)
        "accomplish", "acknowledge", "acquisition", "adequate", "advocate", "alleviate",
        "ambiguous", "analyze", "anticipate", "appreciate", "approximate", "articulate",
        "atmosphere", "bureaucracy", "catastrophe", "circumstances", "coincidence", "comprehensive",
        "consequence", "contemporary", "controversy", "demonstrate", "deteriorate", "discrimination",
        "elaborate", "enthusiasm", "equivalent", "establish", "exaggerate", "extraordinary",
        "fundamental", "hypothesis", "implement", "inevitable", "infrastructure", "legitimate",
        "magnificent", "manipulate", "negotiate", "phenomenon", "predominant", "prejudice",
        "privilege", "propaganda", "psychology", "rehabilitate", "revolution", "sophisticated",
        "spontaneous", "substantiate", "supplementary", "surveillance", "sustainable", "temperament",
        "thorough", "unprecedented", "vulnerable", "accommodation", "administration", "authentication",
        "civilization", "collaboration", "consciousness", "constitution", "correspondence",
        "differentiate", "dissatisfaction", "entrepreneur", "experiment", "globalization",
        "humanitarian", "identification", "immigration", "interpretation", "investigation",
        "manufacture", "mathematician", "overwhelming", "philosophical", "professionalism",
        "recognition", "reconstruction", "representation", "semiconductor", "transportation",
        "abandon", "abolish", "absorb", "abstract", "abundant", "accelerate",
        "accommodate", "accumulate", "accurate", "adapt", "adhere", "adjacent",
        "adversary", "affiliate", "affirm", "aggravate", "aggregate", "allocate",
        "amendment", "anonymous", "apparatus", "arbitrary", "authentic", "benchmark",
        "bilingual", "breach", "catalog", "chronic", "clause", "coherent",
        "commemorate", "compile", "compliance", "conceive", "confiscate", "congregated",
        "consolidate", "contemplate", "contradict", "controversial", "convene", "cordial",
        "correspond", "culminate", "deduction", "deficiency", "delegate", "deliberate",
        "deprivation", "designation", "deteriorate", "diminish", "discrepancy", "displace",
        "disposition", "disseminate", "doctrine", "domain", "dominate", "duration",
        "elicit", "embedded", "emission", "endeavor", "epidemic", "erode",
        "ethical", "evacuate", "exemplify", "exploit", "exposition", "extract",
        "facilitate", "feasible", "fluctuate", "formation", "formulate", "franchise",
        "gratuitous", "harassment", "heritage", "hierarchy", "illuminate", "implication",
        "imposition", "incentive", "incorporate", "indicator", "indigenous", "indulge",
        "inflation", "initiative", "innovation", "inspection", "institution", "integral",
        "intensify", "interfere", "intervention", "intricate", "inventory", "irony",
        "jurisdiction", "landmark", "legislation", "leverage", "liability", "mandate",
        "mechanism", "mitigate", "monopoly", "nominate", "obligation", "omission",
        "optimum", "paradigm", "parameter", "penalty", "perceive", "petition",
        "plea", "pledge", "postulate", "prerogative", "procurement", "profound",
        "prohibit", "propagate", "proposition", "provision", "proximity", "purport",
        "ratify", "recession", "reconcile", "referendum", "relevance", "remuneration",
        "resilient", "respective", "restraint", "retention", "revenue", "sanction",
        "scrutiny", "simultaneous", "solicit", "sovereign", "speculate", "stimulus",
        "stipulate", "subsequent", "substantiate", "safeguard", "terminate", "testimony",
        "threshold", "tract", "transition", "treaty", "tribunal", "trigger",
        "undermine", "uniform", "unilateral", "utilise", "verdict", "volatile",
        "warrant", "withhold",
    ],
}


class AutoEnrichResponse(BaseModel):
    """Response from auto-enrichment."""
    status: str
    added: int
    skipped: int
    errors: int
    total_in_db: int
    message: str


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


def _fetch_and_add_words(words: list[str], db: Session) -> tuple[int, int, int]:
    """Fetch word details from APIs and add to database.

    Uses Free Dictionary API for pronunciation/part of speech/examples,
    and MyMemory Translation API for Vietnamese translations.

    Returns: (added, skipped, errors)
    """
    import httpx

    existing_english = set(
        r[0].lower() for r in db.query(Vocabulary.english).all()
    )

    candidate_words = [w for w in words if w.lower() not in existing_english]

    if not candidate_words:
        return (0, 0, 0)

    added = 0
    skipped = 0
    errors = 0

    with httpx.Client(timeout=10.0) as client:
        for word in candidate_words:
            try:
                # Determine difficulty from which pool the word came from
                difficulty = 1
                for lvl, lvl_words in COMMON_WORDS.items():
                    if word in lvl_words:
                        difficulty = lvl
                        break

                # ── Fetch from Free Dictionary API ────────────
                pronunciation = None
                part_of_speech = None
                example_english = None

                try:
                    dict_resp = client.get(
                        f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
                    )
                    if dict_resp.status_code == 200:
                        dict_data = dict_resp.json()
                        if isinstance(dict_data, list) and len(dict_data) > 0:
                            entry = dict_data[0]

                            if "phonetic" in entry and entry["phonetic"]:
                                pronunciation = entry["phonetic"]
                            elif "phonetics" in entry:
                                for p in entry["phonetics"]:
                                    if p.get("text"):
                                        pronunciation = p["text"]
                                        break

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
                            if translated and translated.upper() != word.upper():
                                vietnamese = translated
                            elif "matches" in trans_data and len(trans_data["matches"]) > 0:
                                for match in trans_data["matches"]:
                                    alt = match.get("translation", "")
                                    if alt and alt.upper() != word.upper():
                                        vietnamese = alt
                                        break
                except Exception as e:
                    print(f"[enrich] Translation API error for '{word}': {e}")

                if not vietnamese:
                    skipped += 1
                    continue

                english_word = word.capitalize()
                vietnamese = vietnamese.strip()

                # Determine category
                category = "General"
                if part_of_speech == "noun":
                    category = "General"
                elif part_of_speech == "verb":
                    category = "Verbs"
                elif part_of_speech in ("adjective", "adverb"):
                    category = "Adjectives"

                # Translate example sentence
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
                added += 1

            except Exception as e:
                print(f"[enrich] Error processing word '{word}': {e}")
                errors += 1

    if added > 0:
        db.commit()

    return (added, skipped, errors)


@router.post("/enrich", response_model=EnrichResponse)
def enrich_vocabulary(
    count: int = Query(default=10, ge=1, le=50, description="Number of words to add"),
    level: Optional[int] = Query(default=None, ge=1, le=3, description="Difficulty level filter"),
    db: Session = Depends(get_db),
):
    """Enrich vocabulary from external APIs.

    Fetches word details from Free Dictionary API and Vietnamese
    translations from MyMemory Translation API. Uses a built-in list of
    1000+ common English words organized by difficulty level.

    Only adds words not already in the database.
    """
    # Select words from the appropriate difficulty level(s)
    if level:
        word_pool = COMMON_WORDS.get(level, [])
    else:
        word_pool = []
        for lvl_words in COMMON_WORDS.values():
            word_pool.extend(lvl_words)

    if not word_pool:
        raise HTTPException(status_code=400, detail="No words available for the specified level")

    # Shuffle and take up to `count` words
    random.shuffle(word_pool)
    to_fetch = word_pool[:count]

    added, skipped, errors = _fetch_and_add_words(to_fetch, db)

    # Get the items that were just added
    items = []
    if added > 0:
        new_items = db.query(Vocabulary).order_by(Vocabulary.id.desc()).limit(added).all()
        items = [VocabularyResponse(
            id=v.id, english=v.english, vietnamese=v.vietnamese,
            pronunciation=v.pronunciation, example_english=v.example_english,
            example_vietnamese=v.example_vietnamese, part_of_speech=v.part_of_speech,
            difficulty_level=v.difficulty_level, category=v.category,
            audio_url=v.audio_url, image_url=v.image_url, created_at=v.created_at,
        ) for v in new_items]

    return EnrichResponse(added=added, skipped=skipped, errors=errors, items=items)


@router.post("/auto-enrich", response_model=AutoEnrichResponse)
def auto_enrich_vocabulary(
    count: int = Query(default=100, ge=10, le=500, description="Number of words to try adding"),
    level: Optional[int] = Query(default=None, ge=1, le=3, description="Difficulty level filter"),
    db: Session = Depends(get_db),
):
    """Auto-enrich vocabulary in bulk from external APIs.

    Fetches a large batch of words from Free Dictionary API + MyMemory
    Translation API. This is designed to be called once to populate the
    database with 1000+ words.

    Only adds words not already in the database.
    """
    # Select words from the appropriate difficulty level(s)
    if level:
        word_pool = COMMON_WORDS.get(level, [])
    else:
        word_pool = []
        for lvl_words in COMMON_WORDS.values():
            word_pool.extend(lvl_words)

    if not word_pool:
        raise HTTPException(status_code=400, detail="No words available for the specified level")

    # Shuffle and take up to `count` words
    random.shuffle(word_pool)
    to_fetch = word_pool[:count]

    added, skipped, errors = _fetch_and_add_words(to_fetch, db)

    total_in_db = db.query(Vocabulary).count()

    return AutoEnrichResponse(
        status="success" if added > 0 else "no_new_words",
        added=added,
        skipped=skipped,
        errors=errors,
        total_in_db=total_in_db,
        message=f"Added {added} new words, skipped {skipped} (no translation), {errors} errors. Total in DB: {total_in_db}",
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

    total = query.count()
    if total == 0:
        raise HTTPException(status_code=404, detail="No vocabulary items found matching the criteria")

    offset = random.randint(0, total - 1)
    vocab = query.offset(offset).first()

    if not vocab:
        raise HTTPException(status_code=404, detail="No vocabulary items found")

    card_dict = vocab.to_card_dict()
    return VocabularyCardResponse(**card_dict)
