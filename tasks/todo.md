# UI/UX Redesign — Task List

## Legend
- ⬜ Not started
- 🟡 In progress
- ✅ Done
- 🔴 Blocked

---

## Phase 1: Design Tokens & Foundations
| # | Task | Status | Assignee | Priority |
|---|---|---|---|---|
| 1.1 | Add shadow scale to `tailwind.config.ts` (`shadow-card`, `shadow-card-hover`, `shadow-btn`) | ✅ | — | P0 |
| 1.2 | Add animation keyframes to `globals.css` (`float`, `fade-in-up`, `pulse-glow`) | ✅ | — | P0 |
| 1.3 | Add global animation/duration CSS variables (`--ease-out`, `--duration-fast`, `--duration-normal`) | ✅ | — | P1 |
| 1.4 | Refine border-radius scale — add `rounded-2xl`/`rounded-3xl` to config | ✅ | — | P1 |
| 1.5 | Standardize section spacing token (`--section-space`) | ✅ | — | P1 |

**Gate:** Tokens reviewed and agreed. No visual changes yet.

---

## Phase 2: Component Primitives
| # | Task | Status | Assignee | Priority |
|---|---|---|---|---|
| 2.1 | **Card primitive** — Add `variant` prop (`default`/`interactive`). Bump default shadow to `shadow-card`. Interactive: `hover:-translate-y-0.5 hover:shadow-card-hover cursor-pointer transition-all`. | ✅ | — | P0 |
| 2.2 | **Button primitive** — Shadow `xs`→`sm`. Add `hover:shadow-md` + `hover:scale-[1.02]`. Fix outline to `bg-transparent`. Add compact `xs` size. | ✅ | — | P0 |
| 2.3 | **Input primitive** — Refine focus ring (shadow + border-color instead of ring-offset). | ✅ | — | P1 |
| 2.4 | **Sidebar primitive** — Add `backdrop-blur-sm`. Nav items to pill/compact (`rounded-full`) with tighter padding. | ✅ | — | P1 |

**Gate:** Primitives feel noticeably polished. Snapshot comparison.

---

## Phase 3: Page-Level Components
| # | Task | Status | Assignee | Priority |
|---|---|---|---|---|
| 3.1 | **HeroBanner** — Animated CSS blobs, radial gradient overlay, `animate-float` on illustration, button glow `shadow-purple-500/20`, mobile fallback | ✅ | — | P0 |
| 3.2 | **LanguageCard** — Boost gradient hover opacity, `hover:-translate-y-0.5`, frosted glass unavailable state, SVG flag fallback | ✅ | — | P0 |
| 3.3 | **CourseProgressCards** — shadcn Button for "See All", hover lift, `shadow-md` at rest, shadcn Button for bell icon | ✅ | — | P1 |
| 3.4 | **Quick Tips** (home page) — Replace raw divs with Card primitives, emoji → lucide-react outlined icons, consistent shadow/hover | ✅ | — | P1 |
| 3.5 | **StudyCard** — Richer gradient (`from-primary/10 → via-card → to-primary/20`), `shadow-card`, animated circles, refined kbd styles | ✅ | — | P0 |
| 3.6 | **Other home components** — ProfileCard, ActivityChart, MentorList, ContinueWatching, SearchBar: apply `shadow-card`, hover transitions | ✅ | — | P2 |
| 3.7 | **ProfileForm** — Apply token consistency, shadow-card pattern | ✅ | — | P2 |
| 3.8 | **Remaining pages** — Login, Register, Stats, Profile, Admin, Flashcards, Vocabulary, Python: token consistency pass | ✅ | — | P2 |

**Gate:** All major UI surfaces updated. Visual regression check.

---

## Phase 4: Polish & Micro-Interactions
| # | Task | Status | Assignee | Priority |
|---|---|---|---|---|
| 4.1 | Page transition animations (`animate-fade-in-up` on route change) | ⬜ | — | P1 |
| 4.2 | Toast notification spring-physics animation | ⬜ | — | P1 |
| 4.3 | Loading shimmer states on cards during data fetch | ⬜ | — | P2 |
| 4.4 | Scrollbar colors → theme tokens (replaces hardcoded `#d1d1d6`) | ⬜ | — | P1 |
| 4.5 | Subtle hover scale on all `<a>` and `<button>` globally | ⬜ | — | P2 |
| 4.6 | Dark mode audit — verify all new styles in `.dark` mode | ⬜ | — | P0 |

**Gate:** Interaction polish complete. Cross-mode tested.

---

## Phase 5: QA & Performance
| # | Task | Status | Assignee | Priority |
|---|---|---|---|---|
| 5.1 | Visual regression test — all pages, light + dark | ⬜ | — | P0 |
| 5.2 | Performance audit — no unused CSS, no blocking assets | ⬜ | — | P0 |
| 5.3 | Responsive test — mobile, tablet, desktop | ⬜ | — | P0 |
| 5.4 | Accessibility — contrast ratios, focus indicators, `prefers-reduced-motion` | ⬜ | — | P1 |
| 5.5 | Cleanup — replace leftover arbitrary shadow/class with tokens | ⬜ | — | P1 |

**Gate:** Ship-ready. Final review.

---

## Stats
- Total tasks: **27**
- P0 (critical path): 10
- P1 (important): 9
- P2 (nice-to-have): 8