# AI-Powered Accountability System 🎯

> **Note:** This is a work-in-progress demo for my final year project supervisors. Not all features are complete yet, but the core functionality is there!

## What This Is

Hey there! This is my attempt at solving a problem I (and probably every student ever) face: **procrastination and poor task management**. Instead of just building another to-do list app, I'm creating an AI-powered system that breaks down big scary assignments into manageable checkpoints and actually holds you accountable.

Think of it as having a really organized friend who reminds you to start your essay *before* the night before it's due. Except this friend is a web app and won't judge you for your Netflix binges.

## Current Features ✨

### 1. **Smart Task Breakdown**
- Create a task (like "Write 3000-word essay")
- The system automatically generates checkpoints based on task type
- Each checkpoint gets a realistic due date (no more "I'll do it all tomorrow")
- Checkpoints are adjusted to reasonable hours (because who works at 3 AM? ...okay, students do, but still)

### 2. **4-State Status System**
I built a color-coded system that tells you exactly where you stand:
- 🟢 **Completed** - You did it! Gold star for you
- 🔵 **Pending** - Chill, you've got time
- 🟠 **Urgent** - Less than 24 hours left, maybe start panicking a little?
- 🔴 **Overdue** - Yeah... about that deadline...

### 3. **Accountability Features**
- **10-Second Undo Window**: Marked something complete by accident? You've got 10 seconds to undo before it locks in (because I know how trigger-happy we can be with checkboxes)
- **Visual Progress Tracking**: See exactly how much you've done vs. how much is left
- **Overdue Warnings**: Big red banners that you can't ignore (trust me, I tried)

### 4. **User Experience Stuff**
- **Loading Spinners**: So you know the app isn't frozen, just thinking
- **Error Handling**: Friendly messages when things go wrong (like "check your internet" instead of cryptic error codes)
- **Mobile Responsive**: Works on your phone because let's be real, that's where you'll use it
- **Dark Theme**: Because bright white backgrounds at 2 AM are a crime

## Tech Stack 🛠️

- **Frontend**: React + Vite
- **Backend**: Supabase (PostgreSQL database + auth, all in one)
- **Styling**: Vanilla CSS with glassmorphism (fancy word for "looks like frosted glass")
- **Routing**: React Router (for navigating between pages)

## How to Run This Thing

1. **Clone the repo** (you probably already did this)
   ```bash
   git clone https://github.com/oyeludeelijah/elijah-fyp.git
   cd "Final year project"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Create a `.env` file in the root directory
   - Add your Supabase credentials (get these from your [Supabase Dashboard](https://app.supabase.com)):
     ```
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```
   - **Note for supervisors**: If you need access to the demo database, please contact me directly for credentials.

4. **Run the dev server**
   ```bash
   npm run dev
   ```

5. **Open your browser** to `http://localhost:5173`

## Database Setup 📊

You'll need to create these tables in Supabase:

### `tasks` table
- `id` (uuid, primary key)
- `title` (text)
- `task_type` (text) - e.g., "essay", "problem_set", "exam_prep"
- `final_deadline` (timestamptz)
- `notes` (text, nullable)
- `status` (text) - "active" or "completed"
- `created_at` (timestamptz)

### `checkpoints` table
- `id` (uuid, primary key)
- `task_id` (uuid, foreign key → tasks.id)
- `checkpoint_number` (integer)
- `checkpoint_type` (text) - e.g., "outline", "first_draft", "review"
- `due_date` (timestamptz)
- `status` (text) - "pending" or "completed"
- `created_at` (timestamptz)

### `task_templates` table
- `id` (uuid, primary key)
- `task_type` (text)
- `checkpoint_sequence` (jsonb) - Array of checkpoint definitions

**Example template:**
```json
[
  {"type": "outline", "percentage_of_time": 0.2},
  {"type": "first_draft", "percentage_of_time": 0.5},
  {"type": "review", "percentage_of_time": 0.8},
  {"type": "final_draft", "percentage_of_time": 0.95}
]
```

## Project Structure 📁

```
src/
├── pages/
│   ├── TaskListPage.jsx      # Home page with all tasks
│   └── TaskDetailPage.jsx    # Individual task view with checkpoints
├── CreateTask.jsx             # Form for creating new tasks
├── designSystem.js            # Reusable design tokens (colors, buttons, etc.)
├── supabaseClient.js          # Database connection setup
├── App.jsx                    # Main app with routing
└── index.css                  # Global styles + mobile responsiveness
```

## What's Still Missing 🚧

- **AI Integration**: The "AI-Powered" part is coming soon (currently it's just template-based)
- **User Authentication**: Right now anyone can see/edit everything (not ideal for production)
- **Notifications**: Email/push reminders when deadlines approach
- **Analytics**: Track your productivity patterns over time
- **Gamification**: Points, streaks, achievements (because who doesn't like fake internet points?)

## Known Issues 🐛

- If you create a task with a deadline in the past, weird things happen (don't do that)
- The undo timer doesn't persist if you refresh the page (working on it)
- No data validation on the backend yet (trust me, it's on the list)

## Why This Matters (For My Thesis)

This project explores how breaking down large tasks into smaller, time-bound checkpoints can improve student accountability and reduce procrastination. The system enforces a structured approach to task completion while maintaining flexibility for different task types.

Key research questions:
1. Does automated task breakdown reduce procrastination?
2. Can visual progress tracking improve task completion rates?
3. What's the optimal checkpoint spacing for different task types?

## Contact

If you're a supervisor reading this and have questions (or found bugs), feel free to reach out!

---

**Last Updated**: February 2026  
**Status**: Demo/Prototype  