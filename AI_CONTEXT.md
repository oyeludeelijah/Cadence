You are helping me build my final year project — a web app called the AI Accountability System. Here is everything you need to know.

---

## What the app does
Helps students break large academic tasks (essays, problem sets, exam prep) into time-bound checkpoints automatically. User creates a task with title, type, and deadline — system generates a checkpoint roadmap. Tracks urgency (pending → urgent → overdue → completed) and enforces accountability through a 10-second undo window that locks out after expiry.

---

## Tech stack

- React 19.2.0 + Vite 7.3.1
- React Router DOM 7.13.0
- Supabase (PostgreSQL + PostgREST) — backend and database
- Vanilla CSS only — custom design system in `src/index.css` (~970 lines), no Tailwind, no component libraries
- No state management library — pure useState, useEffect, useCallback, useRef
- JavaScript/JSX throughout
- **No extra AI packages** — AI calls use plain `fetch` via a Vite proxy (see AI section below)

---

## File structure

api/
└── nvidia.js                  # Vercel serverless proxy for production AI
src/
├── App.jsx                    # Route guard — shows AuthPage if no session, AppShell+Routes if authenticated
├── index.css                  # Full design system — source of truth
├── supabaseClient.js
├── pages/
│   ├── AuthPage.jsx           # Sign In / Sign Up page (tab toggle, existing design system classes)
│   ├── TaskListPage.jsx       # ~560 lines
│   └── TaskDetailPage.jsx     # ~515 lines
├── components/
│   ├── CreateTask.jsx         # ~290 lines — attaches user_id on task insert
│   ├── AppShell.jsx           # Persistent layout wrapper (sidebar + main)
│   ├── Sidebar.jsx            # Shows user email + Sign Out button
│   └── DeleteConfirmModal.jsx # ~91 lines
├── hooks/
│   ├── useAuth.js             # Wraps Supabase session — returns { session, loading, user }
│   ├── useReveal.js
│   └── useTheme.js
└── utils/
    ├── checkpointHelpers.js   # getCheckpointStatus(), getOverdueText(), getTimeUntilDue()
    └── generateCheckpoints.js # AI checkpoint generation via NVIDIA NIM — COMPLETE

vite.config.js                 # Has proxy config for local dev AI
vercel.json                    # Rewrite rule for production AI proxy
.env                           # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (Local dev only: VITE_NVIDIA_API_KEY)


⚠️ `DESIGN_SYSTEM.md` is stale — ignore it. Source of truth is `src/index.css`

---

## Database

- **tasks** — `id`, `title`, `task_type` ('essay'|'problem_set'|'exam_prep'), `final_deadline`, `notes`, `status` ('active'|'completed'), `created_at`
- **checkpoints** — `id`, `task_id` (FK), `checkpoint_number`, `checkpoint_type`, `due_date`, `status` ('pending'|'completed'), `completed_at`, `created_at`, `ai_generated` (boolean, default false)
- **task_templates** — `id`, `task_type`, `checkpoint_sequence` (JSONB) — fallback only, do not remove

- No cascade deletes — app manually deletes checkpoints before task
- **RLS is enabled** on both `tasks` and `checkpoints` tables
  - `tasks_owner` policy: `auth.uid() = user_id`
  - `checkpoints_owner` policy: via parent task's `user_id`
- Auth uses Supabase email/password (email confirmation disabled for prototype)
- `tasks` has a `user_id uuid` column referencing `auth.users(id)`
- Task list uses joined query: `select('*, checkpoints(*)')`

**Check Constraints (applied directly in Supabase SQL editor):**
- `tasks`: title not empty, `task_type` must be `'essay'|'problem_set'|'exam_prep'`, `status` must be `'active'|'completed'`
- `checkpoints`: `checkpoint_number > 0`, `status` must be `'pending'|'completed'`, `checkpoint_type` not empty

---

## AI feature — COMPLETE AND WORKING

### What it does
Replaces `task_templates` as the checkpoint source. When a user creates a task, the app calls the NVIDIA NIM API to generate a contextual checkpoint plan. If the call fails for any reason, it silently falls back to the `task_templates` Supabase query.

### Implementation details

**Provider:** NVIDIA NIM (not Gemini — see dead ends below)
**Model:** `meta/llama-3.1-8b-instruct` — fast 8B model, great at structured JSON, responds in 2–5 seconds
**Endpoint:** `https://integrate.api.nvidia.com/v1/chat/completions` (OpenAI-compatible)
**API key:** stored in `.env` as `VITE_NVIDIA_API_KEY` (starts with `nvapi-`)

**CORS solution:** NVIDIA NIM does not allow direct browser-to-API requests.
- **Local Development:** A Vite dev-server proxy is configured in `vite.config.js`. The fetch call in `generateCheckpoints.js` uses `/nvidia-api/chat/completions` — the proxy rewrites it to NVIDIA's endpoint.
- **Production (Vercel):** Since Vite proxies don't exist in production, the app uses a Vercel serverless function (`api/nvidia.js`) as a proxy. A `vercel.json` rewrite rule maps `/nvidia-api/(.*)` to `/api/nvidia`, maintaining the same fetch path used in local development.

