import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PurchasesListPage } from "./pages/PurchasesListPage";
import { PurchaseDetailsPage } from "./pages/PurchaseDetailsPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-root">
        <Navbar />
        <Routes>
          <Route path="/" element={<PurchasesListPage />} />
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

/** Logo variant: 1–5. Change this to switch logos. */
const LOGO_VARIANT = 1;

const LOGO_OPTIONS: Record<number, React.ReactNode> = {
  // Option 1: "AS" monogram in a rounded square
  1: (
    <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#2563EB" />
      <text x="14" y="19" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700" fontFamily="system-ui, sans-serif">AS</text>
    </svg>
  ),
  // Option 2: Swap arrows (exchange/return concept)
  2: (
    <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <circle cx="14" cy="14" r="12" fill="#2563EB" />
      <path d="M10 12l4-4 4 4M18 16l-4 4-4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  // Option 3: Downward arrow in a shield (price drop)
  3: (
    <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 2L4 6v8c0 6.5 4 12 10 14 6-2 10-7.5 10-14V6L14 2z" fill="#2563EB" />
      <path d="M14 8v8m0 0l-3-3m3 3l3-3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  // Option 4: Minimal "A" with bracket
  4: (
    <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#0F172A" />
      <path d="M14 8v12M8 20l6-12 6 12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 14h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  // Option 5: Receipt with checkmark
  5: (
    <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M8 4h12c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#2563EB" />
      <path d="M10 8h8M10 12h6M10 16h4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" opacity="0.9" />
      <path d="M16 18l2 2 4-4" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

const Navbar: React.FC = () => (
  <nav className="navbar">
    <div className="navbar-inner">
      <div className="navbar-brand">
        {LOGO_OPTIONS[LOGO_VARIANT] ?? LOGO_OPTIONS[1]}
        <div className="navbar-brand-text">
          <span className="navbar-name">AfterSave</span>
          <span className="navbar-tagline">NEVER OVERPAY AGAIN</span>
        </div>
      </div>
      <div className="navbar-actions">
        <button type="button" className="navbar-icon-btn" aria-label="Help">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="10" r="8.5" />
            <path d="M7.5 7.5a2.5 2.5 0 0 1 4.87.83c0 1.67-2.5 2.5-2.5 2.5" />
            <circle cx="10" cy="14" r="0.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
        <button type="button" className="navbar-icon-btn" aria-label="Notifications">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 2a5 5 0 0 0-5 5v3l-1.5 2.5h13L15 10V7a5 5 0 0 0-5-5z" />
            <path d="M8 15a2 2 0 0 0 4 0" />
          </svg>
          <span className="navbar-badge" />
        </button>
        <button type="button" className="navbar-icon-btn navbar-avatar" aria-label="Account">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="10" cy="7" r="3.5" />
            <path d="M3 17.5c0-3.5 3.13-5.5 7-5.5s7 2 7 5.5" />
          </svg>
        </button>
      </div>
    </div>
  </nav>
);
