import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const Navbar: React.FC = () => (
  <nav className="navbar">
    <div className="navbar-inner">
      <div className="navbar-brand">
        <svg className="navbar-logo" width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M14 2L3 7v7c0 7.18 4.69 13.89 11 15.5C20.31 27.89 25 21.18 25 14V7L14 2z" fill="#2563EB" />
          <path d="M10.5 14.5l2.5 2.5 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
