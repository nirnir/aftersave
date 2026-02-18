import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { PurchasesListPage } from "./pages/PurchasesListPage";
import { PurchaseDetailsPage } from "./pages/PurchaseDetailsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { InstantAuthProvider } from "./auth/instantAuth";
import { useInstantAuth } from "./auth/useInstantAuth";

export const App: React.FC = () => {
  return (
    <InstantAuthProvider>
      <BrowserRouter>
        <div className="app-root">
          <AppContent />
        </div>
      </BrowserRouter>
    </InstantAuthProvider>
  );
};

const AppContent: React.FC = () => {
  const { isLoading, isRegistering, user } = useInstantAuth();
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isAuth = location.pathname === "/auth";

  if (isLoading || isRegistering) {
    return (
      <main className="purchases-page">
        <div className="page-header">
          <h1 className="page-title">Loading your account...</h1>
          <p className="page-description">One moment while we prepare your workspace.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      {!isLanding && !isAuth && <Navbar />}
      {isLanding && <LandingNavbar />}
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={user ? <Navigate to="/app" replace /> : <AuthPage />} />
        <Route
          path="/app"
          element={(
            <RequireAuth>
              <PurchasesListPage />
            </RequireAuth>
          )}
        />
        <Route
          path="/purchase/:purchaseId"
          element={(
            <RequireAuth>
              <PurchaseDetailsPage />
            </RequireAuth>
          )}
        />
        <Route
          path="/settings"
          element={(
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          )}
        />
        <Route path="*" element={<Navigate to={user ? "/app" : "/"} replace />} />
      </Routes>
    </>
  );
};

const RequireAuth: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useInstantAuth();
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  return children;
};

// ---------- Landing Navbar ----------

const LandingNavbar: React.FC = () => {
  return (
    <nav className="navbar navbar-landing">
      <div className="navbar-inner">
        <Link className="navbar-brand navbar-brand-link" to="/">
          <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#2563EB" />
            <text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">AS</text>
          </svg>
          <div className="navbar-brand-text">
            <span className="navbar-name">AfterSave</span>
            <span className="navbar-tagline">NEVER OVERPAY AGAIN</span>
          </div>
        </Link>
        <div className="navbar-actions">
          <a className="navbar-text-link" href="#how-it-works">How It Works</a>
          <a className="navbar-text-link" href="#faq">FAQ</a>
          <Link className="lp-btn lp-btn-primary navbar-cta-link" to="/auth">
            Start Saving Now
          </Link>
        </div>
      </div>
    </nav>
  );
};

// ---------- Navbar ----------

const ProfileIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="10" r="3" />
    <path d="M6.168 18.849A4 4 0 0 1 10 16h4a4 4 0 0 1 3.834 2.855" />
  </svg>
);

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useInstantAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [dropdownOpen]);

  async function handleLogout() {
    setDropdownOpen(false);
    await signOut();
    navigate("/auth", { replace: true });
  }

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link className="navbar-brand navbar-brand-link" to="/">
          <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#2563EB" />
            <text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">AS</text>
          </svg>
          <div className="navbar-brand-text">
            <span className="navbar-name">AfterSave</span>
            <span className="navbar-tagline">NEVER OVERPAY AGAIN</span>
          </div>
        </Link>
        <div className="navbar-actions">
          <div className="navbar-profile-wrap" ref={dropdownRef}>
            <button
              type="button"
              className="navbar-icon-btn navbar-profile-btn"
              onClick={() => setDropdownOpen((o) => !o)}
              aria-expanded={dropdownOpen}
              aria-haspopup="true"
              aria-label="Open profile menu"
            >
              <ProfileIcon />
            </button>
            {dropdownOpen && (
              <div className="navbar-profile-dropdown" role="menu">
                <Link className="navbar-profile-item" to="/app" role="menuitem" onClick={() => setDropdownOpen(false)}>
                  Profile
                </Link>
                <Link className="navbar-profile-item" to="/settings" role="menuitem" onClick={() => setDropdownOpen(false)}>
                  Settings
                </Link>
                <button type="button" className="navbar-profile-item navbar-profile-item-danger" role="menuitem" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
