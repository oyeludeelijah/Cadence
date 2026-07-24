import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'How it works', hash: 'how-it-works' },
  { label: 'Features',     hash: 'features'     },
  { label: 'FAQ',          hash: 'faq'          },
];

export default function LandingNav() {
  const navigate   = useNavigate();
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);
  const [activeHash, setActiveHash] = useState('');

  // Navbar background on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const ids = ['hero', 'problem', 'how-it-works', 'features', 'faq', 'cta'];
    const observers = [];

    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveHash(id); },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, []);

  const scrollTo = (hash) => {
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  return (
    <>
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-nav-inner">
          {/* Logo — scrolls back to top */}
          <button
            className="lp-nav-logo"
            onClick={() => scrollTo('hero')}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img src="/logos/full/cadence-light-transparent.svg" alt="Cadence" style={{ height: '40px', width: 'auto' }} />
          </button>

          {/* Desktop links */}
          <div className="lp-nav-links">
            {NAV_LINKS.map(({ label, hash }) => (
              <button
                key={hash}
                className={`lp-nav-link${activeHash === hash ? ' active' : ''}`}
                onClick={() => scrollTo(hash)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="lp-nav-actions">
            <button className="lp-nav-signin" onClick={() => navigate('/auth?mode=signin')}>Sign In</button>
            <button className="lp-nav-cta"    onClick={() => navigate('/auth?mode=signup')}>Get Started</button>
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
        {NAV_LINKS.map(({ label, hash }) => (
          <button key={hash} className="lp-mobile-nav-link" onClick={() => scrollTo(hash)}>
            {label}
          </button>
        ))}
        <button className="lp-mobile-cta" onClick={() => navigate('/auth?mode=signup')}>
          Get Started, It's Free
        </button>
      </div>
    </>
  );
}
