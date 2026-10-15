# Cadence Design & UI Audit

## 1. Screens and Routes
*The application uses `react-router-dom` defined in `[src/App.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/App.jsx)`. The landing page is excluded from this list. Authenticated routes are wrapped in `[src/components/AppShell.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/components/AppShell.jsx)`.*

- **Auth Page** (`/auth`) - `[src/pages/AuthPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/AuthPage.jsx)`
  - *Layout:* Two-panel split on desktop (left illustration overlay, right form).
  - *Flow:* Handles sign in, sign up, and forgot password. Uses state to toggle between modes.
- **Task List (Dashboard)** (`/`) - `[src/pages/TaskListPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/TaskListPage.jsx)`
  - *Layout:* Page header with stats, Tab bar (Active/Completed) and Create New Task CTA, followed by urgency groups (Due Today, Due This Week, Coming Up).
  - *Flow:* Displays all tasks grouped by urgency. User can toggle tabs, trigger Create Task modal, or delete tasks.
- **Task Detail** (`/tasks/:id`) - `[src/pages/TaskDetailPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/TaskDetailPage.jsx)`
  - *Layout:* Action nav (Back, Edit, Delete), large Task Header card (title, meta, progress bar), followed by a list of `CheckpointCard` components.
  - *Flow:* Detailed view of a single task. Users can check off checkpoints, which triggers a 10s undo toast, and edit task details.
- **Analytics** (`/analytics`) - `[src/pages/AnalyticsPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/AnalyticsPage.jsx)`
  - *Layout:* Performance metrics and charts (via Recharts).
- **Settings** (`/settings`) - `[src/pages/SettingsPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/SettingsPage.jsx)`
  - *Layout:* User preferences and account management.
- **Admin Dashboard** (`/admin`) - `[src/pages/AdminDashboard.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/AdminDashboard.jsx)`
  - *Layout:* Administrative controls.
- **Reset Password** (`/reset-password`) - `[src/pages/ResetPasswordPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/ResetPasswordPage.jsx)`
  - *Layout:* Password update form.
- **Payment Callback** (`/payment/callback`) - `[src/pages/PaymentCallbackPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/PaymentCallbackPage.jsx)`
  - *Layout:* Loading state/confirmation for subscription callbacks.

## 2. Design System
*Defined globally in `[src/index.css](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/index.css)`. The system uses an 8px base grid scaled to 80% (6.4px). No external theme file; values are CSS variables.*

- **Colors:**
  - Backgrounds: `--bg: #051F20`, `--surface: #0B2B26`, `--surface-2: #163832`
  - Accents: `--accent: #235347`, `--accent-glow: rgba(142, 182, 155, 0.30)`, `--accent-dim: rgba(35, 83, 71, 0.22)`, `--accent-hover: #2d6a57`
  - Text: `--text: #DAF1DE` (Primary), `--text-2: #8EB69B` (Secondary), `--text-3: rgba(142, 182, 155, 0.40)` (Muted)
  - Status: `--success: #4ade80`, `--warning: #f59e0b`, `--danger: #ef4444`
  - *Theming:* Supports light/dark mode via `color-scheme: dark` and `useTheme` hook, though CSS variables mainly define a dark forest green palette.
- **Typography:**
  - *Font Family:* `Cantarell`, sans-serif.
  - *Sizes (80% scaled):* `--text-xs: 9.6px`, `--text-sm: 11.2px`, `--text-base: 12.8px`, `--text-lg: 16px`, `--text-xl: 19.2px`, `--text-2xl: 25.6px`, `--text-3xl: 38.4px`.
  - *Weights:* Base text is normal, headings are `700` or `800`.
- **Spacing & Radii:**
  - *Spacing:* `--s1: 6.4px`, `--s2: 12.8px`, `--s3: 19.2px`, `--s4: 25.6px` up to `--s16: 102.4px`.
  - *Radii:* `--r-sm: 4.8px`, `--r-md: 8px`, `--r-lg: 12.8px`, `--r-xl: 19.2px`, `--r-pill: 999px`.
- **Borders & Shadows:**
  - *Borders:* `--border: rgba(218, 241, 222, 0.07)`, `--border-2: rgba(218, 241, 222, 0.13)`.
  - *Shadows:* `--card-shadow: 0 8px 40px rgba(0, 0, 0, 0.5)`.
- **Icons:** Custom inline SVGs used heavily (e.g., in `[src/components/Sidebar.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/components/Sidebar.jsx)`, `[src/pages/AuthPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/AuthPage.jsx)`).
- **CSS Framework:** Tailwind is installed in `package.json`, but custom CSS classes and inline styles are predominantly used.

## 3. Components
*Found in `src/components/`. No dedicated UI library; everything is bespoke.*

