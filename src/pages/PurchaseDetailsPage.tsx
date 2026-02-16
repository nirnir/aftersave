import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MatchTier,
  Purchase,
  PurchaseItem,
  Deal,
  AuditEvent,
  ExecutionMode,
  Coupon
} from "../types/purchase";
import {
  fetchPurchaseDetails,
  updatePurchaseMonitoring
} from "../api/purchasesApi";

// Re-export types for backward compatibility
export type {
  MatchTier,
  Purchase,
  PurchaseItem,
  Deal,
  AuditEvent,
  ExecutionMode,
  Coupon
};

type SwapStatus =
  | "Monitoring"
  | "DealFound"
  | "WindowClosing"
  | "SwapInProgress"
  | "Completed"
  | "Expired";

function mapPurchaseStatusToSwapStatus(status?: string): SwapStatus {
  switch (status) {
    case "deal_found":
      return "DealFound";
    case "window_closing":
      return "WindowClosing";
    case "swap_in_progress":
      return "SwapInProgress";
    case "swap_completed":
      return "Completed";
    case "expired":
      return "Expired";
    default:
      return "Monitoring";
  }
}

// ---------- Mock Data (placeholder until wired to backend) ----------

const MOCK_PURCHASE: Purchase = {
  purchase_id: "sample-purchase-1",
  merchant: "Example Store",
  order_id: "ORDER-12345",
  purchase_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  country: "US",
  currency: "USD",
  items: [
    {
      title: "Noise Cancelling Headphones",
      attributes: { brand: "ACME", model: "NC-500", color: "Black" },
      quantity: 1,
      price: 299.99
    }
  ],
  delivery_estimate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  cancellation_window: {
    end: new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString(),
    inferred: false
  },
  extraction_confidence_score: 0.92,
  monitoring_enabled: true,
  last_scan_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
};

const MOCK_DEALS: Deal[] = [
  {
    deal_id: "deal-1",
    merchant_or_seller: "Example Store",
    listing_url: "https://example.com/deal-1",
    match_tier: "Exact",
    base_price: 249.99,
    shipping: 0,
    tax_estimate: 20,
    total_price: 269.99,
    delivery_estimate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    return_policy_summary: "Free returns within 30 days.",
    coupon: { code: "SAVE30", auto_apply_flag: true },
    reliability_score: 0.96,
    net_savings: 30,
    savings_percentage: 10,
    last_checked_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    in_stock_flag: true,
    stock_confidence: 0.95
  },
  {
    deal_id: "deal-2",
    merchant_or_seller: "Trusted Marketplace Seller",
    listing_url: "https://example.com/deal-2",
    match_tier: "Attribute",
    base_price: 259.99,
    shipping: 5,
    tax_estimate: 21,
    total_price: 285.99,
    delivery_estimate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    return_policy_summary: "Returns within 14 days, restocking fee may apply.",
    coupon: undefined,
    reliability_score: 0.9,
    net_savings: 14.01,
    savings_percentage: 4.7,
    last_checked_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    in_stock_flag: true,
    stock_confidence: 0.88
  },
  {
    deal_id: "deal-3",
    merchant_or_seller: "Global Marketplace",
    listing_url: "https://example.com/deal-3",
    match_tier: "Similar",
    base_price: 239.99,
    shipping: 25,
    tax_estimate: 30,
    total_price: 294.99,
    delivery_estimate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    return_policy_summary: "International returns may incur extra fees.",
    coupon: { code: "INTLSAVE", auto_apply_flag: false },
    reliability_score: 0.8,
    net_savings: 5,
    savings_percentage: 1.7,
    last_checked_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    in_stock_flag: true,
    stock_confidence: 0.75,
    cross_border: true
  }
];

const MOCK_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: "ev-1",
    type: "purchase_detected",
    timestamp: new Date(Date.now() - 2.2 * 60 * 60 * 1000).toISOString(),
    label: "Purchase detected from Example Store",
    detail: "Email receipt matched known template."
  },
  {
    id: "ev-2",
    type: "data_extracted",
    timestamp: new Date(Date.now() - 2.15 * 60 * 60 * 1000).toISOString(),
    label: "Purchase data extracted",
    detail: "Extraction confidence 0.92."
  },
  {
    id: "ev-3",
    type: "deals_evaluated",
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    label: "3 deals evaluated",
    detail: "2 exact/attribute matches, 1 similar."
  }
];

