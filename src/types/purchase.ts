// ---------- Shared Purchase Types (used by both list and detail pages) ----------

export type MatchTier = "Exact" | "Attribute" | "Similar";

export type PurchaseStatus =
  | "monitoring"
  | "deal_found"
  | "window_closing"
  | "swap_in_progress"
  | "swap_completed"
  | "expired"
  | "needs_review"
  | "paused";

export type ExecutionMode = "Manual" | "SemiAutomated";

export type PurchaseIssue =
  | "low_confidence"
  | "missing_order_id"
  | "merchant_not_supported"
  | "captcha_blocked"
  | "out_of_stock";

export interface PurchaseItem {
  title: string;
  attributes: Record<string, string>;
  quantity: number;
  price: number;
}

export interface BestDealSummary {
  best_net_savings: number;
  best_savings_pct: number;
  best_deal_total_price: number;
  last_scan_at: string;
}

export interface PurchaseListItem {
  purchase_id: string;
  merchant: string;
  primary_item_title: string;
  purchase_time: string;
  currency: string;
  total_paid: number;
  delivery_estimate?: string;
  cancellation_window_remaining?: number; // seconds
  cancellation_window_estimated?: boolean;
  cancellation_window_confidence?: number; // 0-1
  status: PurchaseStatus;
  best_deal_summary?: BestDealSummary;
  issues?: PurchaseIssue[];
  order_id?: string;
  item_count?: number; // for multi-item orders
}

export interface Purchase {
  purchase_id: string;
  merchant: string;
  order_id: string;
  purchase_time: string;
  country: string;
  currency: string;
  items: PurchaseItem[];
  delivery_estimate: string;
  cancellation_window: {
    end: string;
    inferred: boolean;
  };
  extraction_confidence_score: number; // 0–1
  monitoring_enabled: boolean;
  last_scan_at?: string;
}

export interface Coupon {
  code: string;
  auto_apply_flag: boolean;
}

export interface Deal {
  deal_id: string;
  merchant_or_seller: string;
  listing_url: string;
  match_tier: MatchTier;
  base_price: number;
  shipping: number;
  tax_estimate: number;
  total_price: number;
  delivery_estimate: string;
  return_policy_summary?: string;
  coupon?: Coupon;
  reliability_score: number; // 0–1
  net_savings: number;
  savings_percentage: number;
  last_checked_at: string;
  in_stock_flag: boolean;
  stock_confidence: number; // 0–1
  cross_border?: boolean;
}

export interface AuditEvent {
  id: string;
  type:
    | "purchase_detected"
    | "data_extracted"
    | "deals_evaluated"
    | "recommendation_generated"
    | "swap_step"
    | "swap_completed"
    | "failure";
  timestamp: string;
  label: string;
  detail?: string;
}
