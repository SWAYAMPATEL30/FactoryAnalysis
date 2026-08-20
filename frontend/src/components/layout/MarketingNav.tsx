import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";

const LINKS = [
  { to: "/how-it-works", label: "How It Works" },
  { to: "/most-methodology", label: "PMTS Techniques" },
  { to: "/industries", label: "Industries" },
  { to: "/about", label: "About" },
];



export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy/95 backdrop-blur border-b border-white/10">
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
        {/* Logo — white card so brand colors show on dark nav */}
        <Link to="/" className="flex items-center group select-none" aria-label="ambade IENEXT home">
          <div className="bg-white rounded-lg px-6 py-1 shadow-sm transition-opacity group-hover:opacity-90 min-w-[160px] flex items-center justify-center">
            <img
              src="/images/combined_brand.png"
              alt="ambade IENEXT"
              className="h-[36px] w-auto object-contain shrink-0"
            />
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {LINKS.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${isActive ? "text-accent" : "text-white/70 hover:text-white"}`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors"
          >
            Get Started
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white/80 hover:text-white"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? (
              <>
                <line x1="4" y1="4" x2="18" y2="18" />
                <line x1="18" y1="4" x2="4" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="19" y2="6" />
                <line x1="3" y1="11" x2="19" y2="11" />
                <line x1="3" y1="16" x2="19" y2="16" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-navy border-t border-white/10 px-6 py-4 flex flex-col gap-4">
          {LINKS.map(({ to, label }) => (
            <Link key={to} to={to} className="text-sm text-white/80 hover:text-white" onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link to="/login" className="text-sm font-semibold text-accent" onClick={() => setOpen(false)}>
            Log in →
          </Link>
        </div>
      )}
    </header>
  );
}
