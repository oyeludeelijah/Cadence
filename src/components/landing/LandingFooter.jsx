import { useNavigate } from 'react-router-dom';

const FOOTER_SECTIONS = [
  { label: 'How it works', hash: 'how-it-works' },
  { label: 'Features',     hash: 'features'     },
  { label: 'FAQ',          hash: 'faq'          },
];

export default function LandingFooter() {
  const navigate = useNavigate();

  const scrollTo = (hash) => {
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div>
          <img src="/logos/full/cadence-fullcolor-white.svg" alt="Cadence" style={{ height: '48px', width: 'auto', marginBottom: '1rem' }} />
          <p className="lp-footer-tagline">Stop abandoning your assignments.</p>
        </div>

        <div>
          <div className="lp-footer-nav-title">Sections</div>
          <div className="lp-footer-nav-links">
            {FOOTER_SECTIONS.map(({ label, hash }) => (
              <button
                key={hash}
                className="lp-footer-nav-link"
                onClick={() => scrollTo(hash)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="lp-footer-nav-title">App</div>
          <div className="lp-footer-nav-links">
            <a
              className="lp-footer-nav-link"
              href="https://elijah-fyp.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open the App ↗
            </a>
            <button className="lp-footer-nav-link" onClick={() => navigate('/auth')}>
              Sign Up Free
            </button>
            <button className="lp-footer-nav-link" onClick={() => navigate('/auth')}>
              Sign In
            </button>
          </div>
        </div>
      </div>

      <div className="lp-footer-bottom">
        <p className="lp-footer-copy">© 2025 Cadencee. All rights reserved.</p>
        <span className="lp-footer-credit">
          Built by{' '}
          <a
            href="https://github.com/oyeludeelijah"
            target="_blank"
            rel="noopener noreferrer"
          >
            Oyelude Elijah Toluwani
          </a>
        </span>
      </div>
    </footer>
  );
}
