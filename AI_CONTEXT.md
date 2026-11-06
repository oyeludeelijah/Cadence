You are helping me build my final year project — a web app called Cadencee (AI Accountability System). Here is everything you need to know.

---

## What the app does
Helps students break large academic tasks (essays, problem sets, exam prep) into time-bound checkpoints automatically. User creates a task with title, type, and deadline — system generates a checkpoint roadmap via AI. Tracks urgency (pending → urgent → overdue → completed) and enforces accountability through a 10-second undo window that locks out after expiry.

---

## Tech stack

- React 19.2.0 + Vite 7.3.1
- React Router DOM 7.13.0
- GSAP 3.x (animation engine — modals, stagger effects, counters, sidebar collapse)
- Recharts 3.x (Analytics visualisations)
- Supabase (PostgreSQL + PostgREST) — backend, database, auth, and Edge Functions
- Core app uses Vanilla CSS (`src/index.css`). Landing pages use Tailwind CSS v4 (`src/pages/landing.css`, `src/pages/landing-gold.css`)
- React Context API for centralised auth state (`AuthContext`) — prevents redundant subscriptions
- No external state management library (Redux, Zustand) — pure useState, useEffect, useCallback, useRef
- JavaScript/JSX throughout
- **No extra AI packages** — AI calls use plain `fetch` via a Vite proxy (see AI section below)
- **Supabase Edge Functions + pg_cron** with Resend for hourly automated email reminders
- **Paystack** for subscription payments (not Stripe — see payment section)

---

## File structure

```
api/
└── nvidia.js                  # Vercel serverless proxy for production AI
src/
├── App.jsx                    # Route guard + authenticated layout
├── App.css                    # Base resets
├── index.css                  # Full design system for core app (source of truth)
├── supabaseClient.js
├── constants/
│   └── taskTypes.js           # TASK_TYPE_OPTIONS array shared by CreateTask + EditTask
├── contexts/
│   └── AuthContext.jsx        # Single source of truth for Supabase auth state
├── pages/
│   ├── LandingPage.jsx        # Public landing page (Tailwind CSS)
│   ├── AuthPage.jsx           # Sign In / Sign Up / Forgot Password
│   ├── TaskListPage.jsx       # Home — task list, urgency grouping, floating create button
│   ├── TaskDetailPage.jsx     # Individual task — checkpoints, undo, progress
│   ├── AnalyticsPage.jsx      # Metrics computation and Recharts visualisations
│   ├── SettingsPage.jsx       # Working hours, data export, account deletion
│   ├── AdminDashboard.jsx     # System intelligence and logging
│   ├── PaymentCallbackPage.jsx# Paystack subscription callback polling
│   └── ResetPasswordPage.jsx  # Password reset flow
├── components/
│   ├── landing/               # Tailwind components for public pages
│   ├── AppShell.jsx           # Persistent layout wrapper (sidebar + main + mobile topbar)
│   ├── Sidebar.jsx            # Nav, theme toggle (pill), sign out, GSAP collapse
│   ├── CreateTask.jsx         # Form to create tasks with AI integration
│   ├── EditTask.jsx           # Pre-filled edit form (metadata only)
│   ├── TaskCard.jsx           # Task preview card in lists
│   ├── CheckpointCard.jsx     # UI for individual checkpoints
│   ├── UrgencyGroup.jsx       # Task grouping section by urgency label
│   ├── CreateModalPanel.jsx   # Slide-out panel wrapping CreateTask
│   ├── DeleteConfirmModal.jsx # Confirmation for task deletions
│   ├── OverdueResolutionModal.jsx # Resolves overdue items before new task creation
│   ├── UpgradeModal.jsx       # Premium subscription intercept (50 active task limit)
│   ├── ErrorBoundary.jsx      # Global error catching
│   ├── AnimatedCounter.jsx    # GSAP number scrubber for analytics
│   └── AnimatedToast.jsx      # Generic toast notification system
├── hooks/
│   ├── useAuth.js             # Consumes AuthContext (session, user, loading)
│   ├── useReveal.js           # CSS scroll reveal (IntersectionObserver)
│   ├── useTheme.js            # Dark/light mode toggle + localStorage
│   ├── useTaskForm.js         # Controlled form logic for task creation/editing
│   ├── useModalAnimation.js   # GSAP modal enter/exit physics
│   └── usePageTransition.js   # GSAP page fade-in
└── utils/
    ├── checkpointHelpers.js   # getCheckpointStatus, getTimeUntilDue, getOverdueText
    ├── buildCheckpointPrompt.js # Constructs the LLM prompt string
    ├── generateCheckpoints.js # Orchestrates AI checkpoint generation + date normalisation
    ├── normaliseDueDates.js   # clampToWorkingHours + validateAndRepairDueDates
    ├── taskGrouping.js        # groupTasks(tasks) → { dueToday, dueThisWeek, dueLater }
    └── nimApiClient.js        # NVIDIA NIM HTTP client (fetch, AbortController, backoff)

vite.config.js                 # Dev proxy: /nvidia-api → NVIDIA NIM endpoint
vercel.json                    # SPA fallback + rewrite rule for production AI proxy
.env                           # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_AI_ENABLED
supabase/
└── functions/
    ├── send-reminders/index.ts      # Hourly Edge Function via pg_cron → Resend emails
    ├── paystack-checkout/index.ts   # Initiates Paystack payment session
    └── paystack-webhook/index.ts    # Processes Paystack webhook events → subscriptions table
docs/
└── design-audit.md            # Visual audit notes (reference only)
tests/
└── test-*.mjs                 # Node --test unit tests for utilities and component contracts
```

