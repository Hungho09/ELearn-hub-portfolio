# SPEC: Gamification System (MVP)

> Derived from `tasks/new-feature-plan.txt`. Covers Phases 1–4 of the gamification MVP.

---

## 1. Objective

Add a gamification layer (XP, Levels, Badges) to the LearnHub spaced-repetition platform. Users earn XP when reviewing flashcards, level up via a progressive curve, and unlock badges automatically based on learning behavior. The system must be invisible by default — surfaced through progress bars, banners, and dashboard widgets — without altering existing flashcard or auth flows.

## 2. Target Users

- **Learners** (primary): see XP gains, level progress, and badge unlocks during study sessions and on dashboards.
- **Admins**: view user XP/level data in the admin panel (future phase).

## 3. Core Mechanics (Acceptance Criteria)

### 3.1 XP System

| Rating | Base XP |
|--------|---------|
| 1 (Again) | +5 |
| 2 (Hard) | +10 |
| 3 (Good) | +20 |
| 4 (Easy) | +30 |

- **Bonus XP** = `difficulty_level * 5` (max +15 for difficulty_level=3).
- `xp_earned` returned in every `/review` response so the frontend can animate the gain.

### 3.2 Leveling System

- Formula: `Next_Level_XP = (Current_Level ^ 2) * 50 + 50`
- Examples: L1→L2 needs 100 XP, L2→L3 needs 250, L3→L4 needs 500.
- **Level cap**: 50 (~125,000 XP total).
- Level-up checked **after every review** in a `while` loop (handles multi-level jumps in one session).

### 3.3 Badge System (6 core badges)

| Badge Code | Trigger Condition |
|---|---|
| `FIRST_BLOOD` | First review ever completed |
| `STREAK_3` | 3 consecutive days with ≥1 review |
| `STREAK_7` | 7 consecutive days with ≥1 review |
| `MASTER_10` | 10 vocabulary items mastered (ease ≥ 2.5 AND interval ≥ 21) |
| `SCHOLAR_100` | Total reviews ≥ 100 |
| `NIGHT_OWL` | Any review submitted between 22:00–04:00 UTC |

- Each badge is **one-time**: `UniqueIndex(user_id, badge_code)`.
- `unlocked_badges: list[str]` returned in `/review` response when new badges are earned during that request.

## 4. Project Structure & Changes

### 4.1 Backend (Python / FastAPI)

#### New DB columns
```
user.xp_points          INTEGER  DEFAULT 0
user.current_level      INTEGER  DEFAULT 1
user.last_reviewed_at   DATETIME NULL   (for streak calc optimization)

user_badge (NEW TABLE)
  id          INTEGER PK
  user_id     VARCHAR FK → user.id
  badge_code  VARCHAR
  unlocked_at DATETIME
  UNIQUE(user_id, badge_code)
```

#### Files to modify
- `mini-services/backend/models.py` — add `xp_points`, `current_level`, `last_reviewed_at` to `User`; add `UserBadge` model.
- `mini-services/backend/schemas.py` — add `xp_points`, `current_level`, `next_level_xp` to `UserResponse`/`UserStats`; add `xp_earned: int` and `unlocked_badges: list[str]` to `ReviewResult`.
- `mini-services/backend/routers/flashcard.py` — `POST /review`: compute XP, level-up loop, badge checks; `GET /stats`: return `next_level_xp`.
- `mini-services/backend/seed.py` — seed user `gamer@learnhub.com` at Level 8 / 3800 XP / 3 badges (FIRST_BLOOD, STREAK_3, NIGHT_OWL).
- `mini-services/backend/database.py` — migration helper for new columns/table.
- `mini-services/backend/main.py` — register any new routes if needed.

#### New files
- `mini-services/backend/gamification.py` — pure logic module: `calculate_xp()`, `check_level_up()`, `check_badges()`.

### 4.2 Frontend (Next.js / TypeScript)

#### Type changes
- `src/types/next-auth.d.ts` — add `xpPoints`, `currentLevel` to `Session.user` and `JWT`.
- `src/lib/auth.ts` — persist `xpPoints`/`currentLevel` in JWT; set up `trigger === "update"` handler so the client can silently refresh session data after a study session ends.

#### Pages to modify
- `src/app/study/english/page.tsx` — accumulate `earnedXp` from each review; on session complete fetch fresh stats and call `update()`.
- `src/app/stats/page.tsx` — add Level card with Shield icon (Cyan); add progress bar for XP needed to next level.
- `src/app/page.tsx` — add mini XP progress bar next to greeting ("Xin chào, Học viên! — Cấp X").

#### Components to modify/create
- `src/components/study/SessionComplete.tsx` — add Bounce-animated XP banner ("+X XP earned"), level-up progress bar.
- `src/components/learn/LearningStats.tsx` — add Level indicator card (Shield icon, Cyan).
- `src/components/study/LevelUpModal.tsx` (new) — confetti animation when level changes between session start and end.
- `src/components/study/BadgeUnlock.tsx` (new) — toast popup when badges are unlocked mid-session.
- `src/components/badge/BadgeGrid.tsx` (new) — grid layout for badge showcase (grey + lock icon for locked).

