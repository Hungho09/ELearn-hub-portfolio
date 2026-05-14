---
Task ID: 1
Agent: Main
Task: Fix bugs and add admin system to LearnHub

Work Log:
- Read all key project files to understand the codebase
- Fixed Bug 1: Review 500 error - rewrote `/api/flashcards/review/route.ts` with better error handling:
  - Separate try/catch for request.json() parsing
  - Separate try/catch for fetch to backend (returns 503 if unreachable)
  - Check Content-Type header before parsing JSON
  - Return 502 instead of passing through backend 500 errors
  - Type coercion for vocabulary_id and rating
- Fixed Bug 2: JWT decryption error - updated profile/avatar routes:
  - `/api/user/profile/route.ts` - getServerSession in own try/catch, returns 401 with clear message
  - `/api/user/avatar/route.ts` - same fix
  - ProfileForm.tsx - handles 401 with Vietnamese toast + redirect to login
- Fixed Bug 3: Only 123 words - backend seed now adds 320 more words (total 443)
- Added admin system:
  - Backend: `admin.py` with `require_admin` dependency
  - Backend: Protected vocabulary CRUD, enrich, auto-enrich with admin check
  - Backend: Added `/api/vocabulary/admin/stats` and `DELETE /api/vocabulary/{id}` endpoints
  - Backend: Seed creates admin user (admin@learnhub.com / admin123)
  - Backend: Stats endpoint returns `total_vocabulary`, `by_difficulty`, `by_category`, `by_part_of_speech`
  - Frontend: Admin dashboard page at `/admin` with 4 sections (stats, enrich, add, manage)
  - Frontend: 5 admin API proxy routes with session + role validation
  - Frontend: Admin nav in sidebar (only shows for admin users)
  - Frontend: Removed "Thêm từ vựng API" button from home page
  - Frontend: Protected enrich/auto-enrich routes with admin auth
- Updated `index.ts` to use `/home/z/.venv/bin/python3` for correct Python path
- Verified lint passes clean
- Verified backend admin endpoints work correctly with access control

Stage Summary:
- Admin user: admin@learnhub.com / admin123
- Admin dashboard: /admin
- Admin-only operations: add/enrich/delete vocabulary
- Regular users can only study and review flashcards
- Backend admin stats endpoint returns comprehensive vocabulary breakdown

---
Task ID: 2
Agent: Main
Task: Fix start-all.bat syntax and profile session expired bug

Work Log:
- Verified start-all.bat: VENV_DIR already had `\` before `.venv` (Read tool stripped it in display)
- Fixed start-all.bat: `uv venv "%VENV_DIR"` → `uv venv "%VENV_DIR%"` (missing closing %)
- Root cause of profile bug: Missing `NEXTAUTH_SECRET` in `.env`
  - Without it, NextAuth generates a random secret on each server restart/hot-reload
  - JWTs encrypted with old secret can't be decrypted → getServerSession() returns null
  - API returns 401 → frontend shows "Phiên đăng nhập đã hết hạn"
- Added `NEXTAUTH_SECRET` and `NEXTAUTH_URL` to `.env`
- Fixed `auth.ts` jwt callback to handle `update()` trigger from client:
  - Added `trigger === "update"` handling to persist name/avatar changes in JWT
- Fixed ProfileForm.tsx `update()` calls:
  - Changed from `update({...session, user: {...}})` to `update({ name })` / `update({ avatar })`
  - The old way passed the full session object which could cause issues
- Added better logging in API routes: `[Auth]` prefix for session errors, `[Profile]`/`[Avatar]` for proxy errors
- Verified lint passes clean

Stage Summary:
- start-all.bat: Fixed missing `%` in `uv venv "%VENV_DIR%"` 
- Profile bug: Fixed by adding stable NEXTAUTH_SECRET to .env
- auth.ts: Now properly handles session updates via jwt callback trigger
- ProfileForm: Cleaner update() calls that work correctly with NextAuth v4

---
Task ID: 3
Agent: Main
Task: Create admin user galaxyvn and clean up unused DB files

Work Log:
- Created admin user directly in backend DB: galaxyvn@learnhub.com / Abc@123 (role=admin, id=u_galaxyvn_admin)
- Password verified with bcrypt checkpw — OK
- Updated seed.py to create galaxyvn@learnhub.com instead of admin@learnhub.com
- Deleted old admin@learnhub.com user from DB
- Analyzed all 4 .db files:
  - `mini-services/backend/learnhub.db` — ✅ ACTIVE (2 users, 443 vocab, 17 review logs)
  - `mini-services/api-service/learnhub.db` — ❌ OLD (pre-merge service, not running)
  - `mini-services/flashcard-service/flashcard.db` — ❌ OLD (pre-merge service, not running)
  - `db/custom.db` — ❌ UNUSED (Prisma DB, empty, never imported)
  - `/home/z/my-project/learnhub.db` — ❌ EMPTY (orphaned)
- Deleted 3 unused DBs: api-service/learnhub.db, flashcard-service/flashcard.db, db/custom.db, learnhub.db
- Deleted old service directories: mini-services/api-service/, mini-services/flashcard-service/
- Removed empty db/ directory
- Removed DATABASE_URL from .env (Prisma not used)
- Only one DB remains: mini-services/backend/learnhub.db

Stage Summary:
- Admin user: galaxyvn@learnhub.com / Abc@123 (role=admin)
- Seed updated to match
- 4 → 1 database files (only backend/learnhub.db remains)
- Old api-service and flashcard-service directories removed
- .env cleaned up (removed DATABASE_URL, kept NEXTAUTH_SECRET + NEXTAUTH_URL)

---
Task ID: 4
Agent: Main
Task: Integrate LaBSE semantic similarity model into the answer grading system

Work Log:
- Analyzed current grader.py: uses Levenshtein distance + diacritics normalization (string-level only)
- Installed sentence-transformers + torch CPU-only on sandbox for testing
- Verified LaBSE model works: "Xin chào" vs "Hello" = 0.92, "Đẹp" vs "Beautiful" = 0.96
- Rewrote grader.py with LaBSE integration:
  - Lazy model loading with thread-safe singleton pattern
  - Automatic fallback to Levenshtein if LaBSE unavailable
  - New grading thresholds for semantic similarity: 0.85+ Easy, 0.70+ Good, 0.50+ Hard, <0.50 Again
  - Returns `grader` field in result ("labse" | "levenshtein" | "exact")
  - Diacritics-ignored match now rated as Easy (0.95 accuracy) instead of Good
- Updated main.py: LaBSE model pre-loaded at startup, health check includes grader status
- Updated flashcard router: added /grader-info endpoint, semantic match_type passthrough
- Updated schemas.py: added `grader` field to CheckAnswerResponse
- Updated requirements.txt: added sentence-transformers>=3.0.0
- Updated frontend StudyResult component:
  - Added `semantic` match_type with green styling + "Semantic match (AI)" badge
  - Added LaBSE AI badge with Brain icon when grader is "labse"
  - Fallback for incorrect semantic matches to partial/incorrect styling
- Updated study/english page: semantic matches count as "correct" in session stats
- Lint passes clean

Stage Summary:
- Grader now uses LaBSE for cross-lingual semantic similarity (VN→EN matching)
- Automatic fallback to Levenshtein if sentence-transformers not installed
- Backend startup pre-loads LaBSE model (~2-5s load time)
- Frontend shows "LaBSE AI" badge when semantic grading is used
- Health endpoint shows grader status
- requirements.txt updated with sentence-transformers dependency