⚠️ `DESIGN_SYSTEM.md` is stale — ignore it. Source of truth is `src/index.css`.
⚠️ `AboutPage.jsx`, `ContactPage.jsx`, `FeaturesPage.jsx` were deleted — do not recreate them.

---

## Database

- **tasks** — `id`, `user_id` (FK to auth.users), `title`, `task_type` ('essay'|'problem_set'|'exam_prep'), `final_deadline`, `notes`, `status` ('active'|'completed'), `plan_title` (nullable text), `plan_summary` (nullable text), `created_at`
- **checkpoints** — `id`, `task_id` (FK), `checkpoint_number`, `checkpoint_type`, `due_date`, `status` ('pending'|'completed'), `completed_at`, `created_at`, `ai_generated` (boolean, default false), `rationale` (nullable text), `reminder_sent_urgent` (boolean, default false), `reminder_sent_overdue` (boolean, default false)
- **task_templates** — `id`, `task_type`, `checkpoint_sequence` (JSONB) — AI fallback only, do not remove
- **subscriptions** — `user_id`, `status`, `current_period_end`, `paystack_customer_code` — tracks subscription state
- **webhook_events** — idempotency table for Paystack webhook processing
- **system_logs** — tracks system events for AdminDashboard

- No cascade deletes — app manually deletes checkpoints before task
- **RLS enabled** on `tasks`, `checkpoints`, `subscriptions`
- Auth: Supabase email/password (email confirmation disabled for prototype)
- Task list uses joined query: `select('*, checkpoints(*)')`

**Custom RPC:**
- `create_task_with_checkpoints(p_task, p_checkpoints)` — atomic Postgres transaction; raises `P0001 FREE_TIER_LIMIT` if free user has ≥ 50 active tasks
- `get_pending_reminders(time_window_iso TEXT)` — `SECURITY DEFINER` for email Edge Function

**Check Constraints:** title not empty, task_type/status in enum, checkpoint_number > 0, checkpoint_type not empty

**Extensions:** `pg_cron` enabled for hourly jobs

---

## AI feature — COMPLETE AND WORKING