## 5. Code Style

- **Backend**: Follow existing patterns — SQLAlchemy ORM models, Pydantic v2 schemas with `from_attributes = True`, FastAPI dependency injection (`Depends(get_db)`). Keep gamification logic in a standalone module (`gamification.py`) for testability. Use timezone-aware `datetime.now(timezone.utc)` everywhere.
- **Frontend**: Follow existing patterns — Tailwind CSS + shadcn/ui, `'use client'` where needed, `useSession` / `useRouter` hooks, TypeScript interfaces for all API responses. Add animation state as local component state, not global.
- **Commits**: One logical change per commit. Prefix: `feat(gamification): ...`, `fix(gamification): ...`.

## 6. Testing Strategy

### 6.1 Unit Tests (backend)
Create `mini-services/backend/tests/` directory:

| Test File | What it covers |
|---|---|
| `test_xp.py` | XP calculation per rating, bonus XP scaling, edge cases (0 difficulty, max difficulty). |
| `test_leveling.py` | Level-up formula correctness, multi-level jump in one session, level cap at 50. |
| `test_badges.py` | Each badge trigger: FIRST_BLOOD on 1st review, STREAK_3/7 on consecutive days, MASTER_10 with mocked ease/interval, SCHOLAR_100 on review count, NIGHT_OWL in 22:00–04:00 window. |
| `test_badge_idempotency.py` | Submitting same badge condition twice does NOT create duplicate rows. |
| `test_integration_review.py` | End-to-end POST /review returns `xp_earned`, `unlocked_badges`, correct `ReviewResult` fields. |

Use `pytest` + SQLAlchemy in-memory SQLite. Fixture for `db_session` and `test_user`.

### 6.2 Frontend Tests
| Test File | What it covers |
|---|---|
| `StudyPage.test.tsx` | XP accumulation across multiple card reviews; session completion triggers stats refetch. |
| `SessionComplete.test.tsx` | XP banner renders correct amount; progress bar reflects correct ratio. |
| `BadgeUnlock.test.tsx` | Toast appears when `unlocked_badges` has items; does not appear when empty. |

Use Vitest + React Testing Library.

### 6.3 Manual Smoke Tests
1. Register a new user → verify `xp_points=0`, `current_level=1` in DB.
2. Complete one review → verify XP increases, response includes `xp_earned`.
3. Review 100 times in a row → verify SCHOLAR_100 badge in `user_badge` table and response.
4. Submit a review at 23:00 UTC → verify NIGHT_OWL badge.
5. Level up → verify `current_level` increments, `xp_points` carries over correctly.

## 7. Boundaries & Constraints

### What we do / allow
- Add columns to existing `user` table; add one new `user_badge` table.
- Extend existing API responses with new fields (`xp_earned`, `unlocked_badges`, `next_level_xp`).
- Add new optional fields to NextAuth session/JWT.
- Create new frontend components alongside existing ones.

### What we do NOT / ask first
- **Do not** change the existing SM-2 / TGCL scheduling algorithm.
- **Do not** modify the review log schema or existing review flow.
- **Do not** add authentication to the `/review` endpoint (it already has `user_id` query param).
- **Do not** touch the admin panel or vocabulary management features.
- **Do not** add leaderboard, shop, or post-MVP features (tracked separately).
- **Do not** change the database engine or Prisma schema (separate concern).

### Known risks
- **Badge race condition**: If two reviews complete simultaneously, both might check badge eligibility before either inserts. Mitigation: use `INSERT OR IGNORE` with unique constraint.
- **Streak accuracy**: Current streak logic in `flashcard.py` iterates 365 days backwards. Acceptable for MVP; optimize with `last_reviewed_at` column later.
- **XP overflow**: Level 50 cap requires ~125,000 XP. `Integer` column handles up to 2^31. No risk.

## 8. Acceptance Checklist (for PR review)

- [ ] `POST /api/flashcards/review` returns `xp_earned` (integer) and `unlocked_badges` (string array, can be empty).
- [ ] `GET /api/flashcards/stats` returns `next_level_xp` in response.
- [ ] `UserBadge` table exists with unique constraint on `(user_id, badge_code)`.
- [ ] All 6 badge types fire correctly under test conditions.
- [ ] Level-up loop handles multi-level jumps (e.g., earn 1000 XP in one session → skip from L2 to L5).
- [ ] Frontend shows "+X XP" banner on session complete.
- [ ] Frontend shows level progress bar (current XP / next level XP).
- [ ] `unlocked_badges` array triggers toast notifications during study.
- [ ] NextAuth session silently updates XP/level after review without page refresh.
- [ ] No existing flashcard or auth behavior is broken (regression tests pass).