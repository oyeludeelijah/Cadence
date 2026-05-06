import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Home',     to: '/'         },
  { label: 'Features', to: '/features' },
  { label: 'About',    to: '/about'    },
  { label: 'Contact',  to: '/contact'  },
];

export default function LandingNav() {
  const navigate    = useNavigate();
  const location    = useLocation();
  const [scrolled, setScrolled]  = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const go = (to) => { navigate(to); setMenuOpen(false); };

  return (
    <>
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-inner">
          {/* Logo */}
          <button className="lp-nav-logo" onClick={() => go('/')} style={{ background: 'none', border: 'none', padding: 0 }}>
            <img src="/logos/full/cadence-light-transparent.svg" alt="Cadence" style={{ height: '40px', width: 'auto' }} />
          </button>

          {/* Desktop links */}
          <div className="lp-nav-links">
            {NAV_LINKS.map(({ label, to }) => (
              <button
                key={to}
                className={`lp-nav-link${location.pathname === to ? ' active' : ''}`}
                onClick={() => go(to)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="lp-nav-actions">
            <button className="lp-nav-signin" onClick={() => go('/auth')}>Sign In</button>
            <button className="lp-nav-cta"    onClick={() => go('/auth')}>Get Started</button>
          </div>

          {/* Hamburger */}
          <button
            className={`lp-hamburger${menuOpen ? ' open' : ''}`}
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* Mobile slide-down menu */}
      <div className={`lp-mobile-menu${menuOpen ? ' open' : ''}`}>
        {NAV_LINKS.map(({ label, to }) => (
          <button key={to} className="lp-mobile-nav-link" onClick={() => go(to)}>
            {label}
          </button>
        ))}
        <button className="lp-mobile-cta" onClick={() => go('/auth')}>
          Get Started — It's Free
        </button>
      </div>
    </>
  );
}
