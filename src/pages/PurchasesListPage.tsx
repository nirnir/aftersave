import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PurchaseListItem } from "../types/purchase";
import { MOCK_PURCHASES } from "../data/mockPurchases";
import {
  formatCurrency,
  formatTimeRemainingFromSeconds,
  filterPurchases,
  sortPurchases,
  searchPurchases,
  countByFilter,
  getSummaryMessage,
  FilterOption as FilterType
} from "../utils/purchaseUtils";

export const PurchasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [purchases] = useState<PurchaseListItem[]>(MOCK_PURCHASES);
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>(
    (searchParams.get("filter") as FilterType) || "all"
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (activeFilter !== "all") params.set("filter", activeFilter);
    setSearchParams(params, { replace: true });
  }, [activeFilter, debouncedSearch, setSearchParams]);

  // Filter, search, and sort (always urgency sort)
  const filteredPurchases = useMemo(() => {
    let result = purchases;
    result = filterPurchases(result, activeFilter);
    result = searchPurchases(result, debouncedSearch);
    result = sortPurchases(result, "urgency");
    return result;
  }, [purchases, activeFilter, debouncedSearch]);

  // Filter counts (computed from full list, not filtered)
  const filterCounts = useMemo(
    () => ({
      all: countByFilter(purchases, "all"),
      savings_found: countByFilter(purchases, "savings_found"),
      tracking: countByFilter(purchases, "tracking"),
      done: countByFilter(purchases, "done")
    }),
    [purchases]
  );

  // Summary message for header
  const summaryMessage = useMemo(
    () => getSummaryMessage(purchases),
    [purchases]
  );

  // Handle card click
  const handleCardClick = useCallback(
    (purchaseId: string) => {
      sessionStorage.setItem("purchasesScrollY", window.scrollY.toString());
      navigate(`/purchase/${purchaseId}`);
    },
    [navigate]
  );

  // Restore scroll position on mount
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem("purchasesScrollY");
    if (savedScrollY) {
      window.scrollTo(0, parseInt(savedScrollY, 10));
      sessionStorage.removeItem("purchasesScrollY");
    }
  }, []);

  // Handle pause/resume
  const handlePauseResume = useCallback(
    (purchaseId: string, currentStatus: string) => {
      const newStatus = currentStatus === "paused" ? "monitoring" : "paused";
      console.log(`Toggle monitoring for ${purchaseId}: ${newStatus}`);
    },
    []
  );

  // Handle delete
  const handleDelete = useCallback((purchaseId: string) => {
    console.log(`Delete purchase ${purchaseId}`);
  }, []);

  // Handle hide
  const handleHide = useCallback((purchaseId: string) => {
    console.log(`Hide purchase ${purchaseId}`);
  }, []);

  // Handle report issue
  const handleReportIssue = useCallback((purchaseId: string) => {
    console.log(`Report issue for ${purchaseId}`);
  }, []);

  return (
    <div className="purchases-page">
      <Header
        summaryMessage={summaryMessage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <Filters
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={filterCounts}
      />

      {loading ? (
        <PurchaseCardsSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={() => setError(null)} />
      ) : filteredPurchases.length === 0 ? (
        <EmptyState
          hasSearch={!!debouncedSearch}
          hasFilter={activeFilter !== "all"}
        />
      ) : (
        <PurchaseCardsGrid
          purchases={filteredPurchases}
          onCardClick={handleCardClick}
          onPauseResume={handlePauseResume}
          onDelete={handleDelete}
          onHide={handleHide}
          onReportIssue={handleReportIssue}
        />
      )}
    </div>
  );
};

// ---------- Header ----------

interface HeaderProps {
  summaryMessage: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  summaryMessage,
  searchQuery,
  onSearchChange
}) => (
  <header className="purchases-header">
    <div className="purchases-header-top">
      <div>
        <h1 className="purchases-title">Your Purchases</h1>
        <p className="purchases-subtitle">{summaryMessage}</p>
      </div>
      <button type="button" className="icon-button settings-btn" aria-label="Settings">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="10" r="3" />
          <path d="M10 1.5v2M10 16.5v2M3.4 3.4l1.4 1.4M15.2 15.2l1.4 1.4M1.5 10h2M16.5 10h2M3.4 16.6l1.4-1.4M15.2 4.8l1.4-1.4" />
        </svg>
      </button>
    </div>

    <div className="purchases-search">
      <input
        type="search"
        placeholder="Search purchases..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="search-input"
      />
    </div>
  </header>
);

