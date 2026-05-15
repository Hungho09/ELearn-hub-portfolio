# Plan: Gamification MVP Implementation

> Based on `SPEC.md`. Sliced vertically — each task completes one end-to-end path.
> Old plans preserved in `tasks/plan.md.bak` and `tasks/todo.md.bak`.

---

## Dependency Graph

```
models.py (DB schema)
  └─→ schemas.py (API types)
       └─→ gamification.py (pure logic)
            └─→ flashcard.py (API endpoints)
                 └─→ seed.py (test data)

next-auth.d.ts (TS types)
  └─→ auth.ts (JWT + session bridge)
       └─→ Frontend pages & components
```

## Phases

### Phase 1: Backend Foundation (Day 1–2)
Build the data layer and pure logic. No API changes yet.

| # | Task | Depends On |
|---|------|-----------|
| 1.1 | `models.py` — add `xp_points`, `current_level`, `last_reviewed_at` to User; add `UserBadge` model | — |
| 1.2 | `database.py` — add migration for new columns + table | 1.1 |
| 1.3 | `schemas.py` — extend `UserResponse`, `UserStats`, `ReviewResult` with gamification fields | 1.1 |
| 1.4 | Create `gamification.py` — `calculate_xp()`, `check_level_up()`, `check_badges()` | 1.1 |

### Phase 2: API Integration (Day 2–3)
Wire gamification into existing endpoints.

| # | Task | Depends On |
|---|------|-----------|
| 2.1 | `POST /review` — integrate XP calc + level-up loop + badge checks into `submit_review()` | 1.3, 1.4 |
| 2.2 | `GET /stats` — return `next_level_xp` field | 1.3 |
| 2.3 | `seed.py` — add test user (gamer@learnhub.com, L8, 3800 XP, 3 badges) | 1.1, 1.4 |

### Phase 3: Frontend Bridge (Day 3–4)
Types and auth session plumbing.

| # | Task | Depends On |
|---|------|-----------|
| 3.1 | `next-auth.d.ts` — add `xpPoints`, `currentLevel` to Session.User and JWT | 1.3 |
| 3.2 | `auth.ts` — persist XP/level in JWT; add `trigger === "update"` handler | 3.1 |

### Phase 4: Frontend UI (Day 4–7)
Build the visible gamification UI.

| # | Task | Depends On |
|---|------|-----------|
| 4.1 | `english/page.tsx` — accumulate `earnedXp` per review; fetch fresh stats + call `update()` on session complete | 2.1, 3.2 |
| 4.2 | `SessionComplete.tsx` — add "+X XP" bounce banner + level progress bar | 4.1 |
| 4.3 | `LevelUpModal.tsx` (new) — confetti effect when level changes mid-session | 4.1 |
| 4.4 | `BadgeUnlock.tsx` (new) — toast notification when badges are unlocked | 2.1 |
| 4.5 | `BadgeGrid.tsx` (new) — badge showcase grid (grey + lock for locked) | 1.4, 2.1 |
| 4.6 | `LearningStats.tsx` — add Level card (Shield icon, Cyan) | 3.2 |
| 4.7 | `stats/page.tsx` — add level progress bar + XP stats section | 3.2, 4.6 |
| 4.8 | `app/page.tsx` — add mini XP progress bar next to greeting | 3.2 |

### Phase 5: Tests & Polish (Day 7–9)

| # | Task | Depends On |
|---|------|-----------|
| 5.1 | Backend unit tests — `test_xp.py`, `test_leveling.py`, `test_badges.py`, `test_badge_idempotency.py`, `test_integration_review.py` | Phase 1–2 |
| 5.2 | Frontend tests — `StudyPage.test.tsx`, `SessionComplete.test.tsx`, `BadgeUnlock.test.tsx` | Phase 4 |
| 5.3 | Manual smoke tests (XP flow, badge triggers, level-up jumps) | All |
| 5.4 | Dark mode audit for new components | Phase 4 |
| 5.5 | Regression check — existing flashcard + auth flows unchanged | All |

---

## Checkpoints

- **Checkpoint 1** (end Phase 1): DB models validated, `gamification.py` logic tested in isolation.
- **Checkpoint 2** (end Phase 2): `POST /review` returns `xp_earned` + `unlocked_badges`; `GET /stats` returns `next_level_xp`. Verified with curl/manual test.
- **Checkpoint 3** (end Phase 3): NextAuth session contains `xpPoints`/`currentLevel`; `update()` refreshes silently.
- **Checkpoint 4** (end Phase 4): Full study session shows XP banner, progress bar, badge toasts, level-up confetti. Dashboard shows level card.
- **Checkpoint 5** (end Phase 5): All tests green, smoke tests pass, no regressions.