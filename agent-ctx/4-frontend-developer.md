# Task 4 - Frontend Flashcard Typing Redesign

## Agent: frontend-developer

## Summary

Redesigned the flashcard frontend from a flip-and-rate UI to a typing-and-auto-grade flow, preventing users from "cheating themselves" by self-rating poorly-remembered words as Good.

## Changes Made

### Python Backend (`mini-services/backend/`)

1. **schemas.py**:
   - Added `accepted_answers` field to `VocabularyCardResponse`
   - Added `user_answer` and `auto_rating` fields to `ReviewSubmit`
   - Added `auto_rating`, `accuracy`, `match_type` fields to `ReviewResult`
   - Added `CheckAnswerRequest` schema (vocabulary_id, user_answer, direction)
   - Added `CheckAnswerResponse` schema (vocabulary_id, correct_answer, user_answer, rating, accuracy, is_correct, match_type, similarity, pronunciation, example_english, example_vietnamese)

2. **routers/flashcard.py**:
   - Added `POST /api/flashcards/check-answer` endpoint using existing `grader.py` module
   - Maps grader match_type to frontend-friendly types (diacritics_ignored→close, none→incorrect, low-similarity partial→incorrect)
   - Converts accuracy from 0-1 decimal to 0-100 percentage
   - Made TCGL model import lazy/optional (try/except with SM-2 fallback functions)
   - Updated review endpoint to pass user_answer and auto_rating

### Next.js Frontend

1. **API Proxy Routes**:
   - Created `/src/app/api/flashcards/check-answer/route.ts` - Proxies check-answer requests to Python backend
   - Updated `/src/app/api/flashcards/review/route.ts` - Forwards user_answer and auto_rating fields

2. **Flashcard Page (`/src/app/flashcard/page.tsx`)** - Complete rewrite:
   - Removed flip card + rating buttons (Again/Hard/Good/Easy)
   - Added text input field with Enter/Check button submission
   - Added "Show hint" button revealing first letter of answer
   - Added "Skip" button (marks as Again rating)
   - Color-coded result feedback: green (exact), amber (close), orange (partial), red (incorrect)
   - Shows user's answer vs correct answer in distinct areas
   - Shows accuracy percentage and match type indicator
   - Shows example sentence and pronunciation after revealing answer
   - "Continue" button proceeds to next card
   - Direction toggle (EN→VI / VI→EN)
   - Progress bar and session stats
   - Session complete view with Correct/Close/Needs Review breakdown
   - Keyboard shortcuts: Enter (submit/continue), Tab (switch direction), Escape (skip card)
   - Animated transitions between prompt → result → next card
   - Focus management: input auto-focuses on new card

## Verification
- ESLint passes with zero errors
- Flashcard page returns HTTP 200
- Backend check-answer endpoint verified with various inputs
- All API proxy routes working correctly
