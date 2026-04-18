import { useState } from 'react';
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

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handle = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    // Static MVP — no backend needed
    setSubmitted(true);
  };

  return (
    <div className="lp-page">
      <LandingNav />

      <main>
        {/* Page Hero */}
        <section className="lp-page-hero">
          <div className="lp-wrap">
            <Reveal>
              <span className="lp-eyebrow">Reach Out</span>
              <h1 className="lp-section-h" style={{ fontSize: 'clamp(40px, 6vw, 72px)' }}>
                Get in touch
              </h1>
              <p className="lp-section-sub">
                Questions, feedback, or collaboration — reach out.
              </p>
            </Reveal>
          </div>
        </section>

        {/* Contact grid */}
        <section className="lp-section">
          <div className="lp-wrap">
            <div className="lp-contact-grid">
              {/* Form */}
              <Reveal>
                {submitted ? (
                  <div className="lp-card" style={{ textAlign: 'center', padding: 'var(--s8) var(--s5)' }}>
                    <div style={{ fontSize: 48, marginBottom: 'var(--s3)' }}>✅</div>
                    <h3 style={{ marginBottom: 'var(--s2)' }}>Message sent!</h3>
                    <p>Thanks for reaching out. I'll get back to you as soon as possible.</p>
                  </div>
                ) : (
                  <div className="lp-card" style={{ padding: 'var(--s5)' }}>
                    <h2 style={{
                      fontFamily: 'Outfit, sans-serif',
                      fontSize: 'var(--text-xl)',
                      fontWeight: 700,
                      letterSpacing: '-0.02em',
                      marginBottom: 'var(--s4)',
                      color: 'var(--text)',
                    }}>
                      Send a message
                    </h2>
                    <form className="lp-form" onSubmit={handleSubmit}>
                      <div className="lp-form-group">
                        <label htmlFor="contact-name" className="lp-form-label">Name</label>
                        <input
                          id="contact-name"
                          name="name"
                          type="text"
                          className="lp-form-input"
                          placeholder="Your name"
                          value={form.name}
                          onChange={handle}
                          required
                        />
                      </div>
                      <div className="lp-form-group">
                        <label htmlFor="contact-email" className="lp-form-label">Email</label>
                        <input
                          id="contact-email"
                          name="email"
                          type="email"
                          className="lp-form-input"
                          placeholder="you@university.ac.uk"
                          value={form.email}
                          onChange={handle}
                          required
                        />
                      </div>
                      <div className="lp-form-group">
                        <label htmlFor="contact-message" className="lp-form-label">Message</label>
                        <textarea
                          id="contact-message"
                          name="message"
                          className="lp-form-textarea"
                          placeholder="What's on your mind?"
                          value={form.message}
                          onChange={handle}
                          required
                        />
                      </div>
                      <p className="lp-form-note">
                        Or reach me directly at{' '}
                        <a
                          href="mailto:oyeludeelijah@gmail.com"
                          style={{ color: 'var(--text-2)', textDecoration: 'underline' }}
                        >
                          oyeludeelijah@gmail.com
                        </a>
                      </p>
                      <button type="submit" className="lp-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                        Send Message
                      </button>
                    </form>
                  </div>
                )}
              </Reveal>

              {/* Alternative contacts */}
              <Reveal delay={80}>
                <div className="lp-contact-alt">
                  <div>
                    <div className="lp-contact-alt-title">Other ways to connect</div>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--s4)' }}>
                      I'm especially interested in feedback from lecturers, students
                      who've tried the app, or developers curious about the AI integration.
                    </p>
                  </div>

                  <a
                    className="lp-contact-item"
                    href="https://github.com/oyeludeelijah"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="lp-contact-item-icon">🐙</div>
                    <div>
                      <span className="lp-contact-item-label">GitHub</span>
                      <span className="lp-contact-item-value">github.com/oyeludeelijah</span>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>↗</span>
                  </a>

                  <a
                    className="lp-contact-item"
                    href="mailto:oyeludeelijah@gmail.com"
                  >
                    <div className="lp-contact-item-icon">✉️</div>
                    <div>
                      <span className="lp-contact-item-label">Email</span>
                      <span className="lp-contact-item-value">oyeludeelijah@gmail.com</span>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>→</span>
                  </a>

                  <a
                    className="lp-contact-item"
                    href="https://elijah-fyp.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div className="lp-contact-item-icon">🚀</div>
                    <div>
                      <span className="lp-contact-item-label">Live App</span>
                      <span className="lp-contact-item-value">elijah-fyp.vercel.app</span>
                    </div>
                    <span style={{ marginLeft: 'auto', color: 'var(--text-3)' }}>↗</span>
                  </a>

                  <div className="lp-card" style={{ background: 'var(--accent-dim)', borderColor: 'rgba(35,83,71,0.3)', marginTop: 'var(--s2)' }}>
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-2)', lineHeight: 1.7 }}>
                      <strong style={{ color: 'var(--text)' }}>For supervisors:</strong>{' '}
                      If you're reviewing this project and need access to the demo database
                      credentials or source code walkthrough, please contact me directly via email.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
