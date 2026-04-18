import { useNavigate } from 'react-router-dom';
import { useReveal } from '../hooks/useReveal';
import LandingNav from '../components/landing/LandingNav';
import LandingFooter from '../components/landing/LandingFooter';
import '../pages/landing.css';

function Reveal({ children, delay = 0 }) {
  const ref = useReveal(0.1);
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const PILLARS = [
  {
    num: '01',
    title: 'Present Bias',
    ref: 'Kahneman, 2011',
    body: 'Humans consistently overvalue immediate payoffs relative to future ones. The closer a reward or consequence, the more attention we pay to it. AI Accountability exploits this by breaking the distant "final grade" into near-term checkpoint deadlines.',
  },
  {
    num: '02',
    title: 'Commitment Devices',
    ref: 'Ariely & Wertenbroch, 2002',
    body: 'Pre-committing to intermediate deadlines significantly improves task completion rates. The 10-second undo lock is a commitment device — it raises the psychological cost of not following through.',
  },
  {
    num: '03',
    title: 'Implementation Intentions',
    ref: 'Gollwitzer & Sheeran, 2006',
    body: 'Goals paired with specific "when, where, and how" plans are far more likely to be achieved. AI-generated checkpoints are exactly that: they transform vague goals into concrete, time-bound implementation intentions.',
  },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="lp-page">
      <LandingNav />

      <main>
        {/* Page Hero */}
        <section className="lp-page-hero">
          <div className="lp-wrap">
            <Reveal>
              <span className="lp-eyebrow">The Origin</span>
              <h1 className="lp-section-h" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
                Why this exists
              </h1>
              <p className="lp-section-sub">
                Not another to-do list. A system built around how student brains actually work — and fail.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Story */}
        <section className="lp-section">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-story-grid">
                <div>
                  <span className="lp-eyebrow">The Story</span>
                  <h2 className="lp-section-h">The problem was personal</h2>
                </div>
                <div>
                  <p className="lp-story-body">
                    Every student knows the moment. You open a blank document three
                    days before the deadline with a five-thousand word essay still to
                    write, and the only question your brain can form is: <em>where do I even start?</em>
                  </p>
                  <p className="lp-story-body">
                    This project was built because the planning burden is the real
                    bottleneck — not motivation, not intelligence. When students don't
                    know what to do next, they do nothing. This system removes that
                    uncertainty entirely.
                  </p>
                  <p className="lp-story-body" style={{ marginBottom: 0 }}>
                    The AI doesn't just set a deadline. It maps out every intermediate
                    step, assigns a due date to each one, and tracks your progress in
                    real time. The goal isn't to be a productivity app. It's to remove
                    every excuse not to start.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Research */}
        <section className="lp-section-alt">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header">
                <span className="lp-eyebrow">Research Foundation</span>
                <h2 className="lp-section-h">Grounded in behavioral science</h2>
                <p className="lp-section-sub">
                  The system's design decisions aren't arbitrary — each one maps to
                  an established finding in behavioral economics and psychology.
                </p>
              </div>
            </Reveal>

            <div className="lp-pillars">
              {PILLARS.map(({ num, title, ref, body }, i) => (
                <Reveal key={title} delay={i * 80}>
                  <div className="lp-pillar">
                    <div className="lp-pillar-num">{num}</div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                    <span className="lp-pillar-ref">{ref}</span>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Builder */}
        <section className="lp-section">
          <div className="lp-wrap">
            <Reveal>
              <div className="lp-section-header">
                <span className="lp-eyebrow">The Builder</span>
                <h2 className="lp-section-h">Built by</h2>
              </div>
            </Reveal>
            <Reveal delay={80}>
              <div className="lp-builder-card">
                <div className="lp-builder-avatar">OE</div>
                <div>
                  <div className="lp-builder-name">Oyelude Elijah Toluwani</div>
                  <div className="lp-builder-role">
                    Final Year Computer Science Student · University of Hertfordshire
                  </div>
                  <p className="lp-builder-bio">
                    Built this as a final year project to explore how AI-assisted task
                    decomposition can measurably reduce student procrastination. The
                    codebase is a full-stack React + Supabase application with a live
                    NVIDIA NIM AI integration, deployed on Vercel.
                  </p>
                  <div className="lp-builder-links">
                    <a
                      className="lp-builder-link"
                      href="https://github.com/oyeludeelijah"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      GitHub ↗
                    </a>
                    <button
                      className="lp-builder-link"
                      onClick={() => navigate('/contact')}
                    >
                      Contact
                    </button>
                  </div>
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