// ---------- Filters ----------

interface FiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  counts: Record<FilterType, number>;
}

const Filters: React.FC<FiltersProps> = ({
  activeFilter,
  onFilterChange,
  counts
}) => {
  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "savings_found", label: "Savings found" },
    { value: "tracking", label: "Tracking" },
    { value: "done", label: "Completed" }
  ];

  return (
    <div className="filters-bar">
      {filters.map((f) => (
        <button
          key={f.value}
          type="button"
          className={`filter-chip ${activeFilter === f.value ? "filter-chip-active" : ""}`}
          onClick={() => onFilterChange(f.value)}
        >
          {f.label}
          <span className="filter-count">{counts[f.value]}</span>
        </button>
      ))}
    </div>
  );
};

// ---------- Purchase Cards Grid ----------

interface PurchaseCardsGridProps {
  purchases: PurchaseListItem[];
  onCardClick: (purchaseId: string) => void;
  onPauseResume: (purchaseId: string, currentStatus: string) => void;
  onDelete: (purchaseId: string) => void;
  onHide: (purchaseId: string) => void;
  onReportIssue: (purchaseId: string) => void;
}

const PurchaseCardsGrid: React.FC<PurchaseCardsGridProps> = ({
  purchases,
  onCardClick,
  onPauseResume,
  onDelete,
  onHide,
  onReportIssue
}) => (
  <div className="purchase-cards-grid">
    {purchases.map((purchase) => (
      <PurchaseCard
        key={purchase.purchase_id}
        purchase={purchase}
        onClick={() => onCardClick(purchase.purchase_id)}
        onPauseResume={() =>
          onPauseResume(purchase.purchase_id, purchase.status)
        }
        onDelete={() => onDelete(purchase.purchase_id)}
        onHide={() => onHide(purchase.purchase_id)}
        onReportIssue={() => onReportIssue(purchase.purchase_id)}
      />
    ))}
  </div>
);

// ---------- Purchase Card ----------

interface PurchaseCardProps {
  purchase: PurchaseListItem;
  onClick: () => void;
  onPauseResume: () => void;
  onDelete: () => void;
  onHide: () => void;
  onReportIssue: () => void;
}

const PurchaseCard: React.FC<PurchaseCardProps> = ({
  purchase,
  onClick,
  onPauseResume,
  onDelete,
  onHide,
  onReportIssue
}) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const isPaused = purchase.status === "paused";
  const isExpired = purchase.status === "expired";
  const isCompleted = purchase.status === "swap_completed";
  const isDealFound =
    purchase.status === "deal_found" || purchase.status === "window_closing";
  const isSwapping = purchase.status === "swap_in_progress";

  // Urgency: show time remaining only when it's relevant and < 24h
  const timeRemaining = formatTimeRemainingFromSeconds(
    purchase.cancellation_window_remaining
  );
  const showUrgency =
    !timeRemaining.expired &&
    timeRemaining.label !== "Window unknown" &&
    purchase.cancellation_window_remaining !== undefined &&
    purchase.cancellation_window_remaining > 0 &&
    purchase.cancellation_window_remaining < 24 * 3600;

  // Card accent class
  const accentClass = isDealFound
    ? "card-accent-green"
    : showUrgency
    ? "card-accent-amber"
    : isCompleted
    ? "card-accent-cyan"
    : isExpired || isPaused
    ? "card-accent-muted"
    : "";

  const itemTitle =
    purchase.item_count && purchase.item_count > 1
      ? `Order with ${purchase.item_count} items`
      : purchase.primary_item_title;

  return (
    <article
      className={`purchase-card ${accentClass}`}
      onClick={onClick}
    >
      {/* Row 1: Item name + menu */}
      <div className="card-row-top">
        <h3 className="card-title">{itemTitle}</h3>
        <div className="card-menu-wrapper">
          <button
            type="button"
            className="icon-button menu-button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            aria-label="More actions"
          >
            ···
          </button>
          {menuOpen && (
            <CardMenu
              isPaused={isPaused}
              onPauseResume={() => {
                onPauseResume();
                setMenuOpen(false);
              }}
              onHide={() => {
                onHide();
                setMenuOpen(false);
              }}
              onDelete={() => {
                onDelete();
                setMenuOpen(false);
              }}
              onReportIssue={() => {
                onReportIssue();
                setMenuOpen(false);
              }}
            />
          )}
        </div>
      </div>

      {/* Row 2: Merchant + price */}
      <div className="card-meta">
        <span className="card-merchant">{purchase.merchant}</span>
        <span className="card-price">
          {formatCurrency(purchase.total_paid, purchase.currency, "US")}
        </span>
      </div>

      {/* Row 3: Savings / status hero */}
      <div className="card-hero">
        <CardHero purchase={purchase} />
      </div>

      {/* Row 4: Urgency nudge (conditional) */}
      {showUrgency && (
        <div className="card-urgency">
          {timeRemaining.label} left to swap
        </div>
      )}
    </article>
  );
};