**Provider:** NVIDIA NIM  
**Model:** `nvidia/nemotron-3.5-lightning-30b-a3b`  
**Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions`  
**Feature flag:** `VITE_AI_ENABLED=true` in `.env`  
**API key:** `NVIDIA_API_KEY` (dev proxy + prod both read server-side; never in browser bundle)

**CORS solution:**
- Local: Vite proxy in `vite.config.js` → `/nvidia-api/...`
- Prod: `api/nvidia.js` serverless function; `vercel.json` rewrite

**Production URL:** `elijah-fyp.vercel.app`

**`generateCheckpoints()` return shape (success):**
```js
{
  planTitle:   string,
  planSummary: string,
  checkpoints: [{ checkpoint_type, rationale, checkpoint_number, due_date, status: 'pending' }]
}
// null on failure → caller falls back to task_templates
```

**Model config (in `nimApiClient.js`):**
```js
model:       'nvidia/nemotron-3.5-lightning-30b-a3b'
temperature: 0.3
max_tokens:  1024
stream:      false
```

**Retry config:** TIMEOUT_MS=90000, MAX_RETRIES=3, MAX_TOTAL_BUDGET_MS=100000. Retries on 408/429/500/502/503/504.

**`ai_generated`:** true per checkpoint when NVIDIA path used.  
**`rationale`:** AI explanation per checkpoint, stored in DB.  
**`plan_title`/`plan_summary`:** stored on tasks row.

**Date normalisation (in `generateCheckpoints.js`):**
- Long-term (>36h): fix to `workingHours.end - 1` hour
- Short-term (<36h): trust AI proportional timing
- Final pass: `validateAndRepairDueDates()` enforces monotonic ordering

### Dead ends — do NOT revisit
- **Gemini API:** 429 Quota (limit: 0). Do not suggest.
- **deepseek-ai/deepseek-v3.2:** 1–5 min per request on free tier.
- **meta/llama-3.1-8b-instruct:** EOL'd 2026-08-26.
- **nvidia/llama-3.1-nemotron-nano-8b-instruct:** Too slow; replaced.

---

## Payment — Paystack (NOT Stripe)

- Flow: `UpgradeModal` → `paystack-checkout` Edge Function → Paystack hosted page → webhook → `subscriptions` table
- Free tier: 50 active tasks (enforced in RPC + client-side pre-check in `TaskListPage.jsx`)
- Callback: `PaymentCallbackPage.jsx` polls every 3s up to 2 min
- ⚠️ Do NOT suggest Stripe.

---

## Core logic

**Checkpoint status:** completed→green, pending→indigo, urgent→amber (<24h), overdue→red

**Task grouping (`groupTasks()`):** strictly `if…else if…else` — a task can NEVER be in two buckets simultaneously. Uses `nextCheckpoint.due_date` or `final_deadline` as `urgDate`.

**Undo:** 10s countdown → locks after expiry. `useRef` for timer. `sessionStorage` persistence (keyed by task ID).

**Task reconciliation:** all checkpoints done but status 'active' → auto-update DB to 'completed'.

**Free tier check** in `TaskListPage.handleCreateClick`: parallel queries for subscription + active count; if `!isPro && activeCount >= 50` → `UpgradeModal`. RPC also enforces with P0001.

---

## UI

**Auth (`AuthPage.jsx`):** placeholder `you@school.edu`; "Forgot password?" styled accent color + weight 600 + underline; buttons use `var(--r-md)` radius.

**Settings (`SettingsPage.jsx`):** eyebrow "Preferences"; `var(--container-max)` container; no duplicate theme toggle.

**Create task (`CreateTask.jsx`):** deadline input `type="datetime-local"` (NOT `type="date"`); parsed by `new Date(form.dueDate)`; styled via `.field-input` CSS + `webkit-datetime-edit` pseudo-elements.

**Sidebar:** theme toggle reachable on mobile (inside drawer opened by hamburger in `AppShell.jsx`).

---

## What's fully working

Task creation (AI + fallback), edit task, urgency grouping, tab switching, checkpoint toggle, 10s undo (survives refresh), deletion, progress bars, 4-state status, dark/light mode + anti-FOUC, scroll-reveal, mobile responsive (768px), connection indicator, AI badge on cards/detail, auth (sign-up/in/out/forgot/reset), RLS, automated email reminders, analytics, GSAP animations, user settings, Paystack payment, Admin Dashboard.

---

## Known bugs — do not make worse

- Undo timer may drift slightly after refresh (ms level, functionally correct).
- **Debug `console.log('[taskGroups]', {...})` at `TaskListPage.jsx` ~line 150** — added to help reproduce duplicate-task symptom. **Remove before committing.**
- 29 pre-existing ESLint errors (hooks after early return in `TiltCard.jsx`, setState in effect in `AnimatedToast.jsx`/`Sidebar.jsx`, unused imports in `TaskDetailPage.jsx`/`TaskListPage.jsx`). Do not introduce new ones.

---

## Not built yet

- Gamification / streak system

---

## Design rules — non-negotiable

- Core app: Vanilla CSS via `src/index.css` only. Landing: Tailwind CSS v4.
- Use CSS custom property tokens — never hardcode values in core app.
- Background `#080810`, accent `var(--accent)` (indigo `#6366f1`), glassmorphism (`.glass`)
- Fonts: Outfit (headings), Cantarell/Inter (body/inputs)
- 8px spacing grid: `--s1` through `--s16`
- Dark/light mode always; mobile responsive always (768px)

---

## Coding conventions

- No external state libraries; `useRef` for timers; Supabase errors → user-readable messages
- Reusable UI → `src/components/`; pure logic → `src/utils/`; hooks → `src/hooks/`; constants → `src/constants/`

---

## Environment

Local: `http://localhost:5173`. Dev server: `npm run dev`.

**`.env` keys:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_AI_ENABLED`

**Ask me which feature we're working on before touching anything.**
