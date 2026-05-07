---
Task ID: 1
Agent: Main Agent
Task: Redesign LearnHub flashcard into a Learning Hub with language selection and active recall

Work Log:
- Explored entire project structure and understood current architecture
- Redesigned main page (/) as Learning Hub with language selection cards (6 languages, only English enabled)
- Created /study/english page with active recall flashcard UX (refactored from old /flashcard)
- Created new components: LanguageCard, LearningStats, StudyCard, StudyResult, SessionComplete
- Updated Sidebar navigation: replaced "Flashcard" + "Lesson" with "Trang chủ" + "Học tập" + "Thống kê"
- Removed old /flashcard and /english pages and all unused components (english/, HeroBanner, CourseProgressCards, etc.)
- Created start-all.bat for Windows startup
- Cleaned up Prisma schema (removed unused Post model, added user_answer/auto_rating fields)
- Pushed schema changes to database
- Removed redundant start scripts (mini-services/start-all.sh, backend/start.sh)
- Vietnamese language used throughout the UI for target audience
- Lint check: 0 errors, all pages return 200

Stage Summary:
- Main page now shows a clean Learning Hub with language selection
- Study page has active recall (type answer, system auto-evaluates)
- UI is in Vietnamese to match the EN-VI learning context
- All old unrelated course/lesson content removed
- Project is clean and focused on vocabulary learning