// ---------- Card Hero (savings / status row) ----------

const CardHero: React.FC<{ purchase: PurchaseListItem }> = ({ purchase }) => {
  if (purchase.status === "paused") {
    return <span className="hero-muted">Paused</span>;
  }

  if (purchase.status === "expired") {
    return <span className="hero-muted">Window expired</span>;
  }

  if (purchase.status === "swap_completed" && purchase.best_deal_summary) {
    return (
      <span className="hero-saved">
        Saved{" "}
        {formatCurrency(
          purchase.best_deal_summary.best_net_savings,
          purchase.currency,
          "US"
        )}
      </span>
    );
  }

  if (purchase.status === "needs_review") {
    return <span className="hero-review">Needs your review</span>;
  }

  if (purchase.status === "swap_in_progress") {
    return <span className="hero-progress">Swap in progress</span>;
  }

  if (purchase.best_deal_summary) {
    return (
      <span className="hero-savings">
        Save{" "}
        {formatCurrency(
          purchase.best_deal_summary.best_net_savings,
          purchase.currency,
          "US"
        )}{" "}
        ({purchase.best_deal_summary.best_savings_pct.toFixed(0)}%)
      </span>
    );
  }

  return (
    <span className="hero-scanning">
      Scanning for deals<span className="scanning-dots">...</span>
    </span>
  );
};

// ---------- Card Menu ----------

interface CardMenuProps {
  isPaused: boolean;
  onPauseResume: () => void;
  onHide: () => void;
  onDelete: () => void;
  onReportIssue: () => void;
}

const CardMenu: React.FC<CardMenuProps> = ({
  isPaused,
  onPauseResume,
  onHide,
  onDelete,
  onReportIssue
}) => (
  <div
    className="card-menu"
    onClick={(e) => e.stopPropagation()}
  >
    <button type="button" className="menu-item" onClick={onPauseResume}>
      {isPaused ? "Resume monitoring" : "Pause monitoring"}
    </button>
    <button type="button" className="menu-item" onClick={onHide}>
      Hide purchase
    </button>
    <button type="button" className="menu-item" onClick={onDelete}>
      Delete record
    </button>
    <button type="button" className="menu-item" onClick={onReportIssue}>
      Report issue
    </button>
  </div>
);

// ---------- Skeleton Loading ----------

const PurchaseCardsSkeleton: React.FC = () => (
  <div className="purchase-cards-grid">
    {[1, 2, 3, 4, 5, 6].map((i) => (
      <div key={i} className="purchase-card skeleton">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-meta" />
        <div className="skeleton-line skeleton-hero" />
      </div>
    ))}
  </div>
);

// ---------- Empty State ----------

interface EmptyStateProps {
  hasSearch: boolean;
  hasFilter: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasSearch, hasFilter }) => (
  <div className="empty-state">
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

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <div className="error-state">
    <h2>Something went wrong</h2>
    <p>{error}</p>
    <button type="button" className="btn-primary" onClick={onRetry}>
      Retry
    </button>
  </div>
);
