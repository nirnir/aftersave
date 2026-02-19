import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PurchaseListItem } from "../types/purchase";
import { fetchPurchases } from "../api/purchasesApi";
import {
  formatCurrency,
  formatPurchaseDate,
  formatTimeRemainingFriendly,
  formatLiveCountdown,
  isUrgent,
  filterPurchases,
  sortPurchases,
  searchPurchases,
  countByFilter,
  getTotalSavings,
  FilterOption as FilterType
} from "../utils/purchaseUtils";

export const PurchasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [purchases, setPurchases] = useState<PurchaseListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    (searchParams.get("filter") as FilterType) || "all"
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  const loadPurchases = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError(null);
      const rows = await fetchPurchases();
      setPurchases(rows);
      setFetchedAt(Date.now());
      setNow(Date.now());
    } catch (err) {
      if (!silent) {
        setError(
          err instanceof Error ? err.message : "Failed to load purchases."
        );
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases]);

  // Tick every 60s to keep time-remaining labels fresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // Re-fetch when the tab becomes visible again
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadPurchases(true);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadPurchases]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Sync URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (activeFilter !== "all") params.set("filter", activeFilter);
    setSearchParams(params, { replace: true });
  }, [activeFilter, debouncedSearch, setSearchParams]);

  // Locally adjust cancellation_window_remaining between server fetches
  const adjustedPurchases = useMemo(() => {
    const elapsed = Math.floor((now - fetchedAt) / 1000);
    if (elapsed < 1) return purchases;
    return purchases.map((p) => ({
      ...p,
      cancellation_window_remaining:
        p.cancellation_window_remaining !== undefined
          ? Math.max(0, p.cancellation_window_remaining - elapsed)
          : undefined
    }));
  }, [purchases, fetchedAt, now]);

  const filteredPurchases = useMemo(() => {
    let result = adjustedPurchases;
    result = filterPurchases(result, activeFilter);
    result = searchPurchases(result, debouncedSearch);
    result = sortPurchases(result, "urgency");
    return result;
  }, [adjustedPurchases, activeFilter, debouncedSearch]);

  const filterCounts = useMemo(
    () => ({
      all: countByFilter(adjustedPurchases, "all"),
      savings_available: countByFilter(adjustedPurchases, "savings_available"),
      searching: countByFilter(adjustedPurchases, "searching"),
      return_soon: countByFilter(adjustedPurchases, "return_soon")
    }),
    [adjustedPurchases]
  );

  const totalSavings = useMemo(
    () => getTotalSavings(adjustedPurchases),
    [adjustedPurchases]
  );

  const handleCardClick = useCallback(
    (purchaseId: string) => {
      sessionStorage.setItem("purchasesScrollY", window.scrollY.toString());
      navigate(`/purchase/${purchaseId}`);
    },
    [navigate]
  );

  useEffect(() => {
    const savedScrollY = sessionStorage.getItem("purchasesScrollY");
    if (savedScrollY) {
      window.scrollTo(0, parseInt(savedScrollY, 10));
      sessionStorage.removeItem("purchasesScrollY");
    }
  }, []);

  return (
    <main className="purchases-page">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">Your Purchases</h1>
        <p className="page-description">
          We automatically track your orders and search for better prices while
          you can still return them.
        </p>
      </div>

      {/* Savings Banner */}
      {totalSavings.count > 0 && (
        <div className="savings-banner">
          <div className="savings-banner-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l2.09 6.26L20.18 9l-5 4.27L16.82 20 12 16.77 7.18 20l1.64-6.73L3.82 9l6.09-.74L12 2z" fill="#fff" />
            </svg>
          </div>
          <div className="savings-banner-text">
            <span className="savings-banner-label">GOOD NEWS!</span>
            <span className="savings-banner-amount">
              We found {formatCurrency(totalSavings.totalAmount, "USD", "US")}{" "}
              in savings
            </span>
            <span className="savings-banner-sub">
              on {totalSavings.count} of your recent purchases. Scroll down to
              see the details.
            </span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="purchases-search">
        <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="7" cy="7" r="5" />
          <path d="M14 14l-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Search purchases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Filter Tabs */}
      <FilterTabs
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={filterCounts}
      />

      {/* Card List */}
      {loading ? (
        <PurchaseCardsSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={loadPurchases} />
      ) : filteredPurchases.length === 0 ? (
        <EmptyState
          hasSearch={!!debouncedSearch}
          hasFilter={activeFilter !== "all"}
        />
      ) : (
        <div className="card-list">
          {filteredPurchases.map((p) => (
            <PurchaseCard
              key={p.purchase_id}
              purchase={p}
              onClick={() => handleCardClick(p.purchase_id)}
            />
          ))}
        </div>
      )}
    </main>
  );
};

// ---------- Filter Tabs ----------

interface FilterTabsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

const FilterTabs: React.FC<FilterTabsProps> = ({
  activeFilter,
  onFilterChange,
  counts
}) => {
  const tabs: { value: FilterType; label: string }[] = [
    { value: "all", label: "All Purchases" },
    { value: "savings_available", label: "Savings Available" },
    { value: "searching", label: "Searching" },
    { value: "return_soon", label: "Return Soon" }
  ];

  return (
    <div className="filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={`filter-tab ${activeFilter === tab.value ? "filter-tab-active" : ""}`}
          onClick={() => onFilterChange(tab.value)}
        >
          {tab.label}
          <span className="tab-count">{counts[tab.value]}</span>
        </button>
      ))}
    </div>
  );
};

