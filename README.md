# AI Accountability System 🎯

A web app that helps students stop leaving things to the last minute — by breaking down big assignments into AI-generated, time-bound checkpoints and actually holding them to it.

## Description

Most task management apps just give you a list. This one gives you a plan. You add a task — say, "Write a 3000-word history essay" — set a deadline, and the system calls an AI model (Meta's Llama 3.1 via NVIDIA NIM) to generate a realistic checkpoint roadmap tailored to your task type and timeline. Each checkpoint has a due date, a status, and a purpose. If you fall behind, it flags it. If you try to mark something done by accident, you've got 10 seconds to take it back.

Built as my final year project, the core question I'm exploring is whether AI-assisted task decomposition can meaningfully reduce procrastination — compared to just writing a to-do list yourself. The system tracks completion rates, urgency patterns, and whether AI-generated plans actually outperform template-based ones. All the data lives in a Supabase backend with proper row-level security, so users only ever see their own stuff.

It's a full-stack app: React 19 on the frontend, Supabase for auth/database/edge functions, GSAP for animations, Recharts for the analytics dashboard, and automated email reminders sent via Resend on an hourly pg_cron schedule.

## Getting Started

### Dependencies

- Node.js v18 or later
- npm
- A [Supabase](https://supabase.com) project (free tier is fine)
- An [NVIDIA NIM API key](https://build.nvidia.com) — free to get, just sign up and grab one from any model page
- A [Resend](https://resend.com) account (only needed if you want the email reminder feature)
- Runs on Windows, macOS, or Linux — no OS-specific quirks

### Installing

Clone the repo and install dependencies:

```bash
git clone https://github.com/oyeludeelijah/elijah-fyp.git
cd elijah-fyp
npm install
```

Create a `.env` file in the root directory with your credentials:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_NVIDIA_API_KEY=your_nvidia_nim_api_key
```

You'll also need the following tables set up in your Supabase project: `tasks`, `checkpoints`, `task_templates`, `subscriptions`, and `system_logs`. The schema is documented in detail below in the [Database section](#database-setup).

> **Supervisors:** If you need access to the demo database credentials, just reach out directly — I can share a read-only key.

### Executing the Program

Start the development server:

```bash
npm run dev
```

Then open your browser and go to:

```
http://localhost:5173
```

(It may use port `5174` if `5173` is already taken — Vite will tell you in the terminal.)

The Vite dev server automatically proxies AI requests to NVIDIA NIM, so you don't need to configure anything extra for the AI feature to work locally.

---

## Database Setup

Here's the schema you need in Supabase. RLS should be enabled on `tasks` and `checkpoints`.

**`tasks`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `user_id` | uuid | FK → auth.users(id) |
| `title` | text | |
| `task_type` | text | `'essay'` \| `'problem_set'` \| `'exam_prep'` |
| `final_deadline` | timestamptz | |
| `notes` | text | nullable |
| `status` | text | `'active'` \| `'completed'` |
| `created_at` | timestamptz | |

**`checkpoints`**
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `task_id` | uuid | FK → tasks.id |
| `checkpoint_number` | integer | |
| `checkpoint_type` | text | e.g. `'Thesis Statement'`, `'First Draft'` |
| `due_date` | timestamptz | |
| `status` | text | `'pending'` \| `'completed'` |
| `completed_at` | timestamptz | nullable |
| `ai_generated` | boolean | default `false` |
| `reminder_sent_urgent` | boolean | default `false` |
| `reminder_sent_overdue` | boolean | default `false` |

**`task_templates`** — fallback only, do not delete  
**`subscriptions`** — tracks Stripe subscription status  
**`system_logs`** — used by the admin dashboard

No cascade deletes — the app manually deletes checkpoints before removing a parent task.

---

## Help

**The AI isn't generating checkpoints.**  
Check that your `VITE_NVIDIA_API_KEY` is set correctly in `.env` and that the dev server was restarted after you added it. The app will silently fall back to template-based checkpoints if the API key is missing or the call fails — so tasks will still be created, they just won't be AI-generated.

**I'm getting a blank screen after sign-in.**  
Make sure your Supabase URL and anon key are correct and that your RLS policies are set up. The app expects `auth.uid() = user_id` on the `tasks` table.

**Vite is using port 5174 instead of 5173.**  
That's fine — something else is already using 5173. The AI proxy still works on whatever port Vite picks.

**The undo timer is slightly off after a page refresh.**  
Known issue — there's a small amount of rounding drift from `Math.ceil`. It's functionally correct (you still get your 10 seconds), just cosmetically slightly off at the ms level.

---

## Authors

**Elijah Oyelude**  
Final Year Computer Science Student  
📧 Reach out via GitHub or your institution email

---

## Version History

- **0.3** — Analytics dashboard, admin panel, email reminders, premium/settings ecosystem, Stripe integration
- **0.2** — Edit task support, AI badge on task cards, mobile responsiveness, dark/light mode anti-FOUC
- **0.1** — Initial release: AI checkpoint generation, 4-state status system, 10-second undo, Supabase auth + RLS

See [commit history](https://github.com/oyeludeelijah/elijah-fyp/commits/main) for the full changelog.

---

## License

This project is submitted as part of a final year academic assessment. Not currently licensed for public redistribution.

---

## Acknowledgments

A few things that genuinely helped:

- [NVIDIA NIM](https://build.nvidia.com) — straightforward OpenAI-compatible API, free tier was enough to get this working
- [Supabase](https://supabase.com) — made the backend side of this project approachable without needing a separate server
- [GSAP](https://gsap.com) — the animation library that made the UI feel alive without a ton of effort
- [Recharts](https://recharts.org) — clean, composable chart components that didn't fight React
- [Resend](https://resend.com) — dead simple transactional email API
- [awesome-readme](https://github.com/matiassingers/awesome-readme) — for the README template inspiration