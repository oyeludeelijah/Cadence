# AI Accountability System 🎯

> **Note:** This is a work-in-progress demo for my final year project supervisors. Core functionality is complete — including AI-powered checkpoint generation.

## What This Is

This is my attempt at solving a problem every student faces: **procrastination and poor task management**. Instead of just building another to-do list app, I've created an AI-powered system that breaks down big academic assignments into manageable, time-bound checkpoints and holds you accountable.

Think of it as a really organised study partner who plans your essay *before* the night before it's due — except it's a web app, and it runs on a genuine AI model.

---

## Current Features ✨

### 1. **AI-Powered Task Breakdown** *(New)*
- Create a task (e.g. "Write 3000-word history essay")
- The system calls an AI model (Meta's Llama 3.1 via NVIDIA NIM) with your title, task type, deadline, and notes
- Llama generates a contextual checkpoint roadmap in 2–5 seconds
- If the AI call fails for any reason, it silently falls back to a Supabase template table — task creation never breaks
- Tasks with AI-generated checkpoints are marked with an **AI ✨** badge on the task list and detail pages

### 2. **Smart Task Scheduling**
- Checkpoints are spaced proportionally across your available time
- Automatically adjusted to reasonable working hours (9 AM–9 PM)
- Tight-deadline mode: if the deadline is less than 24 hours away, only one checkpoint is generated to avoid impossible timings

### 3. **4-State Status System**
A color-coded system that tells you exactly where you stand:
- 🟢 **Completed** — Done!
- 🔵 **Pending** — On track, you have time
- 🟠 **Urgent** — Less than 24 hours left
- 🔴 **Overdue** — Past due and not complete

### 4. **Edit Task Management** *(New)*
- Securely update task titles, types, deadlines, and notes
- Meta-only updates: system preserves your existing checkpoint progress — no messy regeneration
- Smart date validation: handles local timezones correctly and prevents past-deadlines

### 5. **Accountability Features**
- **10-Second Undo Window**: Marked something complete by accident? You have 10 seconds to undo before it locks in permanently. This timer **survives page refreshes** via `sessionStorage`.
- **Visual Progress Tracking**: Progress bar showing completed vs. remaining checkpoints per task
- **Overdue Warnings**: Prominent banners you can't ignore

### 6. **User Authentication & Security**
- **Secure Sign In/Up**: Full authentication system using Supabase Auth
- **Row-Level Security (RLS)**: Users can only see and modify their own tasks and checkpoints
- **Data Integrity**: SQL check constraints ensure valid task types, statuses, and non-empty titles

### 7. **Refined User Experience**
- Mobile responsive (768px breakpoint) with **bottom-sheet interaction patterns** for new tasks
- Loading spinners and skeleton states for all async operations
- Fast, snappy animations powered by **GSAP** (choreographed modals, staggered checkpoint entrances, and dynamic number counters)
- Dark/light mode with anti-FOUC (no flash on load)
- Real-time connection status indicator

### 8. **Automated Reminders** *(New)*
- **Smart Triggers:** Edge Functions check every hour via `pg_cron` for checkpoints due within 24 hours or that are overdue.
- **Idempotent Delivery:** The system tracks which emails have already been sent to prevent flooding users' inboxes.
- **Reliable Dispatch:** Delivered securely via the Resend API.

### 9. **Analytics Dashboard** *(New)*
- **Summary Metrics**: Track total completed tasks, checkpoints, on-time completion rate, and completion streaks.
- **AI Effectiveness**: Compare the on-time rate of AI-generated checkpoints vs. template fallbacks.
- **Procrastination Index**: Measure how early or late you typically complete checkpoints, with visual distribution buckets.
- **Visualisations**: Fully responsive data visualisations built with Recharts.

---

## Tech Stack 🛠️

| Layer | Technology |
|---|---|
| Frontend | React 19.2.0 + Vite 7.3.1 |
| Routing | React Router DOM 7.13.0 |
| Backend / DB | Supabase (PostgreSQL, PostgREST, Edge Functions, pg_cron) |
| Styling | Vanilla CSS — custom design system in `src/index.css` |
| Animations | GSAP 3.x |
| Charts | Recharts 2.x |
| AI | NVIDIA NIM API — `meta/llama-3.1-8b-instruct` via plain `fetch` |
| Email Service | Resend API |

No Tailwind, no component libraries, no external state management (pure hooks).

---

## How to Run This Thing

### 1. Clone the repo
```bash
git clone https://github.com/oyeludeelijah/elijah-fyp.git
cd "Final year project"
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
Create a `.env` file in the root directory:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_NVIDIA_API_KEY=your_nvidia_nim_api_key
```

- **Supabase credentials**: Get from your [Supabase Dashboard](https://app.supabase.com)
- **NVIDIA NIM API key**: Get for free from [build.nvidia.com](https://build.nvidia.com) → any model page → "Get API Key"
- **Note for supervisors**: Contact me directly if you need access to the demo database credentials.

### 4. Run the dev server
```bash
npm run dev
```

### 5. Open your browser
Go to `http://localhost:5173` (may use `5174` if the port is already in use)

> **Note on the AI proxy:** The app uses a Vite dev-server proxy to forward AI requests to NVIDIA NIM without CORS issues. This is configured in `vite.config.js` and works automatically — no extra setup needed.

---

## Database Setup 📊

You'll need these tables in Supabase:

### `tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `title` | text | |
| `task_type` | text | `'essay'` \| `'problem_set'` \| `'exam_prep'` |
| `final_deadline` | timestamptz | |
| `notes` | text | nullable |
| `status` | text | `'active'` \| `'completed'` |
| `created_at` | timestamptz | |

### `checkpoints`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `task_id` | uuid | FK → tasks.id |
| `checkpoint_number` | integer | |
| `checkpoint_type` | text | e.g. `'Thesis Statement'`, `'First Draft'` |
| `due_date` | timestamptz | |
| `status` | text | `'pending'` \| `'completed'` |
| `completed_at` | timestamptz | nullable |
| `created_at` | timestamptz | |
| `ai_generated` | boolean | default `false` — set to `true` when AI generates the checkpoint |
| `reminder_sent_urgent` | boolean | default `false` — prevents edge function from repeatedly emailing |
| `reminder_sent_overdue` | boolean | default `false` — prevents edge function from repeatedly emailing |

### `task_templates` *(fallback only — do not delete)*
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `task_type` | text | |
| `checkpoint_sequence` | jsonb | Array of checkpoint definitions |

**No cascade deletes** — the app manually deletes checkpoints before the parent task.
**RLS is enabled** — users can only see and manage their own data. Auth uses Supabase email/password.

---

## Project Structure 📁

```
src/
├── App.jsx
├── index.css                  # Full design system — source of truth for all styles
├── supabaseClient.js
├── pages/
│   ├── TaskListPage.jsx       # Home — task list, grouping, urgency sections
│   ├── TaskDetailPage.jsx     # Individual task — checkpoints, undo, progress
│   └── AnalyticsPage.jsx      # Metrics and Recharts visualisations
├── components/
│   ├── CreateTask.jsx         # Task creation form with AI integration
│   ├── EditTask.jsx           # Task edit form (metadata only)
│   └── DeleteConfirmModal.jsx # Confirmation modal for task deletion
├── hooks/
│   ├── useReveal.js           # Intersection Observer scroll-reveal hook
│   └── useTheme.js            # Dark/light mode hook with anti-FOUC
└── utils/
    ├── checkpointHelpers.js   # Status logic (getCheckpointStatus, etc.)
    └── generateCheckpoints.js # NVIDIA NIM AI call with fallback logic

vite.config.js                 # Dev proxy: /nvidia-api → NVIDIA NIM endpoint
```

---

## What's Still Missing 🚧

- **Gamification** — Points, streaks, achievements

---

## Known Issues 🐛

- Undo timer might drift slightly (ms level) after a refresh due to rounding, but it is functionally correct.
- Very short deadlines (< 24h) can produce edge-case checkpoint timings.

---

## Why This Matters (For My Thesis)

This project explores how AI-assisted task decomposition and time-bound checkpoints can improve student accountability and reduce procrastination. The system enforces a structured approach to task completion while remaining flexible across different task types (essays, problem sets, exam prep).

**Key research questions:**
1. Does automated, AI-generated task breakdown reduce procrastination compared to manual planning?
2. Can visual progress tracking and urgency cues improve checkpoint completion rates?
3. What is the optimal checkpoint spacing for different academic task types?

---

## Contact

If you're a supervisor reading this and have questions (or found bugs), feel free to reach out!

---

**Last Updated**: March 2026
**Status**: Demo / Prototype — AI integration and User Authentication complete.