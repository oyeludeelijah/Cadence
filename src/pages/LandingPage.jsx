import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import LandingNav from '../components/landing/LandingNav';
import LandingFooter from '../components/landing/LandingFooter';
import TiltCard from '../components/landing/TiltCard';
import StatNumber from '../components/landing/StatNumber';
import '../pages/landing.css';
import './landing-gold.css';

/* ── Small reusable reveal wrapper ─────────────────────────────────────── */
function Reveal({ children, delay = 0, duration, inline = false }) {
  const ref = useReveal(0.1);
  const Tag = inline ? 'span' : 'div';
  return (
    <Tag 
      ref={ref} 
      className="reveal" 
      style={{ 
        transitionDelay: `${delay}ms`,
        ...(duration ? { transitionDuration: `${duration}ms` } : {}),
        ...(inline ? { display: 'inline-block' } : {})
      }}
    >
      {children}
    </Tag>
  );
}

/* ── FAQ Accordion Item ─────────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="lp-faq-item"
      style={{
        borderBottom: '1px solid var(--border-2)',
        padding: '20px 0',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          gap: '16px',
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>{q}</span>
        <span style={{
          fontSize: '20px',
          color: 'var(--text-3)',
          flexShrink: 0,
          transition: 'transform 0.2s ease',
          transform: open ? 'rotate(45deg)' : 'none',
        }}>+</span>
      </button>
      {open && (
        <p style={{ marginTop: '12px', fontSize: '15px', color: 'var(--text-2)', lineHeight: 1.7 }}>
          {a}
        </p>
      )}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const faqs = [
    {
      q: 'How is this different from just setting reminders on my phone?',
      a: 'Phone reminders tell you when. Cadencee tells you what to do at each step and blocks you from ignoring overdue work. You cannot create a new task until you resolve any overdue checkpoints — which forces you to confront what you are avoiding instead of piling on more.',
    },
    {
      q: 'What if the AI generates checkpoints that do not fit my assignment?',
      a: 'You can edit any checkpoint date after creation, and if you change your deadline the app offers to proportionally reschedule all pending checkpoints automatically. You are always in control of the plan.',
    },
    {
      q: 'Does it work for every subject?',
      a: 'Yes. Cadencee supports three task types — Essay, Problem Set, and Exam Prep — and the AI generates checkpoints specific to each one. Whether it is a chemistry lab report or a history essay, the plan fits the actual work.',
    },
    {
      q: 'What if I finish early?',
      a: 'Mark a checkpoint complete any time. You get a 10-second undo window in case you tap it by mistake. After that it locks — because progress should mean something.',
    },
    {
      q: 'Is it free?',
      a: 'Yes. Cadencee is free for all students. No subscription, no payment required. Sign up with your email or Google account and start immediately.',
    },
  ];

  return (
    <div className="lp-page">
      <LandingNav />

      <main>
        {/* ── SECTION 1: HERO ──────────────────────────────────────────── */}
        <section className="nh-hero" id="hero">
          <div className="nh-container">
            {/* Center Content */}
            <div className="nh-center-panel">
              <h1 className="nh-headline">
                <span className="nh-headline-primary">
                  {['Finish', 'every', 'assignment,'].map((word, i) => (
                    <Reveal key={`w1-${i}`} inline delay={i * 150} duration={800}>{word}&nbsp;</Reveal>
                  ))}
                  <span style={{ opacity: 0.3, display: 'block' }}>
                    {['one', 'step', 'at', 'a', 'time.'].map((word, i) => (
                      <Reveal key={`w2-${i}`} inline delay={450 + (i * 150)} duration={800}>{word}&nbsp;</Reveal>
                    ))}
                  </span>
                </span>
                <span className="nh-headline-secondary">
                  {['AI', 'breaks', 'your', 'deadline', 'into', 'checkpoints', 'automatically.', 'You', 'just', 'follow', 'the', 'plan.'].map((word, i) => (
                    <Reveal key={`w3-${i}`} inline delay={1200 + (i * 80)} duration={800}>{word}&nbsp;</Reveal>
                  ))}
                </span>
              </h1>
              <Reveal delay={300} duration={1200}>
                <button className="nh-hero-cta" onClick={() => navigate('/auth?mode=signup')}>
                  GET STARTED
                </button>
              </Reveal>
              <Reveal delay={600} duration={1200}>
                <p style={{ marginTop: '14px', fontSize: '13px', color: 'var(--text-2)', opacity: 0.7 }}>
                  Free for all students · No credit card required
                </p>
              </Reveal>
            </div>

            {/* Floating Widgets */}
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

            <div className="hw-widget hw-widget--tr hw-widget--pill">
              <span className="hw-icon hw-icon--warn">⚠</span>
              <div>
                <p className="hw-task-title hw-task-title--urgent">OVERDUE</p>
                <p className="hw-task-sub">Linear Algebra Problem Set</p>
              </div>
            </div>

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

            <div className="hw-widget hw-widget--br">
              <p className="hw-progress-label">Checkpoint 3 of 5</p>
              <div className="hw-progress-bar">
                <div className="hw-progress-fill" style={{ width: '60%' }}></div>
              </div>
              <p className="hw-task-sub" style={{ marginTop: '6px' }}>Next: First Draft · Tomorrow</p>
            </div>
          </div>
        </section>

        {/* ── SECTION 2: PROBLEM ───────────────────────────────────────── */}
        <section className="lp-section" id="problem">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">SOUND FAMILIAR?</span>
                <h2 className="lp-section-h">The gap is not effort. It is clarity.</h2>
              </div>
            </Reveal>

            <div className="lp-problem-grid lp-problem-grid--3">
              {[
                {
                  num: '01',
                  title: "You've set this deadline before.",
                  body: "You started strong. Then life got in the way. Not because you are undisciplined. You never had a step-by-step plan built around your actual deadline.",
                },
                {
                  num: '02',
                  title: "You're busy. But falling behind.",
                  body: "You are putting in hours and still submitting last-minute work. That is what happens when effort is scattered instead of directed at the right thing at the right time.",
                },
                {
                  num: '03',
                  title: "You don't need more reminders.",
                  body: "You need to know exactly what to do today — not just when it is due. That is the only thing that has ever been missing.",
                },
              ].map(({ num, title, body }) => (
                <Reveal key={num}>
                  <div className="lp-problem-card">
                    <span className="lp-problem-num">{num}</span>
                    <h3 className="lp-problem-title">{title}</h3>
                    <p className="lp-problem-body">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal>
              <p className="lp-problem-bridge">
                What if you could see the full plan for your assignment — broken into real steps,
                spaced to your actual deadline — before you take a single action?
                <br /><br />
                That is Cadencee. Not a to-do list. Not a reminder app. A checkpoint system
                that shows you exactly what to do and in what order.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ── SECTION 3: HOW IT WORKS ──────────────────────────────────── */}
        <section className="lp-section-alt" id="how-it-works">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">HOW IT WORKS</span>
                <h2 className="lp-section-h">Three steps. Total clarity.</h2>
              </div>
            </Reveal>

            <div className="lp-steps-row">
              {[
                {
                  num: '01',
                  title: 'Add your assignment',
                  body: 'Tell Cadencee your assignment title, type (essay, problem set, exam prep), and your deadline. Takes under 30 seconds.',
                },
                {
                  num: '02',
                  title: 'AI builds your checkpoint plan',
                  body: 'Cadencee generates a personalised step-by-step roadmap in under 5 seconds. Each checkpoint has a due date. Nothing is generic.',
                },
                {
                  num: '03',
                  title: 'Work through it',
                  body: 'Complete checkpoints one by one. The system tracks your progress, escalates urgency as deadlines approach, and keeps you honest.',
                },
              ].map(({ num, title, body }, i) => (
                <Reveal key={num} delay={i * 80}>
                  <div className="lp-step">
                    <div className="lp-step-label">{num}</div>
                    <div className="lp-step-title">{title}</div>
                    <p className="lp-step-body">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 4: WHAT YOU GET ──────────────────────────────────── */}
        <section className="lp-section" id="features">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">WHAT YOU GET</span>
                <h2 className="lp-section-h">Everything you need. Nothing you don't.</h2>
              </div>
            </Reveal>

            <div className="lp-features-grid lp-features-grid--6">
              {[
                {
                  num: '01',
                  title: 'AI-Generated Checkpoint Plan',
                  body: 'Enter your assignment and deadline. Cadencee generates a step-by-step plan specific to your task in seconds.',
                },
                {
                  num: '02',
                  title: 'Live Urgency Tracking',
                  body: 'Checkpoints are Pending, Urgent, Overdue, or Completed. You always know exactly where you stand.',
                },
                {
                  num: '03',
                  title: 'Overdue Accountability Gate',
                  body: 'You cannot create new tasks until you resolve overdue checkpoints. Confront what you are avoiding.',
                },
                {
                  num: '04',
                  title: 'Deadline Rescheduling',
                  body: 'Change your deadline and Cadencee automatically reschedules all pending checkpoints. No manual replanning.',
                },
                {
                  num: '05',
                  title: '10-Second Undo Window',
                  body: 'Get a 10-second undo window when you complete a checkpoint. After that, it locks.',
                },
                {
                  num: '06',
                  title: 'Progress Analytics',
                  body: 'Track your on-time rate, procrastination index, and active streak to see your real progress.',
                },
              ].map(({ num, title, body }, i) => (
                <Reveal key={title} delay={i * 60}>
                  <div className="lp-step">
                    <div className="lp-step-label">{num}</div>
                    <div className="lp-step-title">{title}</div>
                    <p className="lp-step-body">{body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ── SECTION 5: STATS ─────────────────────────────────────────── */}
        <section className="lp-section-alt" id="stats">
          <div className="lp-wrap">
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

        {/* ── SECTION 6: FAQ ───────────────────────────────────────────── */}
        <section className="lp-section" id="faq">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header centered">
                <span className="lp-eyebrow">QUESTIONS</span>
                <h2 className="lp-section-h">Before you ask.</h2>
              </div>
            </Reveal>

            <Reveal>
              <div style={{ maxWidth: '680px', margin: '0 auto' }}>
                {faqs.map(({ q, a }) => (
                  <FaqItem key={q} q={q} a={a} />
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ── SECTION 7: FINAL CTA ─────────────────────────────────────── */}
        <section className="lp-section" id="cta">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-cta-banner">
                <p className="lp-eyebrow" style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '12px' }}>
                  Every day without a plan is a day spent guessing.
                </p>
                <h2>Stop procrastinating. Start.</h2>
                <p>Students who finish their assignments aren't more talented. They just stopped waiting and got the plan.</p>
                <div className="lp-cta-banner-actions">
                  <button
                    className="lp-btn-primary"
                    onClick={() => navigate('/auth?mode=signup')}
                  >
                    Get Started, It's Free
                  </button>
                </div>
                <p style={{ marginTop: '12px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                  No credit card · No subscription · Free for all students
                </p>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
