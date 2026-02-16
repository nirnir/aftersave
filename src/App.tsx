import React from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router-dom";
import { PurchasesListPage } from "./pages/PurchasesListPage";
import { PurchaseDetailsPage } from "./pages/PurchaseDetailsPage";
import { LandingPage } from "./pages/LandingPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/app" element={<PurchasesListPage />} />
          <Route
            path="/purchase/:purchaseId"
            element={<PurchaseDetailsPage />}
          />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

// ---------- Navbar ----------

const Navbar: React.FC = () => {
  const location = useLocation();
  const isLandingRoute = location.pathname === "/";

  return (
    <nav className={`navbar ${isLandingRoute ? "navbar-landing" : ""}`}>
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
          {isLandingRoute ? (
            <>
              <a className="btn-secondary btn-link navbar-cta-link" href="#savings-simulator">
                Estimate My Savings
              </a>
              <Link className="btn-primary btn-link navbar-cta-link" to="/app">
                Try AfterSave
              </Link>
            </>
          ) : (
            <>
              <Link className="btn-secondary btn-link navbar-cta-link" to="/">
                Back to Landing
              </Link>
              <button type="button" className="navbar-icon-btn navbar-avatar" aria-label="Account">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="10" cy="7" r="3.5" />
                  <path d="M3 17.5c0-3.5 3.13-5.5 7-5.5s7 2 7 5.5" />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
