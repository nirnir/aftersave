import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { PurchaseListItem } from "../types/purchase";
import { MOCK_PURCHASES } from "../data/mockPurchases";
import {
  formatCurrency,
  formatDateTime,
  formatTimeRemainingFromSeconds,
  getStatusLabel,
  getStatusColorClass,
  filterPurchases,
  sortPurchases,
  searchPurchases,
  FilterOption as FilterType,
  SortOption as SortType
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
  const [sortOption, setSortOption] = useState<SortType>(
    (searchParams.get("sort") as SortType) || "urgency"
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search (only updates debouncedSearch state, not URL)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Update URL params when filter/sort/debouncedSearch changes
  // This single effect consolidates all URL param updates to avoid race conditions
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (activeFilter !== "all") params.set("filter", activeFilter);
    if (sortOption !== "urgency") params.set("sort", sortOption);
    setSearchParams(params, { replace: true });
  }, [activeFilter, sortOption, debouncedSearch, setSearchParams]);

  // Filter, search, and sort purchases
  const filteredPurchases = useMemo(() => {
    let result = purchases;
    result = filterPurchases(result, activeFilter);
    result = searchPurchases(result, debouncedSearch);
    result = sortPurchases(result, sortOption);
    return result;
  }, [purchases, activeFilter, debouncedSearch, sortOption]);

  // Calculate stats
  const stats = useMemo(() => {
    const monitoring = purchases.filter((p) => p.status === "monitoring")
      .length;
    const dealsFound = purchases.filter((p) => p.status === "deal_found")
      .length;
    const windowClosing = purchases.filter(
      (p) => p.status === "window_closing"
    ).length;
    return { monitoring, dealsFound, windowClosing };
  }, [purchases]);

  // Handle card click
  const handleCardClick = useCallback(
    (purchaseId: string) => {
      // Save scroll position and filter state
      sessionStorage.setItem("purchasesScrollY", window.scrollY.toString());
      sessionStorage.setItem("purchasesFilter", activeFilter);
      sessionStorage.setItem("purchasesSort", sortOption);
      sessionStorage.setItem("purchasesSearch", debouncedSearch);

      navigate(`/purchase/${purchaseId}`);
      // analytics: purchase_card_opened (include purchaseId, activeFilter)
    },
    [navigate, activeFilter, sortOption, debouncedSearch]
  );

  // Restore scroll position on mount
  useEffect(() => {
    const savedScrollY = sessionStorage.getItem("purchasesScrollY");
    if (savedScrollY) {
      window.scrollTo(0, parseInt(savedScrollY, 10));
      sessionStorage.removeItem("purchasesScrollY");
    }
    // analytics: purchases_list_viewed
  }, []);

  // Handle pause/resume
  const handlePauseResume = useCallback(
    (purchaseId: string, currentStatus: string) => {
      // TODO: API call to pause/resume
      const newStatus = currentStatus === "paused" ? "monitoring" : "paused";
      // analytics: currentStatus === "paused" ? purchase_resumed : purchase_paused
      console.log(`Toggle monitoring for ${purchaseId}: ${newStatus}`);
    },
    []
  );

  // Handle delete
  const handleDelete = useCallback((purchaseId: string) => {
    // TODO: API call to delete
    console.log(`Delete purchase ${purchaseId}`);
  }, []);

  // Handle hide
  const handleHide = useCallback((purchaseId: string) => {
    // TODO: API call to hide
    console.log(`Hide purchase ${purchaseId}`);
  }, []);

  // Handle report issue
  const handleReportIssue = useCallback((purchaseId: string) => {
    // TODO: Open issue reporting flow
    console.log(`Report issue for ${purchaseId}`);
  }, []);

  return (
    <div className="purchases-page">
      <Header
        stats={stats}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <FiltersAndSort
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        sortOption={sortOption}
        onSortChange={setSortOption}
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

// ---------- Header Component ----------

interface HeaderProps {
  stats: { monitoring: number; dealsFound: number; windowClosing: number };
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  stats,
  searchQuery,
  onSearchChange
}) => {
  return (
    <header className="purchases-header">
      <div className="purchases-header-top">
        <h1 className="purchases-title">Purchases</h1>
        <button type="button" className="btn-ghost settings-btn">
          Settings
        </button>
      </div>

      <div className="purchases-stats">
        <div className="stat-item">
          <span className="stat-label">Monitoring</span>
          <span className="stat-value">{stats.monitoring}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Deals Found</span>
          <span className="stat-value">{stats.dealsFound}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Window Closing</span>
          <span className="stat-value">{stats.windowClosing}</span>
        </div>
      </div>

      <div className="purchases-search">
        <input
          type="search"
          placeholder="Search by merchant, item, or order ID..."
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            // analytics: search_used (on submit/debounce)
          }}
          className="search-input"
        />
      </div>
    </header>
  );
};

