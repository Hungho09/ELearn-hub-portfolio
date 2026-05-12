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