// ---------- Utility helpers ----------

function formatCurrency(amount: number, currency: string, country: string) {
  try {
    return new Intl.NumberFormat(country === "US" ? "en-US" : "en", {
      style: "currency",
      currency
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function calculateTimeRemaining(endIso: string) {
  const now = Date.now();
  const end = new Date(endIso).getTime();
  const diffMs = end - now;
  const expired = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const hours = Math.floor(absMs / (60 * 60 * 1000));
  const minutes = Math.floor((absMs % (60 * 60 * 1000)) / (60 * 1000));
  return { expired, label: `${hours}h ${minutes}m` };
}

// ---------- Page ----------

export const PurchaseDetailsPage: React.FC = () => {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const navigate = useNavigate();
  const [purchase, setPurchase] = useState<Purchase>(MOCK_PURCHASE);
  const [deals, setDeals] = useState<Deal[]>(MOCK_DEALS);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(MOCK_AUDIT_EVENTS);
  const [status, setStatus] = useState<SwapStatus>("DealFound");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [monitoringEnabled, setMonitoringEnabled] = useState(
    purchase.monitoring_enabled
  );
  const [allowSimilar, setAllowSimilar] = useState(false);
  const [allowCrossBorder, setAllowCrossBorder] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [executionSequence, setExecutionSequence] = useState<
    "BuySecondCancelFirst" | "CancelFirstBuySecond"
  >("BuySecondCancelFirst");
  const [executionMode, setExecutionMode] = useState<ExecutionMode>("Manual");
  const [automationBlockedReason, setAutomationBlockedReason] = useState<
    string | null
  >(null);
  const [swapInProgress, setSwapInProgress] = useState(false);
  const [swapCompleted, setSwapCompleted] = useState(false);
  const [auditExpanded, setAuditExpanded] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);

  const loadPurchase = useCallback(async () => {
    if (!purchaseId) {
      setLoadError("Missing purchase ID.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const payload = await fetchPurchaseDetails(purchaseId);
      setPurchase(payload.purchase);
      setDeals(payload.deals);
      setAuditEvents(payload.auditEvents);
      setStatus(mapPurchaseStatusToSwapStatus(payload.status));
      setMonitoringEnabled(payload.purchase.monitoring_enabled);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load purchase details."
      );
    } finally {
      setLoading(false);
    }
  }, [purchaseId]);

  useEffect(() => {
    void loadPurchase();
  }, [loadPurchase]);

  const timeRemaining = useMemo(
    () => calculateTimeRemaining(purchase.cancellation_window.end),
    [purchase.cancellation_window.end]
  );

  const extractionLowConfidence =
    purchase.extraction_confidence_score < 0.8; // threshold example

  // Gating for semi-automated mode based on best deal reliability
  const bestDealBySavings = useMemo(
    () =>
      [...deals].sort((a, b) => b.net_savings - a.net_savings)[0] ?? null,
    [deals]
  );

  const semiAutomatedEligible =
    !!bestDealBySavings &&
    bestDealBySavings.reliability_score >= 0.85 &&
    bestDealBySavings.in_stock_flag;

  const sortedDeals = useMemo(() => {
    let filtered = deals.filter((d) => d.in_stock_flag);

    if (!allowSimilar) {
      filtered = filtered.filter((d) => d.match_tier !== "Similar");
    }
    if (!allowCrossBorder) {
      filtered = filtered.filter((d) => !d.cross_border);
    }

    return filtered.sort((a, b) => {
      const tierOrder: Record<MatchTier, number> = {
        Exact: 0,
        Attribute: 1,
        Similar: 2
      };
      const tierDiff = tierOrder[a.match_tier] - tierOrder[b.match_tier];
      if (tierDiff !== 0) return tierDiff;

      const savingsDiff = b.net_savings - a.net_savings;
      if (savingsDiff !== 0) return savingsDiff;

      const deliveryDiff =
        new Date(a.delivery_estimate).getTime() -
        new Date(b.delivery_estimate).getTime();
      if (deliveryDiff !== 0) return deliveryDiff;

      return b.reliability_score - a.reliability_score;
    });
  }, [deals, allowSimilar, allowCrossBorder]);

  const totalDealsEvaluated = deals.length;
  const bestSavings = bestDealBySavings?.net_savings ?? 0;
  const bestSavingsPct = bestDealBySavings?.savings_percentage ?? 0;

  // ---------- Event handlers (analytics hooks noted in comments) ----------

  async function handleToggleMonitoring(next: boolean) {
    try {
      await updatePurchaseMonitoring(purchase.purchase_id, next);
      setMonitoringEnabled(next);
      // analytics: monitoring_toggled
    } catch {
      setLoadError("Could not update monitoring. Please try again.");
    }
  }

  function handleOpenDeal(deal: Deal) {
    setSelectedDeal(deal);
    // analytics: deal_card_viewed
  }

  function handleStartSwap() {
    if (timeRemaining.expired) {
      return;
    }
    if (extractionLowConfidence) {
      return;
    }
    if (!selectedDeal) {
      return;
    }
    if (executionMode === "SemiAutomated" && !semiAutomatedEligible) {
      setAutomationBlockedReason(
        "Semi-automated mode is not available for this merchant. Falling back to manual guided mode."
      );
      setExecutionMode("Manual");
      return;
    }

    setAutomationBlockedReason(null);
    setSwapInProgress(true);
    // analytics: swap_started (include executionMode, selectedDeal.net_savings)

    // Simulate a short swap flow and completion.
    setTimeout(() => {
      setSwapInProgress(false);
      setSwapCompleted(true);
      // analytics: swap_completed (include savings, executionMode)
    }, 1500);
  }

  function handleCancelSwapFlow() {
    setSelectedDeal(null);
    setSwapInProgress(false);
  }

  const noDealsState = sortedDeals.length === 0;

  if (loading) {
    return (
      <div className="swap-page">
        <p>Loading purchase details...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="swap-page">
        <button
          type="button"
          className="back-link"
          onClick={() => navigate("/")}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 3L5 8l5 5" />
          </svg>
          Back to purchases
        </button>
        <div className="error-state">
          <h2>Could not load this purchase</h2>
          <p>{loadError}</p>
          <button type="button" className="btn-primary" onClick={loadPurchase}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="swap-page">
      <button type="button" className="back-link" onClick={() => navigate("/")}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back to purchases
      </button>

      <Header
        purchase={purchase}
        status={status}
        timeRemaining={timeRemaining.label}
        expired={timeRemaining.expired}
      />

      <main className="swap-page-main">
        <section className="swap-page-main-left">
          <PurchaseSummaryCard
            purchase={purchase}
            extractionLowConfidence={extractionLowConfidence}
          />

          <SavingsOverviewStrip
            bestSavings={bestSavings}
            bestSavingsPct={bestSavingsPct}
            totalDealsEvaluated={totalDealsEvaluated}
            lastScanAt={purchase.last_scan_at}
            monitoringEnabled={monitoringEnabled}
            onToggleMonitoring={handleToggleMonitoring}
            currency={purchase.currency}
            country={purchase.country}
          />

          <DealList
            purchase={purchase}
            deals={sortedDeals}
            originalTotal={purchase.items.reduce(
              (sum, i) => sum + i.price * i.quantity,
              0
            )}
            allowSimilar={allowSimilar}
            onToggleAllowSimilar={setAllowSimilar}
            allowCrossBorder={allowCrossBorder}
            onToggleAllowCrossBorder={setAllowCrossBorder}
            onSwapToDeal={handleOpenDeal}
            noDealsState={noDealsState}
          />
        </section>

      </main>

      <footer className="swap-page-footer">
        <AuditPanel
          events={auditEvents}
          expanded={auditExpanded}
          onToggle={() => setAuditExpanded((prev) => !prev)}
        />
        <PrivacyPanel
          expanded={privacyExpanded}
          onToggle={() => setPrivacyExpanded((prev) => !prev)}
        />
      </footer>

      <SwapFlowDrawer
        open={!!selectedDeal}
        deal={selectedDeal}
        purchase={purchase}
        executionSequence={executionSequence}
        setExecutionSequence={setExecutionSequence}
        executionMode={executionMode}
        setExecutionMode={setExecutionMode}
        semiAutomatedEligible={semiAutomatedEligible}
        onStartSwap={handleStartSwap}
        onClose={handleCancelSwapFlow}
        swapInProgress={swapInProgress}
        swapCompleted={swapCompleted}
        expired={timeRemaining.expired}
        automationBlockedReason={automationBlockedReason}
      />
    </div>
  );
};

// ---------- Header ----------

interface HeaderProps {
  purchase: Purchase;
  status: SwapStatus;
  timeRemaining: string;
  expired: boolean;
}

const STATUS_LABELS: Record<SwapStatus, string> = {
  Monitoring: "Monitoring",
  DealFound: "Deal Found",
  WindowClosing: "Window Closing",
  SwapInProgress: "Swap in Progress",
  Completed: "Completed",
  Expired: "Expired"
};

const Header: React.FC<HeaderProps> = ({
  purchase,
  status,
  timeRemaining,
  expired
}) => {
  const itemTitle =
    purchase.items.length === 1
      ? purchase.items[0].title
      : `Order with ${purchase.items.length} items`;

  return (
    <header className="swap-header">
      <div className="swap-header-left">
        <h1 className="swap-header-title">{itemTitle}</h1>
        <span className={`swap-status-badge swap-status-${status.toLowerCase()}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <div className="swap-header-right">
        <div className="swap-countdown">
          <span className="swap-countdown-label">
            {expired ? "Cancellation window expired" : "Cancellation window"}
          </span>
          {!expired && (
            <span className="swap-countdown-timer">
              {timeRemaining}
              {purchase.cancellation_window.inferred && (
                <span className="swap-countdown-estimated">Estimated</span>
              )}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

// ---------- Purchase Summary Card ----------

interface PurchaseSummaryCardProps {
  purchase: Purchase;
  extractionLowConfidence: boolean;
}

const PurchaseSummaryCard: React.FC<PurchaseSummaryCardProps> = ({
  purchase,
  extractionLowConfidence
}) => {
  const [expanded, setExpanded] = useState(false);
  const totalPaid = purchase.items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return (
    <section className="card">
      <header className="card-header">
        <div>
          <h2>Purchase summary</h2>
          <p className="card-subtitle">
            {purchase.merchant} • Order {purchase.order_id}
          </p>
        </div>
        <div className="purchase-total">
          <span className="purchase-total-label">Total paid</span>
          <span className="purchase-total-value">
            {formatCurrency(totalPaid, purchase.currency, purchase.country)}
          </span>
        </div>
      </header>

      {extractionLowConfidence && (
        <div className="banner banner-warning">
          <strong>Check these details before swapping.</strong> We are not fully
          confident in the parsed data. Confirm item, price, and merchant before
          proceeding.
        </div>
      )}

      <div className="purchase-items">
        {purchase.items.map((item) => (
          <div key={item.title} className="purchase-item">
            <div className="purchase-item-main">
              <div className="purchase-item-title">{item.title}</div>
              <div className="purchase-item-meta">
                <span>Qty {item.quantity}</span>
                <span>
                  {formatCurrency(item.price, purchase.currency, purchase.country)}
                </span>
              </div>
            </div>
            {Object.keys(item.attributes).length > 0 && (
              <div className="purchase-item-attributes">
                {Object.entries(item.attributes).map(([key, value]) => (
                  <span key={key} className="attribute-pill">
                    {key}: {value}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="purchase-footer">
        <div className="purchase-delivery">
          <span className="label">Delivery estimate</span>
          <span>{formatDateTime(purchase.delivery_estimate)}</span>
        </div>
        <div className="purchase-confidence">
          <span className="label">Extraction confidence</span>
          <span>{Math.round(purchase.extraction_confidence_score * 100)}%</span>
        </div>
        <button
          type="button"
          className="link-button"
          onClick={() => setExpanded((prev) => !prev)}
        >
          {expanded ? "Hide parsed data" : "View parsed data"}
        </button>
      </footer>

      {expanded && (
        <pre className="parsed-data">
          {JSON.stringify(
            {
              purchase_id: purchase.purchase_id,
              merchant: purchase.merchant,
              order_id: purchase.order_id,
              items: purchase.items,
              delivery_estimate: purchase.delivery_estimate,
              cancellation_window: purchase.cancellation_window
            },
            null,
            2
          )}
        </pre>
      )}
    </section>
  );
};

// ---------- Savings Overview Strip ----------

interface SavingsOverviewStripProps {
  bestSavings: number;
  bestSavingsPct: number;
  totalDealsEvaluated: number;
  lastScanAt?: string;
  monitoringEnabled: boolean;
  onToggleMonitoring: (next: boolean) => void;
  currency: string;
  country: string;
}

const SavingsOverviewStrip: React.FC<SavingsOverviewStripProps> = ({
  bestSavings,
  bestSavingsPct,
  totalDealsEvaluated,
  lastScanAt,
  monitoringEnabled,
  onToggleMonitoring,
  currency,
  country
}) => {
  return (
    <section className="savings-strip card">
      <div className="savings-main">
        <div>
          <span className="label">Best savings found</span>
          <div className="savings-amount">
            {bestSavings > 0
              ? `${formatCurrency(bestSavings, currency, country)} (${bestSavingsPct.toFixed(
                  1
                )}%)`
              : "No better deals yet"}
          </div>
        </div>
        <div>
          <span className="label">Deals evaluated</span>
          <div>{totalDealsEvaluated}</div>
        </div>
        <div>
          <span className="label">Last scan</span>
          <div>{lastScanAt ? formatDateTime(lastScanAt) : "Not scanned yet"}</div>
        </div>
      </div>
      <div className="savings-controls">
        <span className="label">Monitoring</span>
        <button
          type="button"
          className={`toggle ${monitoringEnabled ? "toggle-on" : "toggle-off"}`}
          onClick={() => onToggleMonitoring(!monitoringEnabled)}
        >
          <span className="toggle-thumb" />
          <span className="toggle-label">
            {monitoringEnabled ? "On" : "Paused"}
          </span>
        </button>
      </div>
    </section>
  );
};

// ---------- Deal List ----------

interface DealListProps {
  purchase: Purchase;
  deals: Deal[];
  originalTotal: number;
  allowSimilar: boolean;
  onToggleAllowSimilar: (next: boolean) => void;
  allowCrossBorder: boolean;
  onToggleAllowCrossBorder: (next: boolean) => void;
  onSwapToDeal: (deal: Deal) => void;
  noDealsState: boolean;
}

const DealList: React.FC<DealListProps> = ({
  purchase,
  deals,
  originalTotal,
  allowSimilar,
  onToggleAllowSimilar,
  allowCrossBorder,
  onToggleAllowCrossBorder,
  onSwapToDeal,
  noDealsState
}) => {
  return (
    <section className="card">
      <header className="card-header deal-header">
        <div>
          <h2>Swap deals</h2>
          <p className="card-subtitle">
            Ranked by total savings, delivery, and reliability.
          </p>
        </div>
        <div className="deal-header-toggles">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={allowSimilar}
              onChange={(e) => onToggleAllowSimilar(e.target.checked)}
            />
            Allow similar items
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={allowCrossBorder}
              onChange={(e) => onToggleAllowCrossBorder(e.target.checked)}
            />
            Allow cross-border deals
          </label>
        </div>
      </header>

      {noDealsState ? (
        <div className="empty-state">
          <h3>No better deals found yet</h3>
          <p>
            We’ll keep monitoring this purchase and will surface any new
            opportunities here. You can close this window safely.
          </p>
        </div>
      ) : (
        <ul className="deal-list">
          {deals.map((deal) => (
            <li key={deal.deal_id}>
              <DealCard
                deal={deal}
                purchase={purchase}
                originalTotal={originalTotal}
                onSwapToDeal={onSwapToDeal}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

interface DealCardProps {
  deal: Deal;
  purchase: Purchase;
  originalTotal: number;
  onSwapToDeal: (deal: Deal) => void;
}

const DealCard: React.FC<DealCardProps> = ({
  deal,
  purchase,
  originalTotal,
  onSwapToDeal
}) => {
  const [expanded, setExpanded] = useState(false);
  const [whyExpanded, setWhyExpanded] = useState(false);

  const savingsLabel =
    deal.net_savings > 0
      ? `${formatCurrency(
          deal.net_savings,
          purchase.currency,
          purchase.country
        )} (${deal.savings_percentage.toFixed(1)}%)`
      : "No savings";

  return (
    <article className="deal-card">
      <header className="deal-card-header">
        <div className="deal-card-merchant">
          <div className="deal-card-merchant-name">{deal.merchant_or_seller}</div>
          <div className="deal-card-tags">
            <span className={`pill pill-tier pill-tier-${deal.match_tier.toLowerCase()}`}>
              {deal.match_tier} match
            </span>
            {deal.cross_border && (
              <span className="pill pill-warning">Cross-border</span>
            )}
          </div>
        </div>
        <div className="deal-card-price">
          <span className="label">Total price</span>
          <span className="deal-card-total">
            {formatCurrency(deal.total_price, purchase.currency, purchase.country)}
          </span>
          <button
            type="button"
            className="link-button small"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? "Hide breakdown" : "View breakdown"}
          </button>
        </div>
        <div className="deal-card-savings">
          <span className="label">Net savings</span>
          <span className="deal-card-savings-value">{savingsLabel}</span>
        </div>
      </header>

      {expanded && (
        <div className="deal-breakdown">
          <div>
            <span>Base price</span>
            <span>
              {formatCurrency(deal.base_price, purchase.currency, purchase.country)}
            </span>
          </div>
          <div>
            <span>Shipping</span>
            <span>
              {formatCurrency(deal.shipping, purchase.currency, purchase.country)}
            </span>
          </div>
          <div>
            <span>Tax estimate</span>
            <span>
              {formatCurrency(deal.tax_estimate, purchase.currency, purchase.country)}
            </span>
          </div>
          <div className="deal-breakdown-original">
            <span>Original total</span>
            <span>
              {formatCurrency(originalTotal, purchase.currency, purchase.country)}
            </span>
          </div>
        </div>
      )}

      <div className="deal-card-footer">
        <div className="deal-card-meta">
          <div>
            <span className="label">Delivery estimate</span>
            <span>{formatDateTime(deal.delivery_estimate)}</span>
          </div>
          <div>
            <span className="label">Reliability</span>
            <span>{Math.round(deal.reliability_score * 100)}%</span>
          </div>
          <div>
            <span className="label">Last checked</span>
            <span>{formatDateTime(deal.last_checked_at)}</span>
          </div>
          {deal.coupon && (
            <button
              type="button"
              className="pill pill-coupon"
              onClick={() => {
                navigator.clipboard.writeText(deal.coupon!.code).catch(() => {
                  // ignore clipboard failures in prototype
                });
              }}
            >
              Coupon: {deal.coupon.code}{" "}
              {deal.coupon.auto_apply_flag ? "(auto-apply)" : "(copy to use)"}
            </button>
          )}
        </div>
        <div className="deal-card-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => onSwapToDeal(deal)}
          >
            Swap to this deal
          </button>
          <button
            type="button"
            className="link-button small"
            onClick={() => setWhyExpanded((prev) => !prev)}
          >
            {whyExpanded ? "Hide why this match" : "Why this match?"}
          </button>
        </div>
      </div>

      {whyExpanded && (
        <div className="why-match">
          <p>
            This deal was matched based on {deal.match_tier.toLowerCase()}{" "}
            matching, total price including shipping and taxes, delivery parity, and
            our reliability score for this seller.
          </p>
          {deal.return_policy_summary && (
            <p>
              <strong>Return policy:</strong> {deal.return_policy_summary}
            </p>
          )}
          {deal.cross_border && (
            <p className="warning-text">
              Cross-border deal. VAT/import duties and longer delivery times may
              apply.
            </p>
          )}
        </div>
      )}
    </article>
  );
};

// ---------- Swap Flow Drawer (HITL Modal) ----------

interface SwapFlowDrawerProps {
  open: boolean;
  deal: Deal | null;
  purchase: Purchase;
  executionSequence: "BuySecondCancelFirst" | "CancelFirstBuySecond";
  setExecutionSequence: (
    seq: "BuySecondCancelFirst" | "CancelFirstBuySecond"
  ) => void;
  executionMode: ExecutionMode;
  setExecutionMode: (mode: ExecutionMode) => void;
  semiAutomatedEligible: boolean;
  onStartSwap: () => void;
  onClose: () => void;
  swapInProgress: boolean;
  swapCompleted: boolean;
  expired: boolean;
  automationBlockedReason: string | null;
}

const SwapFlowDrawer: React.FC<SwapFlowDrawerProps> = ({
  open,
  deal,
  purchase,
  executionSequence,
  setExecutionSequence,
  executionMode,
  setExecutionMode,
  semiAutomatedEligible,
  onStartSwap,
  onClose,
  swapInProgress,
  swapCompleted,
  expired,
  automationBlockedReason
}) => {
  const [acknowledged, setAcknowledged] = useState(false);

  if (!open || !deal) return null;

  const sequenceWarning =
    executionSequence === "CancelFirstBuySecond"
      ? "Cancelling first means you may lose this item if stock runs out before the second purchase completes."
      : "We’ll secure the second order first, then guide you to cancel this one.";

  const semiAutomatedDisabled = !semiAutomatedEligible;

  const startDisabled =
    expired || swapInProgress || !acknowledged || (executionMode === "SemiAutomated" && semiAutomatedDisabled);

  return (
    <div className="drawer-backdrop">
      <div className="drawer">
        <header className="drawer-header">
          <h2>Review and start swap</h2>
          <button type="button" className="icon-button" onClick={onClose}>
            ✕
          </button>
        </header>

        <section className="drawer-section">
          <h3>Comparison</h3>
          <div className="comparison-grid">
            <div className="comparison-column">
              <h4>Current purchase</h4>
              <p className="comparison-merchant">{purchase.merchant}</p>
              <p>
                Total:{" "}
                {formatCurrency(
                  purchase.items.reduce(
                    (sum, i) => sum + i.price * i.quantity,
                    0
                  ),
                  purchase.currency,
                  purchase.country
                )}
              </p>
              <p>Delivery: {formatDateTime(purchase.delivery_estimate)}</p>
            </div>
            <div className="comparison-column comparison-target">
              <h4>New deal</h4>
              <p className="comparison-merchant">{deal.merchant_or_seller}</p>
              <p>
                Total:{" "}
                {formatCurrency(deal.total_price, purchase.currency, purchase.country)}
              </p>
              <p>Delivery: {formatDateTime(deal.delivery_estimate)}</p>
              {deal.return_policy_summary && (
                <p className="comparison-return">{deal.return_policy_summary}</p>
              )}
              <p>
                Match tier:{" "}
                <span className="pill pill-tier">{deal.match_tier} match</span>
              </p>
              {deal.coupon && (
                <p>
                  Coupon:{" "}
                  <span className="pill pill-coupon-inline">{deal.coupon.code}</span>{" "}
                  {deal.coupon.auto_apply_flag
                    ? "Will be auto-applied where possible."
                    : "We’ll remind you to paste it at checkout."}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="drawer-section">
          <h3>Execution sequence</h3>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                checked={executionSequence === "BuySecondCancelFirst"}
                onChange={() => setExecutionSequence("BuySecondCancelFirst")}
              />
              <div>
                <div className="radio-title">Buy second → Cancel first</div>
                <div className="radio-description">
                  Recommended. We secure the better deal before cancelling your
                  current order.
                </div>
              </div>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                checked={executionSequence === "CancelFirstBuySecond"}
                onChange={() => setExecutionSequence("CancelFirstBuySecond")}
              />
              <div>
                <div className="radio-title">Cancel first → Buy second</div>
                <div className="radio-description">
                  Higher inventory risk. Requires fresh stock validation and an
                  extra confirmation step.
                </div>
              </div>
            </label>
          </div>
          <p className="info-text">{sequenceWarning}</p>
        </section>

        <section className="drawer-section">
          <h3>Mode</h3>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                checked={executionMode === "Manual"}
                onChange={() => setExecutionMode("Manual")}
              />
              <div>
                <div className="radio-title">Manual</div>
                <div className="radio-description">
                  We open the necessary pages and you complete each step yourself
                  with guidance.
                </div>
              </div>
            </label>
            <label className={`radio-option ${semiAutomatedDisabled ? "radio-disabled" : ""}`}>
              <input
                type="radio"
                checked={executionMode === "SemiAutomated"}
                onChange={() => {
                  if (!semiAutomatedDisabled) {
                    setExecutionMode("SemiAutomated");
                  }
                }}
                disabled={semiAutomatedDisabled}
              />
              <div>
                <div className="radio-title">Semi-automated (HITL)</div>
                <div className="radio-description">
                  AfterSave navigates and prepares actions. You review and confirm
                  before anything irreversible happens.
                </div>
                {semiAutomatedDisabled && (
                  <div className="info-text">
                    Not available for this merchant right now due to reliability or
                    CAPTCHA risk. We’ll fall back to manual mode.
                  </div>
                )}
              </div>
            </label>
          </div>
        </section>

        <section className="drawer-section">
          <h3>Confirm</h3>
          {expired && (
            <div className="banner banner-error">
              The cancellation or refund window appears to be expired. Swaps are
              disabled for this purchase.
            </div>
          )}
          {automationBlockedReason && (
            <div className="banner banner-warning">{automationBlockedReason}</div>
          )}
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            I’ve reviewed these details and understand that AfterSave will not
            complete any irreversible action without my confirmation.
          </label>
          <div className="drawer-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={swapInProgress}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn-primary"
              disabled={startDisabled}
              onClick={onStartSwap}
            >
              {swapInProgress
                ? "Starting..."
                : swapCompleted
                ? "Swap completed"
                : "Start swap"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

// ---------- Audit & Privacy Panels ----------

interface AuditPanelProps {
  events: AuditEvent[];
  expanded: boolean;
  onToggle: () => void;
}

const AuditPanel: React.FC<AuditPanelProps> = ({
  events,
  expanded,
  onToggle
}) => {
  return (
    <section className="card audit-panel">
      <header className="card-header">
        <h2>Audit & transparency</h2>
        <button type="button" className="link-button" onClick={onToggle}>
          {expanded ? "Hide details" : "View details"}
        </button>
      </header>
      {expanded && (
        <ol className="audit-timeline">
          {events.map((event) => (
            <li key={event.id}>
              <div className="audit-event-header">
                <span className="audit-event-label">{event.label}</span>
                <span className="audit-event-time">
                  {formatDateTime(event.timestamp)}
                </span>
              </div>
              {event.detail && (
                <div className="audit-event-detail">{event.detail}</div>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

interface PrivacyPanelProps {
  expanded: boolean;
  onToggle: () => void;
}

const PrivacyPanel: React.FC<PrivacyPanelProps> = ({ expanded, onToggle }) => {
  return (
    <section className="card privacy-panel">
      <header className="card-header">
        <h2>Privacy & controls</h2>
        <button type="button" className="link-button" onClick={onToggle}>
          {expanded ? "Hide" : "Learn more"}
        </button>
      </header>
      {expanded && (
        <div className="privacy-body">
          <p>
            AfterSave processes purchase emails locally where possible and sends
            only the minimum structured data required to discover deals and execute
            swaps. We never complete irreversible actions without your explicit
            confirmation.
          </p>
          <ul className="privacy-actions">
            <li>
              <button type="button" className="btn-ghost">
                Pause monitoring for this purchase
              </button>
            </li>
            <li>
              <button type="button" className="btn-ghost">
                Disconnect this email session
              </button>
            </li>
            <li>
              <button type="button" className="btn-ghost">
                Delete this purchase from AfterSave
              </button>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
};