// ---------- Filters and Sort Component ----------

interface FiltersAndSortProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  sortOption: SortType;
  onSortChange: (sort: SortType) => void;
}

const FiltersAndSort: React.FC<FiltersAndSortProps> = ({
  activeFilter,
  onFilterChange,
  sortOption,
  onSortChange
}) => {
  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "All" },
    { value: "window_closing", label: "Window Closing" },
    { value: "deal_found", label: "Deals Found" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "needs_review", label: "Needs Review" },
    { value: "paused", label: "Paused" }
  ];

  const sortOptions: { value: SortType; label: string }[] = [
    { value: "urgency", label: "Urgency" },
    { value: "biggest_savings", label: "Biggest Savings" },
    { value: "most_recent", label: "Most Recent" },
    { value: "merchant_name", label: "Merchant Name" }
  ];

  return (
    <div className="filters-and-sort">
      <div className="filter-chips">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={`filter-chip ${
              activeFilter === filter.value ? "filter-chip-active" : ""
            }`}
            onClick={() => {
              onFilterChange(filter.value);
              // analytics: filter_applied (include filter.value)
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="sort-control">
        <label htmlFor="sort-select" className="sort-label">
          Sort:
        </label>
        <select
          id="sort-select"
          value={sortOption}
          onChange={(e) => {
            onSortChange(e.target.value as SortType);
            // analytics: sort_changed (include e.target.value)
          }}
          className="sort-select"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
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
}) => {
  return (
    <div className="purchase-cards-grid">
      {purchases.map((purchase) => (
        <PurchaseCard
          key={purchase.purchase_id}
          purchase={purchase}
          onClick={() => onCardClick(purchase.purchase_id)}
          onPauseResume={() => onPauseResume(purchase.purchase_id, purchase.status)}
          onDelete={() => onDelete(purchase.purchase_id)}
          onHide={() => onHide(purchase.purchase_id)}
          onReportIssue={() => onReportIssue(purchase.purchase_id)}
        />
      ))}
    </div>
  );
};

// ---------- Purchase Card Component ----------

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

  const timeRemaining = formatTimeRemainingFromSeconds(
    purchase.cancellation_window_remaining
  );

  const isExpired = purchase.status === "expired";
  const isCompleted = purchase.status === "swap_completed";
  const isNeedsReview = purchase.status === "needs_review";
  const isPaused = purchase.status === "paused";

  const ctaText = isCompleted
    ? "View summary"
    : isExpired
    ? "View details"
    : "View swap deals";

  return (
    <article
      className={`purchase-card ${
        isNeedsReview ? "purchase-card-needs-review" : ""
      } ${isExpired ? "purchase-card-expired" : ""} ${
        isCompleted ? "purchase-card-completed" : ""
      }`}
      onClick={onClick}
    >
      <div className="purchase-card-header">
        <div className="purchase-card-merchant">
          <div className="merchant-logo-placeholder">
            {purchase.merchant.charAt(0)}
          </div>
          <div className="merchant-name">{purchase.merchant}</div>
        </div>
        <div className="purchase-card-actions">
          <button
            type="button"
            className="icon-button menu-button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="card-menu">
              <button
                type="button"
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onPauseResume();
                  setMenuOpen(false);
                }}
              >
                {isPaused ? "Resume monitoring" : "Pause monitoring"}
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onHide();
                  setMenuOpen(false);
                }}
              >
                Hide purchase
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setMenuOpen(false);
                }}
              >
                Delete record
              </button>
              <button
                type="button"
                className="menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  onReportIssue();
                  setMenuOpen(false);
                }}
              >
                Report issue
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="purchase-card-status">
        <span
          className={`status-badge ${getStatusColorClass(purchase.status)}`}
        >
          {getStatusLabel(purchase.status)}
        </span>
      </div>

      <div className="purchase-card-content">
        <h3 className="purchase-card-title">
          {purchase.item_count && purchase.item_count > 1
            ? `Order with ${purchase.item_count} items`
            : purchase.primary_item_title}
        </h3>

        <div className="purchase-card-meta">
          <div className="meta-row">
            <span className="meta-label">Total paid</span>
            <span className="meta-value">
              {formatCurrency(purchase.total_paid, purchase.currency, "US")}
            </span>
          </div>
          <div className="meta-row">
            <span className="meta-label">Purchased</span>
            <span className="meta-value">
              {formatDateTime(purchase.purchase_time)}
            </span>
          </div>
          {timeRemaining.label !== "Window unknown" && (
            <div className="meta-row">
              <span className="meta-label">Cancellation window</span>
              <span className="meta-value">
                {timeRemaining.label}
                {purchase.cancellation_window_estimated && (
                  <span className="estimated-badge">Estimated</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="purchase-card-savings">
          {isPaused ? (
            <div className="savings-status">Monitoring paused</div>
          ) : purchase.best_deal_summary ? (
            <div className="savings-found">
              <div className="savings-amount">
                Save{" "}
                {formatCurrency(
                  purchase.best_deal_summary.best_net_savings,
                  purchase.currency,
                  "US"
                )}{" "}
                ({purchase.best_deal_summary.best_savings_pct.toFixed(1)}%)
              </div>
              <div className="savings-meta">
                Last scan: {formatDateTime(purchase.best_deal_summary.last_scan_at)}
              </div>
            </div>
          ) : (
            <div className="savings-scanning">
              <div>No better deal yet</div>
              <div className="scanning-indicator">Scanning...</div>
            </div>
          )}
        </div>
      </div>

      <div className="purchase-card-footer">
        <button
          type="button"
          className="btn-primary card-cta"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          {ctaText}
        </button>
      </div>
    </article>
  );
};

// ---------- Skeleton Loading State ----------

const PurchaseCardsSkeleton: React.FC = () => {
  return (
    <div className="purchase-cards-grid">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="purchase-card skeleton">
          <div className="skeleton-header" />
          <div className="skeleton-content" />
          <div className="skeleton-footer" />
        </div>
      ))}
    </div>
  );
};

// ---------- Empty State ----------

interface EmptyStateProps {
  hasSearch: boolean;
  hasFilter: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ hasSearch, hasFilter }) => {
  return (
    <div className="empty-state">
      <h2>No purchases found</h2>
      {hasSearch || hasFilter ? (
        <p>Try adjusting your search or filter to see more results.</p>
      ) : (
        <>
          <p>No purchases yet.</p>
          <p>
            Connect your email account or forward purchase receipts to get
            started with AfterSave.
          </p>
        </>
      )}
    </div>
  );
};

// ---------- Error State ----------

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="error-state">
      <h2>Something went wrong</h2>
      <p>{error}</p>
      <button type="button" className="btn-primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  );
};
