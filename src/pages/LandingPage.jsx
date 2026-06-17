import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import LandingNav from '../components/landing/LandingNav';
import LandingFooter from '../components/landing/LandingFooter';
import TiltCard from '../components/landing/TiltCard';
import StatNumber from '../components/landing/StatNumber';
import '../pages/landing.css';

/* ── Small reusable reveal wrapper ─────────────────────────────────────── */
function Reveal({ children, delay = 0 }) {
  const ref = useReveal(0.1);
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-page">
      <LandingNav />

      <main>
        {/* ── SECTION 1: HERO ────────────────────────────────────────────── */}
        <section className="nh-hero" id="hero">
          <div className="nh-container">
            {/* Center Content */}
            <div className="nh-center-panel">
              <div className="nh-hero-logo-wrapper">
                <img src="/logos/halved/cadence-avatar-light-transparent.svg" alt="Cadence" className="nh-hero-logo" />
              </div>
              <h1 className="nh-headline">
                <span className="nh-headline-primary">Finish every assignment, <span style={{ opacity: 0.3, display: 'block' }}>one step at a time.</span></span>
                <span className="nh-headline-secondary">AI breaks your deadline into checkpoints automatically. You just follow the plan.</span>
              </h1>
              <button className="nh-hero-cta" onClick={() => navigate('/auth')}>
                GET STARTED
              </button>
            </div>

            {/* ── Floating Widgets ───────────────────────────────────────── */}

            {/* Widget 1 — Top Left — Checkpoint Card */}
            <div className="hw-widget hw-widget--tl">
              <div className="hw-widget-row">
                <span className="hw-icon hw-icon--check">✓</span>
                <div>
                  <p className="hw-task-title hw-task-title--done">Research</p>
                  <p className="hw-task-sub">Due: Today, 5pm</p>
                </div>
              </div>
              <span className="hw-badge hw-badge--green">COMPLETED</span>
            </div>

            {/* Widget 2 — Top Right — Urgency Badge */}
            <div className="hw-widget hw-widget--tr hw-widget--pill">
              <span className="hw-icon hw-icon--warn">⚠</span>
              <div>
                <p className="hw-task-title hw-task-title--urgent">OVERDUE</p>
                <p className="hw-task-sub">Linear Algebra Problem Set</p>
              </div>
            </div>

            {/* Widget 3 — Bottom Left — AI Generation Card */}
            <div className="hw-widget hw-widget--bl">
              <div className="hw-widget-row">
                <span className="hw-icon hw-icon--doc">📝</span>
                <div>
                  <p className="hw-task-title">Organic Chemistry Midterm</p>
                  <p className="hw-task-sub">Exam Prep · Due in 7 days</p>
                </div>
              </div>
              <div className="hw-ai-row">
                <span className="hw-ai-spark">✦</span>
                <p className="hw-ai-label">AI is planning your task...</p>
              </div>
            </div>

            {/* Widget 4 — Bottom Right — Progress Card */}
            <div className="hw-widget hw-widget--br">
              <p className="hw-progress-label">Checkpoint 3 of 5</p>
              <div className="hw-progress-bar">
                <div className="hw-progress-fill" style={{ width: '60%' }}></div>
              </div>
              <p className="hw-task-sub" style={{ marginTop: '6px' }}>Next: First Draft · Tomorrow</p>
            </div>

          </div>
        </section>

        {/* ── SECTION 2: PROBLEM ─────────────────────────────────────────── */}
        <section className="lp-section" id="problem">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header">
                <span className="lp-eyebrow">The Problem</span>
                <h2 className="lp-section-h">The Cognitive Friction</h2>
                <p className="lp-section-sub">
                  Academic burnout isn't a lack of discipline. It's a failure
                  of system architecture. We target the two primary failure points.
                </p>
              </div>
            </Reveal>

            <div className="lp-problem-grid">
              <Reveal delay={0}>
                <TiltCard className="lp-card">
                  <div className="lp-card-icon">⏳</div>
                  <h3>Temporal Discounting</h3>
                  <p>
                    Your brain devalues future rewards. A deadline three weeks away
                    feels abstract — until it's tomorrow night and you're in crisis
                    mode. AI Accountability creates artificial urgency before the
                    panic sets in.
                  </p>
                </TiltCard>
              </Reveal>
              <Reveal delay={80}>
                <TiltCard className="lp-card">
                  <div className="lp-card-icon">🔀</div>
                  <h3>Decision Fatigue</h3>
                  <p>
                    Choosing <em>what</em> to work on consumes the same energy
                    needed to actually work. The system eliminates that choice
                    entirely — serving you the single next action at the perfect time.
                  </p>
                </TiltCard>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── SECTION 3: HOW IT WORKS ────────────────────────────────────── */}
        <section className="lp-section-alt" id="how-it-works">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">The Workflow</span>
                <h2 className="lp-section-h">How It Works</h2>
                <p className="lp-section-sub">
                  Three steps. No planning required.
                </p>
              </div>
            </Reveal>

            <div className="lp-steps-row">
              <Reveal delay={0}>
                <div className="lp-step">
                  <div className="lp-step-num">📄</div>
                  <div className="lp-step-title">Create Your Task</div>
                  <p className="lp-step-body">
                    Give the AI your assignment title, type (essay, problem set,
                    exam prep), and deadline. That's all it needs.
                  </p>
                </div>
              </Reveal>

              <div className="lp-step-arrow">→</div>

              <Reveal delay={100}>
                <div className="lp-step">
                  <div className="lp-step-num active">✨</div>
                  <div className="lp-step-title">AI Builds Your Plan</div>
                  <p className="lp-step-body">
                    The Llama 3.1 model generates a personalised checkpoint
                    roadmap in under 5 seconds — contextual, not generic.
                  </p>
                </div>
              </Reveal>

              <div className="lp-step-arrow">→</div>

              <Reveal delay={200}>
                <div className="lp-step">
                  <div className="lp-step-num">✅</div>
                  <div className="lp-step-title">Work Through It</div>
                  <p className="lp-step-body">
                    Each checkpoint has a due date and a status. Complete them
                    one by one. The system keeps you honest.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ── SECTION 4: FEATURES ────────────────────────────────────────── */}
        <section className="lp-section" id="features">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header">
                <span className="lp-eyebrow">Features</span>
                <h2 className="lp-section-h">
                  Built for the way students actually work
                </h2>
              </div>
            </Reveal>

            <div className="lp-features-grid">
              {[
                {
                  icon: '🤖',
                  title: 'AI Checkpoint Generation',
                  body: 'Powered by the Llama 3.1 8B Instruct model via NVIDIA NIM. Generates contextual, task-specific checkpoints — not generic templates.',
                },
                {
                  icon: '🎯',
                  title: '4-State Urgency Tracking',
                  body: 'Every checkpoint is classified as Pending, Urgent, Overdue, or Completed in real time. You always know exactly where you stand.',
                },
                {
                  icon: '⏪',
                  title: 'Accountability Undo Window',
                  body: 'Mark a checkpoint complete and get 10 seconds to change your mind. After that, it locks. Progress should mean something.',
                },
                {
                  icon: '🛡️',
                  title: 'Intelligent Fallback',
                  body: 'If the AI is unavailable, the system falls back to predefined templates silently. Task creation never fails.',
                },
              ].map(({ icon, title, body }, i) => (
                <Reveal key={title} delay={i * 60}>
                  <TiltCard className="lp-card">
                    <div className="lp-card-icon">{icon}</div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: STATS ───────────────────────────────────────────── */}
        <section className="lp-section-alt" id="stats">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">By the Numbers</span>
                <h2 className="lp-section-h">Engineered for reliability</h2>
              </div>
            </Reveal>

            <div className="lp-stats-row">
              {[
                { end: 3, prefix: '', suffix: '', label: 'Task types supported', duration: 1200 },
                { end: 5, prefix: '<', suffix: 's', label: 'Average AI response time', duration: 1500 },
                { end: 100, prefix: '', suffix: '%', label: 'Tasks created successfully', duration: 2000 },
              ].map(({ end, prefix, suffix, label, duration }, i) => (
                <Reveal key={label} delay={i * 80}>
                  <TiltCard className="lp-stat-card" maxTilt={4} scaleOnHover={1.04}>
                    <StatNumber end={end} prefix={prefix} suffix={suffix} duration={duration} />
                    <p className="lp-stat-label">{label}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 6: CTA BANNER ──────────────────────────────────────── */}
        <section className="lp-section" id="cta">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-cta-banner">
                <h2>Ready to stop procrastinating?</h2>
                <p>Join students who are finishing what they start.</p>
                <div className="lp-cta-banner-actions">
                  <button
                    className="lp-btn-primary"
                    onClick={() => navigate('/auth')}
                  >
                    Get Started
                  </button>
                  <button
                    className="lp-btn-secondary"
                    onClick={() => navigate('/features')}
                  >
                    Explore Features
                  </button>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
