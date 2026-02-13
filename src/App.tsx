import React from "react";
import { PurchaseDetailsPage } from "./pages/PurchaseDetailsPage";

export const App: React.FC = () => {
  // In a real app, purchaseId would come from routing (e.g. /purchases/:id)
  const purchaseId = "sample-purchase-1";

  return (
    <div className="app-root">
      <PurchaseDetailsPage purchaseId={purchaseId} />
    </div>
  );
};

