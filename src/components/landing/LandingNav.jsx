import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

const IconSun  = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
  </svg>
)
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

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
  const { theme, toggle } = useTheme();

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
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72; // 72px nav offset
      window.scrollTo({ top, behavior: 'smooth' });
    }
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
            <img
              src={theme === 'dark'
                ? '/logos/full/cadence-dark-transparent.svg'
                : '/logos/full/cadence-light-transparent.svg'}
              alt="Cadence"
              style={{ height: '40px', width: 'auto' }}
            />
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
            <button 
              className="lp-nav-link" 
              onClick={toggle}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: 0, borderRadius: '50%' }}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 24px', marginBottom: '16px' }}>
          <span style={{ color: 'var(--text-2)', fontSize: '13px', fontWeight: 600 }}>Theme</span>
          <button 
            onClick={toggle}
            style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>
        </div>
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