**Production URL:** `elijah-fyp.vercel.app` (AI feature confirmed working in production)

**Deployment Requirements:**
- `api/nvidia.js` must exist as the server-side proxy
- `vercel.json` must contain the rewrite rule
- `NVIDIA_API_KEY` must be set in Vercel environment variables (server-side only, no `VITE_` prefix)

**Key file:** `src/utils/generateCheckpoints.js`
- Exports: `generateCheckpoints(taskTitle, taskType, deadlineDate, notes)`
- Returns: array of `{ checkpoint_type, checkpoint_number, due_date, status: 'pending' }` or `null` on failure
- Has a **20-second hard timeout** via `AbortController` — aborts and returns `null` if model is slow
- Strips stray markdown fences from the model response before `JSON.parse`
- Validates response shape before returning — returns `null` if malformed

**Request config:**
```js
model:       'meta/llama-3.1-8b-instruct'
temperature: 0.3
max_tokens:  512
stream:      false
```

**`ai_generated` column:** Set to `true` on each checkpoint row when NVIDIA is used. Set to `false` (implicitly) when falling back to templates.

### UI changes for AI

**`CreateTask.jsx`:**
- `aiActive` state → true while NVIDIA is generating
- Button shows `"AI is planning your task…"` (with spinner) when `aiActive` is true
- Button shows `"Creating checkpoints…"` when `loading` is true (fallback path)
- After success: `setTimeout(() => onTaskCreated(), 1800)` — 1.8s delay so the success message is visible before the modal closes
- Success message: `"X checkpoints generated by AI ✨"` (AI path) or `"X checkpoints created"` (fallback)

**`TaskListPage.jsx`:**
- Tasks where any checkpoint has `ai_generated: true` show a small `AI ✨` badge next to the task type badge

**`TaskDetailPage.jsx`:**
- Same `AI ✨` badge shown in the task header next to the status badge

### Dead ends — do NOT revisit these

- **Gemini API (`@google/generative-ai`):** Attempted first. Failed with `429 Quota Exceeded, limit: 0` on every Google Cloud project tried — even after enabling the Generative Language API in the console and creating fresh keys. Root cause: free-tier quota was never provisioned for the specific project/region. **Do not suggest going back to Gemini.**
- **`deepseek-ai/deepseek-v3.2` on NVIDIA NIM:** Works, but takes 1–5 minutes per request on the free tier (671B model). Replaced with `llama-3.1-8b-instruct`.
- **`gemini-1.5-flash`:** Returns 404 on the `v1beta` endpoint used by the SDK. Not supported.

---

## Core logic

**Checkpoint status (`getCheckpointStatus()`):**
- `completed` → green
- `pending` → indigo
- `urgent` → amber (< 24h until due)
- `overdue` → red (past due, not complete)

**Undo system:** 10s countdown toast → locks out after expiry → timer in `useRef`. Persisted to `sessionStorage` (keyed by task ID) so it survives page refreshes.

**Task reconciliation:** On fetch, if all checkpoints are done but `task.status` is `'active'` → updates DB to `'completed'`

**`adjustToWorkingHours(rawDate, deadline, spanMs)`** in `CreateTask.jsx`:
- Clamps checkpoint times to 9 AM–9 PM.
- Skips/relaxes adjustment entirely if deadline span < 24h (to avoid pushing checkpoints past the deadline).
- Safety net: ensures adjusted time is in the future and strictly before the final deadline; otherwise defaults to safe proportional fallback.

**AI Normalization** in `generateCheckpoints.js`:
- For long-term tasks (> 36h), forces 5 PM consistency.
- For short-term tasks (< 36h), trusts the AI's proportional timing to prevent "impossible" deadlines.

---

## What's fully working

Task creation (AI + fallback), urgency grouping, tab switching, checkpoint toggle, 10s undo (survives refresh), deletion with user-visible errors, progress bars, 4-state status, dark/light mode + anti-FOUC, scroll-reveal, mobile responsive (768px), connection indicator, loading/error states, AI badge on task cards and detail page, **user authentication (email/password sign-up + sign-in + sign-out)**, **RLS — users only see their own tasks**.

---

## Known bugs — do not make these worse

- Undo timer might drift slightly (ms level) after a refresh due to `Math.ceil` rounding, but functionally correct.

---

## Not built yet

- Edit task
- Email notifications
- Analytics dashboard
- Gamification

---

## Design rules — non-negotiable

- Vanilla CSS only — no Tailwind, no libraries
- Use CSS custom property tokens from `index.css` — never hardcode values
- Background `#080810`, accent `#6366f1`, glassmorphism cards
- Fonts: Outfit (headings), Inter (body)
- 8px grid — `--s1` through `--s16`
- Dark/light mode must work at all times
- Mobile responsive always

---

## Coding conventions

- No external state libraries
- `useRef` for timer IDs
- Supabase errors surface as user-readable messages
- Reusable UI → `src/components/`
- Pure logic → `src/utils/`
- Custom hooks → `src/hooks/`

---

## Environment

App runs locally at `http://localhost:5173` (may shift to `5174` if port is busy). Dev server: `npm run dev`.

**Ask me which feature we're working on before touching anything.**
