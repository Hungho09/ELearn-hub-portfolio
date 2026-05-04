# Project Worklog

---
Task ID: 1
Agent: Main Agent
Task: Analyze design image and plan component structure

Work Log:
- Analyzed uploaded design image (desktop.png) using VLM skill
- Identified 3-column dashboard layout: left sidebar, main content, right sidebar
- Extracted color scheme: Primary purple #6C5CE7, light purple #E8E0FF
- Mapped all components: Sidebar, SearchBar, HeroBanner, CourseProgressCards, ContinueWatching, ProfileCard, ActivityChart, MentorList, RightSidebar
- Documented typography, spacing, icon, and button specifications

Stage Summary:
- Design analysis complete with detailed specifications for all UI components
- Purple-themed self-learning platform dashboard design

---
Task ID: 2
Agent: Main Agent
Task: Generate images for hero section and course cards

Work Log:
- Generated hero illustration (1344x768) - abstract learning/education theme
- Generated 6 course thumbnails (1152x864): ui-design, web-dev, data-science, product-design, machine-learning, mobile-dev
- Generated 3 mentor avatar images (1024x1024): mentor1, mentor2, mentor3
- Generated user avatar image (1024x1024)
- All images saved to /public/images/

Stage Summary:
- 11 images generated and saved to public/images/ directory
- All course thumbnails, mentor avatars, and hero illustration ready

---
Task ID: 3
Agent: Main Agent
Task: Update globals.css with purple theme and layout.tsx with Inter font