// ---------- Purchase Card ----------

interface PurchaseCardProps {
  purchase: PurchaseListItem;
  onClick: () => void;
}

const PurchaseCard: React.FC<PurchaseCardProps> = ({ purchase, onClick }) => {
  const hasDeal =
    purchase.best_deal_summary &&
    (purchase.status === "deal_found" || purchase.status === "window_closing");

  const isCompleted = purchase.status === "swap_completed";
  const isSearching =
    purchase.status === "monitoring" || purchase.status === "swap_in_progress";
  const isPaused = purchase.status === "paused";
  const isExpired = purchase.status === "expired";

  // Live countdown for items with < 1 hour remaining
  const initialSeconds = purchase.cancellation_window_remaining;
  const isSubHour = initialSeconds !== undefined && initialSeconds > 0 && initialSeconds < 3600;
  const [liveSeconds, setLiveSeconds] = useState<number | undefined>(initialSeconds);

  useEffect(() => {
    if (!isSubHour) return;
    setLiveSeconds(initialSeconds);
    const interval = setInterval(() => {
      setLiveSeconds((prev) => {
        if (prev === undefined || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [initialSeconds, isSubHour]);

  const displaySeconds = isSubHour ? liveSeconds : initialSeconds;
  const timeLabel = isSubHour && liveSeconds !== undefined && liveSeconds > 0
    ? formatLiveCountdown(liveSeconds)
    : formatTimeRemainingFriendly(displaySeconds);
  const urgent = isUrgent(displaySeconds);

  const itemTitle =
    purchase.item_count && purchase.item_count > 1
      ? `Order with ${purchase.item_count} items`
      : purchase.primary_item_title;

  const cardClass = hasDeal
    ? "purchase-card card-has-deal"
    : isCompleted
    ? "purchase-card card-completed"
    : isExpired
    ? "purchase-card card-expired"
    : "purchase-card";

  return (
    <article className={cardClass} onClick={onClick}>
      {/* Card Header: icon + info */}
      <div className="card-header">
        <div className="card-product-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 8l-9-5-9 5v8l9 5 9-5V8z" />
            <path d="M3 8l9 5 9-5" />
            <path d="M12 13v8.5" />
          </svg>
        </div>
        <div className="card-info">
          <h3 className="card-title">{itemTitle}</h3>
          <p className="card-subtitle">
            Bought from {purchase.merchant} on{" "}
            {formatPurchaseDate(purchase.purchase_time)}
          </p>
          {timeLabel && !isExpired && !isCompleted && (
            <span className={`card-time-badge ${urgent ? "badge-urgent" : "badge-normal"}`}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="6" cy="6" r="5" />
                <path d="M6 3v3.5l2 1" />
              </svg>
              {timeLabel}
            </span>
          )}
        </div>
      </div>

      {/* Price Comparison (only for cards with deals) */}
      {hasDeal && purchase.best_deal_summary && (
        <>
          <div className="price-comparison">
            <div className="price-you-paid">
              <span className="price-label">YOU PAID</span>
              <span className="price-amount">
                {formatCurrency(purchase.total_paid, purchase.currency, "US")}
              </span>
            </div>
            <div className="price-arrow">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10h12M12 6l4 4-4 4" />
              </svg>
            </div>
            <div className="price-better">
              <span className="price-label price-label-deal">BETTER PRICE FOUND!</span>
              <span className="price-amount price-amount-deal">
                {formatCurrency(
                  purchase.best_deal_summary.best_deal_total_price,
                  purchase.currency,
                  "US"
                )}
              </span>
              {purchase.best_deal_summary.best_deal_merchant && (
                <span className="price-merchant">
                  at {purchase.best_deal_summary.best_deal_merchant}
                </span>
              )}
            </div>
          </div>

          <div className="card-savings-bar">
            <div className="savings-info">
              <span className="savings-amount">
                Save{" "}
                {formatCurrency(
                  purchase.best_deal_summary.best_net_savings,
                  purchase.currency,
                  "US"
                )}
              </span>
              <span className="savings-desc">
                Return this item and buy from{" "}
                {purchase.best_deal_summary.best_deal_merchant ?? "elsewhere"}{" "}
                instead
              </span>
            </div>
            <button
              type="button"
              className="btn-swap"
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              Swap & Save
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Completed card footer */}
      {isCompleted && purchase.best_deal_summary && (
        <div className="card-completed-bar">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 8.5l3 3 5-5.5" />
          </svg>
          <span>
            Saved{" "}
            {formatCurrency(
              purchase.best_deal_summary.best_net_savings,
              purchase.currency,
              "US"
            )}{" "}
            by swapping
          </span>
        </div>
      )}

      {/* Searching state */}
      {isSearching && !purchase.best_deal_summary && (
        <div className="card-searching-bar">
          <div className="searching-dots">
            <span /><span /><span />
          </div>
          Searching for better prices...
        </div>
      )}

      {/* Paused state */}
      {isPaused && (
        <div className="card-paused-bar">Monitoring paused</div>
      )}

      {/* Expired state */}
      {isExpired && (
        <div className="card-expired-bar">Return window expired</div>
      )}
    </article>
  );
};

// ---------- Skeleton ----------

const PurchaseCardsSkeleton: React.FC = () => (
  <div className="card-list">
    {[1, 2, 3].map((i) => (
      <div key={i} className="purchase-card skeleton-card">
        <div className="skeleton-row skeleton-header" />
        <div className="skeleton-row skeleton-body" />
        <div className="skeleton-row skeleton-footer" />
      </div>
    ))}
  </div>
);

// ---------- Empty State ----------

const EmptyState: React.FC<{ hasSearch: boolean; hasFilter: boolean }> = ({
  hasSearch,
  hasFilter
}) => (
  <div className="empty-state">
    <div className="empty-icon">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round">
        <path d="M40 16L24 6 8 16v16l16 10 16-10V16z" />
        <path d="M8 16l16 10 16-10" />
        <path d="M24 26v10.5" />
      </svg>
    </div>
    <h2>No purchases found</h2>
    {hasSearch || hasFilter ? (
      <p>Try adjusting your search or filters.</p>
    ) : (
      <p>
        Connect your email or forward receipts to start saving with AfterSave.
      </p>
    )}
  </div>
);

// ---------- Error State ----------

const ErrorState: React.FC<{ error: string; onRetry: () => void }> = ({
  error,
  onRetry
}) => (
  <div className="error-state">
    <h2>Something went wrong</h2>
    <p>{error}</p>
    <button type="button" className="btn-primary" onClick={onRetry}>
      Retry
    </button>
  </div>
);
