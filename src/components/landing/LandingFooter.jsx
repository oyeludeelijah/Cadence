import { useNavigate } from 'react-router-dom';
import CadenceLogo from './CadenceLogo';

const FOOTER_LINKS = [
  { label: 'Home',     to: '/'         },
  { label: 'Features', to: '/features' },
  { label: 'About',    to: '/about'    },
  { label: 'Contact',  to: '/contact'  },
];

export default function LandingFooter() {
  const navigate = useNavigate();

  return (
    <footer className="lp-footer">
      <div className="lp-footer-inner">
        <div>
          <CadenceLogo variant="dark" width={160} style={{ marginBottom: 'var(--s2)' }} />
          <p className="lp-footer-tagline">Stop abandoning your assignments.</p>
        </div>

        <div>
          <div className="lp-footer-nav-title">Pages</div>
          <div className="lp-footer-nav-links">
            {FOOTER_LINKS.map(({ label, to }) => (
              <button
                key={to}
                className="lp-footer-nav-link"
                onClick={() => navigate(to)}
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
        <p className="lp-footer-copy">© {new Date().getFullYear()} Cadence. All rights reserved.</p>
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