Work Log:
- Updated globals.css with purple theme (#6C5CE7 primary, #E8E0FF secondary)
- Added custom scrollbar styles
- Updated layout.tsx to use Inter font instead of Geist
- Updated page metadata for LearnHub self-learning platform

Stage Summary:
- Purple theme CSS variables set for light and dark modes
- Inter font configured as primary font family

---
Task ID: 4
Agent: full-stack-developer subagent
Task: Build all home page components

Work Log:
- Created 10 component files in src/components/home/
- Sidebar.tsx: Left navigation with logo, nav sections, user info
- SearchBar.tsx: Search input with filter button and mobile menu toggle
- HeroBanner.tsx: Purple gradient banner with sparkle decorations and CTA
- CourseProgressCards.tsx: Three progress cards with thumbnails and progress bars
- ContinueWatching.tsx: Three course cards with play overlays and badges
- ProfileCard.tsx: User profile with avatar, stats, and notification icons
- ActivityChart.tsx: Weekly activity bar chart with purple gradient bars
- MentorList.tsx: Three mentor cards with follow buttons
- RightSidebar.tsx: Combines ProfileCard, ActivityChart, and MentorList
- page.tsx: Main page assembling 3-column responsive layout

Stage Summary:
- All 10 components created and compiling successfully
- Page serves with 200 status code on localhost:3000

---
Task ID: 5-7
Agent: Main Agent
Task: Polish and finalize the home page

Work Log:
- Fixed ActivityChart bars to grow from bottom up using items-end
- Enhanced HeroBanner with gradient direction (br), better illustration positioning, and more decorative elements
- Improved ProfileCard with stats row (Courses/Completed/Certificates)
- Enhanced MentorList with ring borders on avatars and consistent button styling
- Added duration overlay and percentage labels to ContinueWatching and CourseProgressCards
- Improved RightSidebar width to fixed 280px
- Verified mobile responsiveness at 375x812 viewport
- Confirmed desktop view at 1440x900 viewport
- ESLint passes with no errors

Stage Summary:
- Page fully polished with consistent styling, proper animations, and responsive design
- Both desktop (3-column) and mobile (single column with hamburger menu) layouts working correctly
- VLM analysis confirms professional quality with no major visual bugs

---
Task ID: 6
Agent: full-stack-developer subagent
Task: Build the English Course page with all components

Work Log:
- Created 7 component files in src/components/english/
- VideoPlayer.tsx: Large video player area with 16:9 aspect ratio, play button overlay, decorative patterns, progress bar, duration badge, video title, instructor info, and Like/Share/Bookmark/MarkComplete action buttons
- CurriculumTab.tsx: Expandable sections (4 sections, 16 lessons total) with lesson status icons (completed/current/available/locked), type badges (Video/Quiz/Reading), duration, section progress bars, and overall completion summary
- NotesTab.tsx: Note editor with textarea, save functionality with simulated delay, character count, saved notes list with edit/delete capabilities, and empty state
- DiscussionTab.tsx: Discussion thread with comment input, threaded replies, like functionality, quick reply, instructor badges, and sort-by placeholder
- AIProctoringPanel.tsx: AI chat assistant with status card (active indicator), quick question buttons, chat messages with typing animation, and message input with Enter-to-send
- CourseProgress.tsx: Circular progress indicator (SVG-based), overall progress bar, and stats grid (Lessons Done, Time Spent, Quiz Score)
- RelatedCourses.tsx: Three related course cards with thumbnails, ratings, student counts, level badges, and progress indicators
- Created src/app/english/page.tsx: Main page with top nav bar (back button, title, search, avatar), sticky header, 2-column responsive layout (main content + right sidebar on lg+), left sidebar reuse from home page, and mobile drawer support
- Fixed unused imports (X from AIProctoringPanel, AvatarImage from DiscussionTab)
- ESLint passes with no errors
- Page compiles and serves with 200 status code

Stage Summary:
- All 8 files created (7 components + 1 page) for the English Course page
- Responsive design: single column mobile, 2-column desktop with right sidebar
- Purple theme consistently applied using bg-primary, text-primary, and shadcn/ui components
- Page accessible at /english route, linked from Sidebar "Lesson" nav item
- Integrates with existing Sidebar component and NextAuth session for user avatar

---
Task ID: 7
Agent: Main Agent
Task: Complete auth system integration and fix missing pages

Work Log:
- Added NEXTAUTH_SECRET and NEXTAUTH_URL to .env file
- Created register page at src/app/(auth)/register/page.tsx with name/email/password/confirm fields, auto-sign-in after registration
- Created profile page at src/app/(auth)/profile/page.tsx with session protection, avatar upload, name/bio editing, sign out
- Updated Sidebar component with NextAuth integration: shows "Guest"/user name, Login/Logout button, real navigation (Dashboard→/, Lesson→/english, Settings→/profile), logo click navigates home
- Updated ProfileCard component with session data: shows "Guest" or user name/email, "Sign In" or "My Profile" button navigates correctly
- Fixed signOut flow: changed from callbackUrl redirect to redirect:false + router.push for reliable logout
- Fixed ProfileForm signOut: uses redirect:false + window.location.href for reliable redirect

Stage Summary:
- Full auth flow working: Register → Auto-login → Session persistence → Profile editing → Logout → Login
- All pages return HTTP 200: /, /login, /register, /profile, /english
- Profile page is protected (redirects unauthenticated users to /login)
- Sidebar shows auth-aware state (Guest/Login when unauthenticated, Demo User/Logout when authenticated)
- ProfileCard shows auth-aware state with working navigation
- ESLint passes with zero errors
- VLM visual analysis confirms all pages are well-structured with no visual issues

---
Task ID: 8
Agent: Main Agent
Task: Build English-Vietnamese flashcard learning system with spaced repetition and review logs for ML model

Work Log:
- Created Python FastAPI backend (mini-services/flashcard-service/) with SQLAlchemy, SM-2 spaced repetition algorithm, and 123 English-Vietnamese vocabulary items across 16 categories
- Added Vocabulary and ReviewLog models to Prisma schema (prisma/schema.prisma) with full SM-2 algorithm fields
- Created SM-2 spaced repetition algorithm in TypeScript (src/lib/spaced-repetition.ts)
- Created vocabulary seed data (prisma/seed-vocab.ts) with 123 words across 16 categories: Greetings, Food & Drinks, Numbers, Colors, Family, Daily Activities, Travel, Emotions, Time, Animals, Weather, Education, Shopping, Body Parts, Adjectives, Verbs
- Built flashcard API routes in Next.js:
  - GET /api/flashcards/session - Get due cards + new cards for study session
  - POST /api/flashcards/review - Submit review with SM-2 algorithm (ratings 1-4)
  - GET /api/flashcards/stats - User learning statistics (mastered, learning, new, streak, etc.)
  - GET /api/flashcards/categories - Progress by vocabulary category
- Built flashcard UI page (src/app/flashcard/page.tsx) with:
  - Flip-card animation (English front → Vietnamese back, or vice versa)
  - 4-level rating buttons (Again/Hard/Good/Easy) with color coding
  - Mode toggle (EN→VI or VI→EN)
  - Example sentence reveal
  - Progress bar with card counter
  - Session complete summary with accuracy stats
  - Stats dashboard (Mastered, Learning, New, Total Reviews)
  - Streak tracking and today's review count
  - Keyboard shortcuts (Space to flip, 1-4 to rate)
- Updated Sidebar with Flashcard navigation link (Brain icon)

Stage Summary:
- Complete flashcard system with English↔Vietnamese vocabulary learning
- SM-2 spaced repetition algorithm saves review data for ML model consumption
- 123 vocabulary words seeded across 16 categories
- ReviewLog table stores: rating, ease_factor, interval_days, repetitions, next_review_at, response_time_ms, direction (en_to_vi/vi_to_en), session_id
- All APIs return 200, ESLint passes with zero errors
- Flashcard page accessible at /flashcard route

---
Task ID: 9
Agent: Main Agent
Task: Create Python api-service to replace Next.js TypeScript API routes, sharing DB with ML model

Work Log:
- Investigated user's report about missing `mini-services/api-service/` folder
- Found `mini-services/flashcard-service/` EXISTS (Python FastAPI) but was never connected to frontend
- Confirmed `mini-services/api-service/` did NOT exist - was never created in previous session
- Created complete `mini-services/api-service/` with Python FastAPI backend on port 3001
- Created SQLAlchemy models: User, Vocabulary, ReviewLog (PostgreSQL-compatible design)
- Created Pydantic schemas for all request/response validation
- Implemented auth routes: POST /api/auth/register, POST /api/auth/verify
- Implemented user routes: GET/PUT /api/user/profile, POST /api/user/avatar
- Implemented flashcard routes: GET /api/flashcards/session, POST /api/flashcards/review, GET /api/flashcards/stats, GET /api/flashcards/categories
- Implemented vocabulary CRUD: GET/POST /api/vocabulary
- Implemented review log endpoints for ML model: GET /api/review-logs/{user_id}, GET /api/review-logs/{user_id}/export
- Implemented SM-2 spaced repetition algorithm in Python (spaced_repetition.py)
- Implemented password hashing/verification with bcrypt (auth.py)
- Created 123-word seed data across 16 categories (seed.py)
- Created runner.py for persistent process management
- Updated Next.js API routes to proxy all requests to Python api-service:
  - src/app/api/auth/register/route.ts → proxies to Python
  - src/app/api/user/profile/route.ts → proxies to Python (with NextAuth session verification)
  - src/app/api/user/avatar/route.ts → saves file locally, updates Python DB
  - src/app/api/flashcards/session/route.ts → proxies to Python
  - src/app/api/flashcards/review/route.ts → proxies to Python
  - src/app/api/flashcards/stats/route.ts → proxies to Python
  - src/app/api/flashcards/categories/route.ts → proxies to Python
- Updated NextAuth authorize() to verify credentials against Python api-service instead of Prisma directly
- All 12 integration tests pass:
  1. Health check ✅
  2. Next.js home page 200 ✅
  3. Flashcard session via proxy ✅
  4. Stats via proxy ✅
  5. Register via proxy ✅
  6. Review submission via proxy ✅
  7. Credential verification ✅
  8. Stats after review ✅
  9. Categories via proxy ✅
  10. Vocabulary list ✅
  11. Review logs for ML ✅
  12. ESLint zero errors ✅

Stage Summary:
- Complete Python FastAPI api-service created at mini-services/api-service/
- All backend logic migrated from Next.js TypeScript to Python
- NextAuth stays in Next.js (manages sessions/cookies), auth verification delegates to Python
- Next.js API routes are now thin proxies that forward to Python api-service on port 3001
- Python service has its own SQLite database (will share PostgreSQL with ML model in production)
- 123 vocabulary items seeded across 16 categories
- Review logs fully accessible for ML model training via /api/review-logs/{user_id}/export
- Full integration test passing: Register → Login → Flashcard session → Review → Stats → Categories

---
Task ID: 10
Agent: Main Agent
Task: Verify project state, lint check, and polish backend restructuring

Work Log:
- Confirmed no old api-service/ or flashcard-service/ folders exist — already consolidated into backend/
- Fixed .env: added NEXTAUTH_SECRET and NEXTAUTH_URL (was missing, causing NextAuth warnings)
- All frontend pages verified: /, /login, /register, /profile, /english, /flashcard → all 200
- Python backend health check confirmed: /health returns OK with all router info
- Flashcard API integration verified: stats, session, categories all working via proxy to Python
- ESLint passes with zero errors
- Added ml_model/ placeholder directory with README explaining how to swap SM-2 for custom ML model
- Created root-level start-all.sh that starts both Python backend (port 3001) + Next.js frontend (port 3000) with one command
- Updated mini-services/start-all.sh and mini-services/backend/start.sh for cleaner startup

Stage Summary:
- No old unused folders remaining (api-service, flashcard-service already removed)
- Root start-all.sh enables one-command startup: `bash start-all.sh`
- ml_model/ directory ready for future ML model integration
- All pages and APIs verified working
- ESLint: zero errors

---
Task ID: 11
Agent: Main Agent
Task: Integrate TCGL (Temporal Contrastive Graph Learning) ML model into flashcard system

Work Log:
- Analyzed model.pth: OrderedDict with 24 weight arrays, TCGL architecture
- Reconstructed model architecture: NodeEmbedding(78139x16), TimeEncoder(1→16), CustomGraphConv(51→64→64), Classifier MLP(64→32→1)
- Created ml_model/model.py: Full PyTorch TCGLModel class (loads with strict=True)
- Created ml_model/predict.py: Full inference with graph construction from review logs
- Created ml_model/predict_lite.py: Memory-efficient NumPy-only inference (1.2MB vs 200MB)
- Pre-extracted model weights to tcgl_weights.npz (69KB, no PyTorch needed at runtime)
- Updated routers/flashcard.py: TCGL model primary, SM-2 automatic fallback
- Added /api/flashcards/model-info endpoint showing active model status
- Updated main.py: Pre-loads TCGL weights at startup, health check shows model status
- Updated requirements.txt: Added torch, torch-geometric, numpy
- Fixed shape mismatch in predict_lite.py (encode_node_features returns [1,19], needs [0] for stacking)
- Verified: TCGL model produces different intervals for different ratings (1→1d, 2→7d, 3→8d, 4→10d)
- Verified: Full API flow working — health, model-info, review, stats, categories, review-logs
- ESLint passes with zero errors

Stage Summary:
- TCGL model fully integrated as primary scheduling algorithm
- NumPy Lite inference: no PyTorch at runtime, 1.2MB overhead (vs 200MB+ with PyTorch)
- SM-2 remains as automatic fallback if model fails
- Model weights pre-extracted to tcgl_weights.npz (69KB)
- New files: ml_model/model.py, ml_model/predict.py, ml_model/predict_lite.py, ml_model/tcgl_weights.npz, ml_model/__init__.py
- Updated files: routers/flashcard.py, main.py, requirements.txt

---
Task ID: 12
Agent: Main Agent
Task: Convert TCGL model from static NPZ inference to dynamic PyTorch model that can predict AND learn from user data

Work Log:
- Rewrote ml_model/predict.py as the ACTIVE module with full PyTorch dynamic model
- Added online learning: after each review, model performs 3 gradient steps to update graph conv + classifier weights
- Added batch training: train_on_reviews() fine-tunes model on accumulated review data
- Added model persistence: save_model() persists learned weights to tcgl_learned.pth
- Added training stats tracking: total_predictions, total_online_updates, total_batch_trainings, losses
- Fixed BatchNorm issue: single-node graphs now keep BN in eval mode while other layers train
- Fixed timezone-aware datetime comparison in build_review_graph
- Fixed contrastive loss tensor shape warnings
- Updated routers/flashcard.py:
  - Switched import from predict_lite to predict (dynamic PyTorch)
  - Added POST /api/flashcards/train endpoint for batch training
  - Added GET /api/flashcards/training-stats endpoint
  - Optimized: only load relevant vocab items (not all 123) for graph construction
  - Added error handling for batch training to prevent server crashes
- Updated main.py startup to use new predict module
- Updated ml_model/README.md with new architecture documentation
- Verified full integration: 3 reviews submitted with online learning, batch training completed, model saved

Stage Summary:
- TCGL model is now DYNAMIC: can both predict and learn from user data
- Online learning: automatic after each review (3 gradient steps, ~0.2s per review)
- Batch training: on-demand via /api/flashcards/train endpoint
- Model persistence: learned weights saved to tcgl_learned.pth, loaded on restart
- Embedding layer frozen (1.25M params), conv+classifier trainable (17K params)
- SM-2 remains as automatic fallback
- New endpoints: POST /train, GET /training-stats
- All tests pass: predict, online learn, batch train, model save/load
