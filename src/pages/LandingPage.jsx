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
               <div className="nh-eyebrow">THE ACCOUNTABILITY ENGINE</div>
               <h1 className="nh-title">ACCOUNTABLE</h1>
               
               <div className="nh-icons-row">
                 <div className="nh-icon-circle">
                   {/* Lightbulb / Idea */}
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21h6"/><path d="M12 22V12"/><path d="M12 12a5 5 0 1 0-5-5"/></svg>
                 </div>
                 <div className="nh-line"></div>
                 <div className="nh-icon-circle">
                   {/* Computer / Screen */}
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
                 </div>
                 <div className="nh-line"></div>
                 <div className="nh-icon-circle">
                   {/* Star / Plus inside screen / Custom icon */}
                   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="20" height="14" rx="2" ry="2"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/></svg>
                 </div>
               </div>

               <p className="nh-subtitle">Bridge the gap between intent and completion</p>
            </div>

            {/* Left Area */}
            <div className="nh-left-panel">
               <button className="nh-arrow-btn">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a4d8f" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
               </button>
               <div className="nh-pagination">
                 <div className="nh-page-num">01</div>
                 <div className="nh-page-dashes">
                   <span className="nh-dash active"></span>
                   <span className="nh-dash"></span>
                   <span className="nh-dash"></span>
                   <span className="nh-dash"></span>
                 </div>
               </div>
            </div>

            {/* Right Area */}
            <div className="nh-right-panel">
               <button className="nh-arrow-btn">
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5a4d8f" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
               </button>
            </div>

            {/* Bottom Area */}
            <div className="nh-bottom-area">
               <div className="nh-bottom-left">
                  <button className="nh-outline-btn" onClick={() => navigate('/auth')}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e8d98d" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    <span>GET STARTED</span>
                  </button>
               </div>

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
                { end: 3,   prefix: '',  suffix: '',  label: 'Task types supported',      duration: 1200 },
                { end: 5,   prefix: '<', suffix: 's', label: 'Average AI response time',  duration: 1500 },
                { end: 100, prefix: '',  suffix: '%', label: 'Tasks created successfully', duration: 2000 },
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
                  <a
                    className="lp-btn-primary"
                    href="https://elijah-fyp.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open the App ↗
                  </a>
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
