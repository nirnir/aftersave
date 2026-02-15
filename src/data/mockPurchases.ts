import { PurchaseListItem } from "../types/purchase";

export const MOCK_PURCHASES: PurchaseListItem[] = [
  {
    purchase_id: "purchase-1",
    merchant: "Example Store",
    primary_item_title: "Noise Cancelling Headphones",
    purchase_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 299.99,
    delivery_estimate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 10 * 60 * 60, // 10 hours
    cancellation_window_estimated: false,
    status: "deal_found",
    best_deal_summary: {
      best_net_savings: 30.0,
      best_savings_pct: 10.0,
      best_deal_total_price: 269.99,
      last_scan_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    },
    order_id: "ORDER-12345"
  },
  {
    purchase_id: "purchase-2",
    merchant: "TechMart",
    primary_item_title: "Order with 3 items",
    purchase_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 549.99,
    delivery_estimate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 18 * 60 * 60, // 18 hours - window closing
    cancellation_window_estimated: false,
    status: "window_closing",
    best_deal_summary: {
      best_net_savings: 45.5,
      best_savings_pct: 8.3,
      best_deal_total_price: 504.49,
      last_scan_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    order_id: "ORDER-67890",
    item_count: 3
  },
  {
    purchase_id: "purchase-3",
    merchant: "FashionHub",
    primary_item_title: "Designer Jacket",
    purchase_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 199.99,
    delivery_estimate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 48 * 60 * 60, // 48 hours
    cancellation_window_estimated: true,
    cancellation_window_confidence: 0.7,
    status: "monitoring",
    order_id: "ORDER-11111"
  },
  {
    purchase_id: "purchase-4",
    merchant: "Electronics Plus",
    primary_item_title: "Gaming Monitor",
    purchase_time: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 399.99,
    delivery_estimate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 0, // Expired
    cancellation_window_estimated: false,
    status: "expired",
    order_id: "ORDER-22222"
  },
  {
    purchase_id: "purchase-5",
    merchant: "HomeGoods",
    primary_item_title: "Coffee Maker",
    purchase_time: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 89.99,
    delivery_estimate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 72 * 60 * 60, // 72 hours
    cancellation_window_estimated: false,
    status: "swap_in_progress",
    best_deal_summary: {
      best_net_savings: 15.0,
      best_savings_pct: 16.7,
      best_deal_total_price: 74.99,
      last_scan_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    order_id: "ORDER-33333"
  },
  {
    purchase_id: "purchase-6",
    merchant: "BookStore",
    primary_item_title: "Order with 5 items",
    purchase_time: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 124.99,
    delivery_estimate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 0,
    cancellation_window_estimated: false,
    status: "swap_completed",
    best_deal_summary: {
      best_net_savings: 25.0,
      best_savings_pct: 20.0,
      best_deal_total_price: 99.99,
      last_scan_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    order_id: "ORDER-44444",
    item_count: 5
  },
  {
    purchase_id: "purchase-7",
    merchant: "SportsWorld",
    primary_item_title: "Running Shoes",
    purchase_time: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 129.99,
    delivery_estimate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 36 * 60 * 60, // 36 hours
    cancellation_window_estimated: false,
    status: "needs_review",
    issues: ["low_confidence", "missing_order_id"],
    order_id: "ORDER-55555"
  },
  {
    purchase_id: "purchase-8",
    merchant: "GadgetZone",
    primary_item_title: "Wireless Earbuds",
    purchase_time: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 79.99,
    delivery_estimate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 96 * 60 * 60, // 96 hours
    cancellation_window_estimated: false,
    status: "paused",
    order_id: "ORDER-66666"
  },
  {
    purchase_id: "purchase-9",
    merchant: "FurnitureStore",
    primary_item_title: "Office Chair",
    purchase_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 249.99,
    delivery_estimate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: 12 * 60 * 60, // 12 hours - window closing
    cancellation_window_estimated: false,
    status: "deal_found",
    best_deal_summary: {
      best_net_savings: 50.0,
      best_savings_pct: 20.0,
      best_deal_total_price: 199.99,
      last_scan_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    order_id: "ORDER-77777"
  },
  {
    purchase_id: "purchase-10",
    merchant: "BeautyShop",
    primary_item_title: "Skincare Set",
    purchase_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    currency: "USD",
    total_paid: 59.99,
    delivery_estimate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    cancellation_window_remaining: undefined, // Unknown
    cancellation_window_estimated: true,
    cancellation_window_confidence: 0.5,
    status: "monitoring",
    order_id: "ORDER-88888"
  }
];
