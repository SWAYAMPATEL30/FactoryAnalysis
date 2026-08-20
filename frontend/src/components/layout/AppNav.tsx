import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  {
    label: "Dashboard",
    to: "/app/dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="2" width="6" height="6" rx="1" />
        <rect x="10" y="2" width="6" height="6" rx="1" />
        <rect x="2" y="10" width="6" height="6" rx="1" />
        <rect x="10" y="10" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    label: "Workstations",
    to: "/app/workstations",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="5" width="14" height="9" rx="1.5" />
        <path d="M6 5V4a1 1 0 011-1h4a1 1 0 011 1v1" />
        <line x1="9" y1="8" x2="9" y2="11" />
        <line x1="7" y1="9.5" x2="11" y2="9.5" />
      </svg>
    ),
  },
];

// ── Logo mark (shared) ────────────────────────────────────────────────────────
function LogoMark() {
  return (
    <div className="flex flex-col gap-1">
      {/* Ambade company logo — original blue colors, transparent bg */}
      <img
        src="/images/ambade_logo.png"
        alt="Ambade"
        className="h-[22px] w-auto object-contain self-start shrink-0 drop-shadow-sm"
      />
      {/* IENEXT product brand */}
      <div className="flex items-center gap-2 mt-0.5">
        <img
          src="/images/logo.png"
          alt="IENEXT Logo"
          className="w-[18px] h-[18px] object-contain shrink-0 filter drop-shadow"
        />
        <span className="font-display font-bold text-[13px] tracking-[0.08em] text-white leading-none">
          IE<em className="font-extrabold not-italic tracking-[0.15em] text-accent">NEXT</em>
        </span>
      </div>
    </div>
  );
}

// ── Sidebar nav content (used both desktop and mobile drawer) ─────────────────
export function AppNav() {
  const { company, user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    // height:100% fills the sidebar column; flex col fills top-to-bottom
    <div className="flex flex-col h-full w-full">
      {/* ── Logo ── */}
      <div className="px-5 py-5 border-b border-white/10 shrink-0">
        <LogoMark />
      </div>

      {/* ── Company badge ── */}
      {company && (
        <div className="px-5 py-3 border-b border-white/10 shrink-0">
          <div className="text-[10px] font-medium uppercase tracking-widest text-white/40 mb-0.5">Company</div>
          <div className="text-sm font-semibold text-white">{company.name}</div>
          <div className="text-xs text-white/50 capitalize">{company.plan} plan</div>
        </div>
      )}

      {/* ── Nav links (takes remaining vertical space) ── */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto min-h-0">
        {NAV_ITEMS.map(({ label, to, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                isActive
                  ? "bg-white/10 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/5"
              }`
            }
          >
            <span className="shrink-0">{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* ── User + logout (pinned to bottom) ── */}
      <div className="px-5 py-4 border-t border-white/10 shrink-0">
        {user && (
          <div className="mb-3">
            <div className="text-sm font-semibold text-white">{user.name}</div>
            <div className="text-xs text-white/50 capitalize">{user.role}</div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full text-left text-xs text-white/40 hover:text-white/70 transition-colors py-1 min-h-[44px] flex items-center"
        >
          Sign out →
        </button>
      </div>
    </div>
  );
}

// ── Mobile top bar (shown at <768px in the content column) ────────────────────
interface MobileTopBarProps {
  onMenuClick: () => void;
}

export function MobileTopBar({ onMenuClick }: MobileTopBarProps) {
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-navy border-b border-white/10 shrink-0">
      <LogoMark />
      <button
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        className="w-11 h-11 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
      >
        {/* Hamburger icon */}
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </svg>
      </button>
    </header>
  );
}
