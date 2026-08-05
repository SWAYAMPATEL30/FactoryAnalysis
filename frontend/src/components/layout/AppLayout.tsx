import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppNav, MobileTopBar } from "./AppNav";

export function AppLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      {/* ── Desktop sidebar (hidden <768px) ── */}
      <aside className="app-sidebar hidden md:flex flex-col bg-navy">
        <AppNav />
      </aside>

      {/* ── Mobile overlay drawer ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-navy flex flex-col md:hidden transform transition-transform duration-300 ease-in-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Navigation drawer"
      >
        <AppNav />
      </div>

      {/* ── Main content pane ── */}
      <div className="app-content flex flex-col">
        {/* Mobile top bar */}
        <MobileTopBar onMenuClick={() => setDrawerOpen(true)} />
        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