- **AppShell** (`[src/components/AppShell.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/components/AppShell.jsx)`): Wraps authenticated routes. Contains the Sidebar and mobile topbar.
- **Sidebar** (`[src/components/Sidebar.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/components/Sidebar.jsx)`): Responsive navigation sidebar.
- **TaskCard** (`[src/components/TaskCard.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/components/TaskCard.jsx)`): Displays a task summary.
  - *States:* Completed (green border), Overdue (red border), Urgent (yellow border), Normal (accent border). Shows progress bar and next checkpoint.
- **UrgencyGroup** (`[src/components/UrgencyGroup.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/components/UrgencyGroup.jsx)`): Groups `TaskCard`s by urgency (e.g., "Due Today").
- **CheckpointCard** (`[src/components/CheckpointCard.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/components/CheckpointCard.jsx)`): Individual steps inside `TaskDetailPage`.
  - *States:* Pending, Completed, Locked (previous steps incomplete).
- **Modals:**
  - `CreateModalPanel.jsx`: Form to create a task.
  - `EditTask.jsx`: Form to edit a task.
  - `DeleteConfirmModal.jsx`: Confirmation prompt.
  - `UpgradeModal.jsx`: Pro tier upsell.
  - `OverdueResolutionModal.jsx`: Flow to address overdue tasks.
- **CSS-only Components** (`[src/index.css](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/index.css)`):
  - *Buttons:* `.btn-primary`, `.btn-secondary`, `.btn-danger`.
  - *Forms:* `.field-input`, `.field-select`, `.field-textarea`, `.field-label`.
  - *Badges:* `.badge`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-accent`, `.badge-neutral`.
  - *Alerts/Toasts:* `.alert`, `.toast`.

## 4. Navigation and Structure
- **Desktop:** Left-side fixed `Sidebar`. Expandable/collapsible (saves state to `localStorage`).
- **Mobile:** Top bar with a hamburger menu that opens the `Sidebar` via an overlay backdrop.
- **Breakpoints:** Mobile layout triggers at `max-width: 768px`. The main container (`--container-max`) is `896px`.
- **Layout Approach:** Flexbox heavily used. `AppShell` handles the persistent main layout.

## 5. Behavior and Feel
- **Visual Style:** Glassmorphism (`.glass` class) with dark, semi-transparent backgrounds and backdrop blur.
- **Animations:**
  - Custom GSAP staggers for lists (e.g., cards sliding up in `TaskDetailPage.jsx`).
  - Hooks like `usePageTransition` and `useModalAnimation` manage entrance/exit states.
  - `AnimatedToast` provides actionable feedback (e.g., 10s countdown to undo checking a checkpoint).
  - Background mesh gradient (`.mesh-gradient`) is static but provides depth.
- **Loading & Empty States:**
  - Full-page and component-level spinners (`.spinner`, `.spinner-large`).
  - Styled `.empty-state` classes for lists with zero items.
- **Forms & Validation:** Basic HTML5 validation combined with state-driven toast/alert messages for errors (e.g., minimum password length in `AuthPage.jsx`).

## 6. Tech
- **Framework:** React 19 + Vite.
- **Routing:** `react-router-dom` v7.
- **Styling Approach:** Global CSS (`[src/index.css](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/index.css)`) mixed heavily with inline style objects in React components. Tailwind CSS is configured but largely ignored in favor of custom tokens and inline styles.
- **State Management:** React local state (`useState`, `useRef`), Context (`useAuth`, `useTheme`).
- **Animations:** `gsap` and `framer-motion` are installed, with GSAP actively used for staggers.
- **Database/Backend:** Supabase JS client.

## 7. Gaps & Inconsistencies
- **Mixed Styling Paradigm:** The codebase uses a chaotic mix of global CSS classes (`.glass`, `.btn-primary`) and heavy inline styles. For example, `[src/pages/TaskDetailPage.jsx](file:///c:/Users/USER/Desktop/Everything/dev🧑🏾‍💻/SAAS/cadencee/src/pages/TaskDetailPage.jsx)` is full of `style={{ display: 'flex', justifyContent: 'space-between', ... }}` instead of relying on a utility framework (like the installed Tailwind) or structural CSS classes.
- **Hardcoded Colors in JS:** While CSS variables exist, many components use hardcoded RGBA values inline (e.g., `border: '1px solid rgba(16,185,129,0.3)'` in `TaskDetailPage.jsx`).
- **Theme Support Incomplete:** There is a theme toggle (Dark/Light) in the `Sidebar`, but `index.css` forces deep dark forest greens (`--bg: #051F20`) and relies on `color-scheme: dark`. Switching to light mode likely results in visual inconsistencies or unreadable text.
- **Icon inconsistency:** Icons are manually constructed inline SVGs across files instead of using a unified component library (like Lucide React).
