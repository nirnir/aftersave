import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { PurchasesListPage } from "./pages/PurchasesListPage";
import { PurchaseDetailsPage } from "./pages/PurchaseDetailsPage";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="app-root">
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
