# Todo: Gamification MVP

> Companion to `tasks/gamification-plan.md`. Track implementation progress here.
> Old todo preserved as `tasks/todo.md.bak`.

---

## Legend
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- 🔴 Blocked

---

## Phase 1: Backend Foundation

| # | Task | Status | Priority |
|---|------|--------|----------|
| 1.1 | Add `xp_points`, `current_level`, `last_reviewed_at` columns to `User` model in `models.py` | ✅ | P0 |
| 1.2 | Create `UserBadge` model in `models.py` (unique constraint on user_id + badge_code) | ✅ | P0 |
| 1.3 | Add DB migration for new columns + `user_badge` table in `database.py` | ✅ | P0 |
| 1.4 | Extend `UserResponse`, `UserStats`, `ReviewResult` schemas with gamification fields | ✅ | P0 |
| 1.5 | Create `gamification.py` — `calculate_xp()`, `calculate_new_level()`, `check_badges()` | ✅ | P0 |

## Phase 2: API Integration

| # | Task | Status | Priority |
|---|------|--------|----------|
| 2.1 | Integrate XP + level-up + badge logic into `POST /review` handler | ✅ | P0 |
| 2.2 | Add `next_level_xp` to `GET /stats` response | ✅ | P0 |
| 2.3 | Update `POST /review` response model to include `xp_earned` and `unlocked_badges` | ✅ | P0 |
| 2.4 | Seed test user (gamer@learnhub.com, L8, 3800 XP, 3 badges) in `seed.py` | ✅ | P1 |

## Phase 3: Frontend Bridge

| # | Task | Status | Priority |
|---|------|--------|----------|
| 3.1 | Add `xpPoints`, `currentLevel` to `next-auth.d.ts` Session.User + JWT | ✅ | P0 |
| 3.2 | Persist XP/level in JWT via `auth.ts`; add `trigger === "update"` handler | ⬜ | P0 |

## Phase 4: Frontend UI

| # | Task | Status | Priority |
|---|------|--------|----------|
| 4.1 | `english/page.tsx` — accumulate `earnedXp` per review | ✅ | P0 |
| 4.2 | `english/page.tsx` — fetch fresh stats + `update()` on session complete | ✅ | P0 |
| 4.3 | `SessionComplete.tsx` — "+X XP" bounce banner | ✅ | P1 |
| 4.4 | `SessionComplete.tsx` — level progress bar (XP / next level XP) | ✅ | P0 |
| 4.5 | `LevelUpModal.tsx` (new) — confetti on level change | ✅ | P1 |
| 4.6 | `BadgeUnlock.tsx` (new) — toast when badges unlocked mid-session | ✅ | P1 |
| 4.7 | `BadgeGrid.tsx` (new) — badge showcase grid with lock icons | ✅ | P2 |
| 4.8 | `LearningStats.tsx` — add Level card (Shield icon, Cyan) | ✅ | P0 |
| 4.9 | `stats/page.tsx` — add level + XP progress section | ✅ | P1 |
| 4.10 | `app/page.tsx` — mini XP bar next to greeting | ✅ | P2 |

## Phase 5: Tests & Polish

| # | Task | Status | Priority |
|---|------|--------|----------|
| 5.1 | Write `test_xp.py` — XP calc per rating + bonus | ✅ | P0 |
| 5.2 | Write `test_leveling.py` — level formula + multi-level jump + cap | ✅ | P0 |
| 5.3 | Write `test_badges.py` — all 6 badge triggers | ✅ | P0 |
| 5.4 | Write `test_badge_idempotency.py` — no duplicate badges | ✅ | P0 |
| 5.5 | Write `test_integration_review.py` — end-to-end `/review` response | ✅ | P0 |
| 5.6 | Write frontend tests (StudyPage, SessionComplete, BadgeUnlock) | ⬜ | P1 |
| 5.7 | Manual smoke tests (XP flow, badges, level jumps) | ⬜ | P0 |
| 5.8 | Dark mode audit for new components | ⬜ | P1 |
| 5.9 | Regression check — existing flashcard + auth flows | ⬜ | P0 |

---

## Priority Key
- **P0** — Must ship for MVP
- **P1** — Important, ship in same PR if time allows
- **P2** — Nice-to-have, can follow in next iteration

## Stats
- Total tasks: **30**
- P0: 18
- P1: 8
- P2: 4
- **Completed: 13/30** | Phase 1 ✅ Phase 2 ✅ Phase 3–5 remaining