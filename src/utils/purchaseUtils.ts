import {
  PurchaseListItem,
  PurchaseStatus
} from "../types/purchase";

// ---------- Formatting ----------

export function formatCurrency(
  amount: number,
  currency: string,
  country: string
): string {
  try {
    return new Intl.NumberFormat(country === "US" ? "en-US" : "en", {
      style: "currency",
      currency
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatPurchaseDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function calculateTimeRemaining(endIso: string): {
  expired: boolean;
  label: string;
} {
  const now = Date.now();
  const end = new Date(endIso).getTime();
  const diffMs = end - now;
  const expired = diffMs <= 0;
  const absMs = Math.abs(diffMs);
  const hours = Math.floor(absMs / (60 * 60 * 1000));
  const minutes = Math.floor((absMs % (60 * 60 * 1000)) / (60 * 1000));
  return { expired, label: `${hours}h ${minutes}m` };
}

export function formatTimeRemainingFromSeconds(seconds?: number): {
  expired: boolean;
  label: string;
  estimated?: boolean;
} {
  if (seconds === undefined) {
    return { expired: false, label: "Window unknown" };
  }
  const expired = seconds <= 0;
  const absSeconds = Math.abs(seconds);
  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  return {
    expired,
    label: `${hours}h ${minutes}m`,
    estimated: false
  };
}

export function formatTimeRemainingFriendly(seconds?: number): string | null {
  if (seconds === undefined || seconds <= 0) return null;
  const hours = Math.floor(seconds / 3600);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"} left to return`;
  }
  return `Only ${hours} hour${hours === 1 ? "" : "s"} left!`;
}

export function isUrgent(seconds?: number): boolean {
  if (seconds === undefined || seconds <= 0) return false;
  return seconds < 24 * 3600;
}

// ---------- Status Utilities ----------

export function getStatusLabel(status: PurchaseStatus): string {
  const labels: Record<PurchaseStatus, string> = {
    monitoring: "Monitoring",
    deal_found: "Deal Found",
    window_closing: "Window Closing",
    swap_in_progress: "Swap in Progress",
    swap_completed: "Completed",
    expired: "Expired",
    needs_review: "Needs Review",
    paused: "Paused"
  };
  return labels[status];
}

export function getStatusColorClass(status: PurchaseStatus): string {
  const colors: Record<PurchaseStatus, string> = {
    monitoring: "status-monitoring",
    deal_found: "status-deal-found",
    window_closing: "status-window-closing",
    swap_in_progress: "status-swap-in-progress",
    swap_completed: "status-completed",
    expired: "status-expired",
    needs_review: "status-needs-review",
    paused: "status-paused"
  };
  return colors[status];
}

// ---------- Filter Utilities ----------

export type FilterOption =
  | "all"
  | "savings_available"
  | "searching"
  | "return_soon";

const filterStatusGroups: Record<FilterOption, PurchaseStatus[]> = {
  all: [],
  savings_available: ["deal_found", "window_closing"],
  searching: ["monitoring", "swap_in_progress"],
  return_soon: ["needs_review", "paused", "expired", "swap_completed"]
};

export function filterPurchases(
  purchases: PurchaseListItem[],
  filter: FilterOption
): PurchaseListItem[] {
  if (filter === "all") return purchases;
  const statuses = filterStatusGroups[filter];
  return purchases.filter((p) => statuses.includes(p.status));
}

export function countByFilter(
  purchases: PurchaseListItem[],
  filter: FilterOption
): number {
  if (filter === "all") return purchases.length;
  const statuses = filterStatusGroups[filter];
  return purchases.filter((p) => statuses.includes(p.status)).length;
}

// ---------- Savings Aggregation ----------

export function getTotalSavings(purchases: PurchaseListItem[]): {
  totalAmount: number;
  count: number;
} {
  const actionable = purchases.filter(
    (p) =>
      (p.status === "deal_found" || p.status === "window_closing") &&
      p.best_deal_summary
  );
  const totalAmount = actionable.reduce(
    (sum, p) => sum + (p.best_deal_summary?.best_net_savings ?? 0),
    0
  );
  return { totalAmount, count: actionable.length };
}

// ---------- Summary Message ----------

export function getSummaryMessage(purchases: PurchaseListItem[]): string {
  const { count } = getTotalSavings(purchases);

  if (count > 0) {
    return `${count} purchase${count === 1 ? " has" : "s have"} savings ready`;
  }

  const trackingCount = purchases.filter(
    (p) => p.status === "monitoring" || p.status === "swap_in_progress"
  ).length;

  if (trackingCount > 0) {
    return `${trackingCount} purchase${trackingCount === 1 ? " is" : "s"} being tracked`;
  }

  return "All caught up";
}

// ---------- Sort Utilities ----------

export type SortOption =
  | "urgency"
  | "biggest_savings"
  | "most_recent"
  | "merchant_name";

export function calculateUrgencyScore(purchase: PurchaseListItem): number {
  let score = 0;
  if (purchase.status === "window_closing") score += 1000;
  if (purchase.status === "needs_review") score += 800;
  if (purchase.status === "deal_found") score += 600;
  if (purchase.cancellation_window_remaining !== undefined) {
    const hoursRemaining = purchase.cancellation_window_remaining / 3600;
    if (hoursRemaining > 0 && hoursRemaining < 24) {
      score += 500 - hoursRemaining * 10;
    }
  }
  if (purchase.issues && purchase.issues.length > 0) {
    score += purchase.issues.length * 50;
  }
  return score;
}

export function sortPurchases(
  purchases: PurchaseListItem[],
  sort: SortOption
): PurchaseListItem[] {
  const sorted = [...purchases];
  switch (sort) {
    case "urgency":
      return sorted.sort(
        (a, b) => calculateUrgencyScore(b) - calculateUrgencyScore(a)
      );
    case "biggest_savings":
      return sorted.sort(
        (a, b) =>
          (b.best_deal_summary?.best_net_savings ?? 0) -
          (a.best_deal_summary?.best_net_savings ?? 0)
      );
    case "most_recent":
      return sorted.sort(
        (a, b) =>
          new Date(b.purchase_time).getTime() -
          new Date(a.purchase_time).getTime()
      );
    case "merchant_name":
      return sorted.sort((a, b) => a.merchant.localeCompare(b.merchant));
    default:
      return sorted;
  }
}

// ---------- Search ----------

export function searchPurchases(
  purchases: PurchaseListItem[],
  query: string
): PurchaseListItem[] {
  if (!query.trim()) return purchases;
  const lowerQuery = query.toLowerCase().trim();
  return purchases.filter((purchase) => {
    if (purchase.merchant.toLowerCase().includes(lowerQuery)) return true;
    if (purchase.primary_item_title.toLowerCase().includes(lowerQuery))
      return true;
    if (
      purchase.order_id &&
      purchase.order_id.toLowerCase().includes(lowerQuery)
    )
      return true;
    return false;
  });
}

// ---------- Urgency Detection ----------

const WINDOW_CLOSING_THRESHOLD_HOURS = 24;

export function shouldMarkAsWindowClosing(
  purchase: PurchaseListItem
): boolean {
  if (purchase.status === "expired" || purchase.status === "swap_completed") {
    return false;
  }
  if (purchase.cancellation_window_remaining === undefined) return false;
  const hoursRemaining = purchase.cancellation_window_remaining / 3600;
  return hoursRemaining > 0 && hoursRemaining < WINDOW_CLOSING_THRESHOLD_HOURS;
}
