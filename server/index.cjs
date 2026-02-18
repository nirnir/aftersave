const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { init, id } = require("@instantdb/admin");

dotenv.config();

const INSTANT_APP_ID =
  process.env.INSTANT_APP_ID || "3e431316-67d8-4c1f-9757-73b16679832b";
const INSTANT_ADMIN_TOKEN = process.env.INSTANT_ADMIN_TOKEN;
const PORT = Number(process.env.PORT || 8787);

if (!INSTANT_ADMIN_TOKEN) {
  console.warn(
    "[server] Missing INSTANT_ADMIN_TOKEN. Set it in .env to enable API access."
  );
}

const db = init({
  appId: INSTANT_APP_ID,
  adminToken: INSTANT_ADMIN_TOKEN
});

const app = express();
app.use(cors());
app.use(express.json());

const DEFAULT_DEMO_ACCOUNT_ID = "acct_demo_1";
const DEFAULT_DEMO_USER_ID = "user_demo_1";
const DEFAULT_DEMO_INSTANT_USER_ID = "instant_demo_1";

function nowIso() {
  return new Date().toISOString();
}

function toMinor(amountMajor) {
  return Math.round(Number(amountMajor || 0) * 100);
}

function toMajor(amountMinor) {
  return Number(amountMinor || 0) / 100;
}

function toLegacyMatchTier(matchTier) {
  switch (matchTier) {
    case "exact":
      return "Exact";
    case "attribute":
      return "Attribute";
    case "similar":
      return "Similar";
    default:
      return "Attribute";
  }
}

function resolveDeliveryEstimate(record) {
  if (record.delivery_estimate_at) {
    return record.delivery_estimate_at;
  }
  if (
    record.delivery_estimate_window &&
    typeof record.delivery_estimate_window.end_at === "string"
  ) {
    return record.delivery_estimate_window.end_at;
  }
  return new Date().toISOString();
}

function firstOrNull(values) {
  return values && values.length > 0 ? values[0] : null;
}

function rowsFromQuery(response, entityName) {
  if (!response || typeof response !== "object") return [];
  if (Array.isArray(response[entityName])) return response[entityName];
  if (response.data && Array.isArray(response.data[entityName])) {
    return response.data[entityName];
  }
  return [];
}

async function findByField(entityName, fieldName, fieldValue) {
  const response = await db.query({
    [entityName]: {
      $: { where: { [fieldName]: fieldValue } }
    }
  });
  return firstOrNull(rowsFromQuery(response, entityName));
}

async function listByField(entityName, fieldName, fieldValue) {
  const response = await db.query({
    [entityName]: {
      $: { where: { [fieldName]: fieldValue } }
    }
  });
  return rowsFromQuery(response, entityName);
}

async function resolveRequestContext(req) {
  const requestedAccountIdHeader = req.header("x-account-id");
  const requestedAccountId =
    typeof requestedAccountIdHeader === "string" &&
    requestedAccountIdHeader.trim()
      ? requestedAccountIdHeader.trim()
      : null;

  const instantUserIdHeader = req.header("x-instant-user-id");
  const requestedInstantUserId =
    typeof instantUserIdHeader === "string" && instantUserIdHeader.trim()
      ? instantUserIdHeader.trim()
      : null;

  const emailHeader = req.header("x-user-email");
  const requestedEmail =
    typeof emailHeader === "string" && emailHeader.trim()
      ? emailHeader.trim().toLowerCase()
      : null;

  let appUser = null;
  if (requestedInstantUserId) {
    appUser = await findByField("app_users", "instant_user_id", requestedInstantUserId);
  }
  if (!appUser && requestedEmail) {
    appUser = await findByField("app_users", "email", requestedEmail);
  }

  let membership = null;
  if (appUser) {
    const memberships = await listByField(
      "account_memberships",
      "app_user_id",
      appUser.user_id
    );
    const activeMemberships = memberships.filter(
      (m) => m.membership_status === "active"
    );
    if (requestedAccountId) {
      membership =
        activeMemberships.find((m) => m.account_id === requestedAccountId) || null;
    }
    if (!membership) {
      membership = firstOrNull(activeMemberships);
    }
  }

  const accountId =
    requestedAccountId ||
    membership?.account_id ||
    (await (async () => {
      const defaultAccount = await findByField(
        "accounts",
        "account_id",
        DEFAULT_DEMO_ACCOUNT_ID
      );
      if (defaultAccount) return defaultAccount.account_id;
      const accountsResponse = await db.query({ accounts: {} });
      const firstAccount = firstOrNull(rowsFromQuery(accountsResponse, "accounts"));
      return firstAccount?.account_id || null;
    })());

  if (!accountId) {
    throw new Error("No account found. Seed data or register a user first.");
  }

  return {
    account_id: accountId,
    app_user_id: appUser?.user_id || null,
    role: membership?.role || null
  };
}

function requireAdminToken(req, res, next) {
  if (!INSTANT_ADMIN_TOKEN) {
    res.status(500).json({
      error:
        "InstantDB admin token not configured. Add INSTANT_ADMIN_TOKEN to your .env file."
    });
    return;
  }
  next();
}

function makeSampleSeedData() {
  const now = Date.now();
  const seedUser = {
    user_id: DEFAULT_DEMO_USER_ID,
    instant_user_id: DEFAULT_DEMO_INSTANT_USER_ID,
    email: "demo@aftersave.app",
    full_name: "AfterSave Demo User",
    status: "active",
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString(),
    last_login_at: new Date(now).toISOString()
  };

  const seedAccount = {
    account_id: DEFAULT_DEMO_ACCOUNT_ID,
    name: "AfterSave Demo Workspace",
    plan: "free",
    status: "active",
    timezone: "UTC",
    default_currency: "USD",
    country: "US",
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString()
  };

  const seedMembership = {
    membership_id: "membership_demo_1",
    account_id: DEFAULT_DEMO_ACCOUNT_ID,
    app_user_id: DEFAULT_DEMO_USER_ID,
    role: "owner",
    membership_status: "active",
    joined_at: new Date(now).toISOString(),
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString()
  };

  const seedProfile = {
    profile_id: "profile_demo_1",
    account_id: DEFAULT_DEMO_ACCOUNT_ID,
    display_name: "AfterSave Demo",
    support_email: "support@aftersave.app",
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString()
  };

  const seedSettings = {
    settings_id: "settings_demo_1",
    account_id: DEFAULT_DEMO_ACCOUNT_ID,
    notifications: {
      email_deal_alerts: true,
      email_window_closing: true,
      weekly_digest: true
    },
    automation_defaults: {
      allow_similar: false,
      allow_cross_border: false,
      default_execution_mode: "Manual"
    },
    privacy: {
      receipt_retention_days: 365,
      allow_analytics: true
    },
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString()
  };

  const seedUserPreferences = {
    preferences_id: "preferences_demo_1",
    account_id: DEFAULT_DEMO_ACCOUNT_ID,
    allow_similar_items: false,
    marketplace_sellers_allowed: true,
    used_refurbished_allowed: false,
    allow_cross_border: false,
    minimum_savings_minor: 1000,
    shipping_parity_required: true,
    default_execution_mode: "manual",
    auto_open_from_notification: false,
    quiet_hours: { start_local: "22:00", end_local: "07:00" },
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString()
  };

  const seedBillingProfile = {
    billing_profile_id: "billing_demo_1",
    account_id: DEFAULT_DEMO_ACCOUNT_ID,
    provider: "manual",
    billing_status: "trialing",
    billing_email: "billing@aftersave.app",
    created_at: new Date(now).toISOString(),
    updated_at: new Date(now).toISOString()
  };

  const seedDeviceSession = {
    session_id: "session_demo_1",
    account_id: DEFAULT_DEMO_ACCOUNT_ID,
    app_user_id: DEFAULT_DEMO_USER_ID,
    user_agent: "seed-script",
    last_seen_at: new Date(now).toISOString(),
    created_at: new Date(now).toISOString()
  };

  const statusScenarios = [
    {
      purchase_id: "purchase-1",
      status: "deal_found",
      merchant: "Walmart",
      title: "Noise Cancelling Headphones",
      hoursAgo: 2,
      totalPaid: 299.99,
      deliveryDays: 3,
      windowHours: 10,
      windowEstimated: false,
      windowConfidence: 0.98,
      extractionConfidence: 0.92,
      itemCount: 1
    },
    {
      purchase_id: "purchase-2",
      status: "window_closing",
      merchant: "TechMart",
      title: "Mechanical Keyboard Bundle",
      hoursAgo: 5,
      totalPaid: 549.99,
      deliveryDays: 2,
      windowHours: 6,
      windowEstimated: false,
      windowConfidence: 0.95,
      extractionConfidence: 0.9,
      itemCount: 3
    },
    {
      purchase_id: "purchase-3",
      status: "monitoring",
      merchant: "FashionHub",
      title: "Designer Jacket",
      hoursAgo: 24,
      totalPaid: 199.99,
      deliveryDays: 5,
      windowHours: 48,
      windowEstimated: true,
      windowConfidence: 0.7,
      extractionConfidence: 0.87,
      itemCount: 1
    },
    {
      purchase_id: "purchase-4",
      status: "swap_in_progress",
      merchant: "HomeGoods",
      title: "Espresso Machine",
      hoursAgo: 30,
      totalPaid: 329.0,
      deliveryDays: 4,
      windowHours: 20,
      windowEstimated: false,
      windowConfidence: 0.91,
      extractionConfidence: 0.89,
      itemCount: 2
    },
    {
      purchase_id: "purchase-5",
      status: "swap_completed",
      merchant: "BookBarn",
      title: "Textbook Order",
      hoursAgo: 72,
      totalPaid: 124.99,
      deliveryDays: -1,
      windowHours: 0,
      windowEstimated: false,
      windowConfidence: 1,
      extractionConfidence: 0.93,
      itemCount: 4
    },
    {
      purchase_id: "purchase-6",
      status: "expired",
      merchant: "Electronics Plus",
      title: "Gaming Monitor",
      hoursAgo: 96,
      totalPaid: 399.99,
      deliveryDays: 1,
      windowHours: 0,
      windowEstimated: false,
      windowConfidence: 1,
      extractionConfidence: 0.95,
      itemCount: 1
    },
    {
      purchase_id: "purchase-7",
      status: "needs_review",
      merchant: "SportsWorld",
      title: "Running Shoes",
      hoursAgo: 12,
      totalPaid: 129.99,
      deliveryDays: 6,
      windowHours: 36,
      windowEstimated: false,
      windowConfidence: 0.82,
      extractionConfidence: 0.61,
      itemCount: 1,
      issues: ["low_confidence", "missing_order_id"]
    },
    {
      purchase_id: "purchase-8",
      status: "paused",
      merchant: "GadgetZone",
      title: "Wireless Earbuds",
      hoursAgo: 48,
      totalPaid: 79.99,
      deliveryDays: 3,
      windowHours: 72,
      windowEstimated: false,
      windowConfidence: 0.93,
      extractionConfidence: 0.9,
      itemCount: 1
    },
    {
      purchase_id: "purchase-9",
      status: "deal_found",
      merchant: "Wayfair",
      title: "Office Chair",
      hoursAgo: 6,
      totalPaid: 249.99,
      deliveryDays: 7,
      windowHours: 12,
      windowEstimated: false,
      windowConfidence: 0.96,
      extractionConfidence: 0.94,
      itemCount: 1
    },
    {
      purchase_id: "purchase-10",
      status: "window_closing",
      merchant: "BeautyShop",
      title: "Skincare Set",
      hoursAgo: 1,
      totalPaid: 59.99,
      deliveryDays: 2,
      windowHours: 2,
      windowEstimated: true,
      windowConfidence: 0.68,
      extractionConfidence: 0.84,
      itemCount: 1
    },
    {
      purchase_id: "purchase-11",
      status: "monitoring",
      merchant: "PetCentral",
      title: "Automatic Pet Feeder",
      hoursAgo: 18,
      totalPaid: 139.5,
      deliveryDays: 4,
      windowHours: 30,
      windowEstimated: true,
      windowConfidence: 0.74,
      extractionConfidence: 0.88,
      itemCount: 1
    },
    {
      purchase_id: "purchase-12",
      status: "swap_in_progress",
      merchant: "KitchenPro",
      title: "Blender Bundle",
      hoursAgo: 20,
      totalPaid: 189.0,
      deliveryDays: 5,
      windowHours: 14,
      windowEstimated: false,
      windowConfidence: 0.9,
      extractionConfidence: 0.9,
      itemCount: 2
    },
    {
      purchase_id: "purchase-13",
      status: "swap_completed",
      merchant: "OutdoorLife",
      title: "Camping Stove",
      hoursAgo: 120,
      totalPaid: 94.99,
      deliveryDays: -2,
      windowHours: 0,
      windowEstimated: false,
      windowConfidence: 1,
      extractionConfidence: 0.92,
      itemCount: 1
    },
    {
      purchase_id: "purchase-14",
      status: "expired",
      merchant: "PhotoWorld",
      title: "Camera Tripod",
      hoursAgo: 140,
      totalPaid: 69.0,
      deliveryDays: 1,
      windowHours: 0,
      windowEstimated: false,
      windowConfidence: 1,
      extractionConfidence: 0.9,
      itemCount: 1
    },
    {
      purchase_id: "purchase-15",
      status: "needs_review",
      merchant: "GameHub",
      title: "Gaming Mouse",
      hoursAgo: 14,
      totalPaid: 89.99,
      deliveryDays: 3,
      windowHours: 24,
      windowEstimated: true,
      windowConfidence: 0.6,
      extractionConfidence: 0.58,
      itemCount: 1,
      issues: ["merchant_not_supported", "captcha_blocked"]
    },
    {
      purchase_id: "purchase-16",
      status: "paused",
      merchant: "CraftDepot",
      title: "3D Printing Filament Pack",
      hoursAgo: 36,
      totalPaid: 44.99,
      deliveryDays: 2,
      windowHours: 40,
      windowEstimated: false,
      windowConfidence: 0.89,
      extractionConfidence: 0.86,
      itemCount: 3
    }
  ];

  function buildItems(scenario) {
    if (scenario.itemCount === 1) {
      return [
        {
          title: scenario.title,
          attributes: { category: "General", condition: "New" },
          quantity: 1,
          price_minor: toMinor(scenario.totalPaid)
        }
      ];
    }

    const basePrice = Number((scenario.totalPaid / scenario.itemCount).toFixed(2));
    const items = [];
    for (let index = 0; index < scenario.itemCount; index += 1) {
      items.push({
        title: `${scenario.title} Item ${index + 1}`,
        attributes: { bundle: "true", index: String(index + 1) },
        quantity: 1,
        price_minor:
          index === scenario.itemCount - 1
            ? toMinor(scenario.totalPaid - basePrice * (scenario.itemCount - 1))
            : toMinor(basePrice)
      });
    }
    return items;
  }

  const statusSupportsDeals = new Set([
    "deal_found",
    "window_closing",
    "swap_in_progress",
    "swap_completed"
  ]);
  let dealSequence = 1;
  let eventSequence = 1;

  const purchaseRows = statusScenarios.map((scenario) => {
    const purchaseTime = new Date(now - scenario.hoursAgo * 60 * 60 * 1000).toISOString();
    const deliveryEstimate = new Date(
      now + scenario.deliveryDays * 24 * 60 * 60 * 1000
    ).toISOString();
    const remainingSeconds = scenario.windowHours * 60 * 60;
    const cancellationWindowEnd = new Date(now + remainingSeconds * 1000).toISOString();
    const monitoringEnabled = scenario.status !== "paused";
    const orderId =
      scenario.status === "needs_review"
        ? undefined
        : `ORDER-${scenario.purchase_id.replace("purchase-", "").padStart(5, "0")}`;

    const purchase = {
      purchase_id: scenario.purchase_id,
      account_id: DEFAULT_DEMO_ACCOUNT_ID,
      merchant: scenario.merchant,
      primary_item_title: scenario.title,
      purchase_time: purchaseTime,
      currency: "USD",
      country: "US",
      total_paid_minor: toMinor(scenario.totalPaid),
      delivery_estimate_at: deliveryEstimate,
      cancellation_window_confidence: scenario.windowConfidence,
      cancellation_window_end: cancellationWindowEnd,
      cancellation_window_inferred: scenario.windowEstimated,
      status: scenario.status,
      monitoring_enabled: monitoringEnabled,
      extraction_confidence_score: scenario.extractionConfidence,
      issues: scenario.issues,
      order_id: orderId,
      item_count: scenario.itemCount,
      last_scan_at: new Date(now - 15 * 60 * 1000).toISOString(),
      created_at: new Date(now).toISOString(),
      updated_at: new Date(now).toISOString()
    };

    const deals = statusSupportsDeals.has(scenario.status)
      ? [
          {
            deal_id: `deal-${dealSequence++}`,
            account_id: DEFAULT_DEMO_ACCOUNT_ID,
            purchase_id: scenario.purchase_id,
            merchant_or_seller: `${scenario.merchant} Marketplace`,
            listing_url: `https://example.com/${scenario.purchase_id}/deal`,
            match_tier: scenario.status === "deal_found" ? "exact" : "attribute",
            base_price_minor: toMinor(scenario.totalPaid * 0.82),
            shipping_minor: toMinor(4.99),
            tax_estimate_minor: toMinor(scenario.totalPaid * 0.06),
            total_price_minor: toMinor(scenario.totalPaid * 0.9),
            delivery_estimate_at: new Date(
              now + 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
            return_policy_summary: "Standard returns within 30 days.",
            coupon: { code: "AFTERSAVE10", auto_apply_flag: true },
            reliability_score: 0.91,
            net_savings_minor: toMinor(scenario.totalPaid * 0.1),
            savings_percentage: 10,
            last_checked_at: new Date(now - 7 * 60 * 1000).toISOString(),
            in_stock_flag: true,
            stock_confidence: 0.9,
            cross_border: false,
            created_at: new Date(now).toISOString(),
            updated_at: new Date(now).toISOString()
          }
        ]
      : [];

    const auditEvents = [
      {
        audit_event_id: `ev-${eventSequence++}`,
        account_id: DEFAULT_DEMO_ACCOUNT_ID,
        type: "purchase_detected",
        timestamp: new Date(now - (scenario.hoursAgo + 0.2) * 60 * 60 * 1000).toISOString(),
        label: `Purchase detected from ${scenario.merchant}`,
        detail: `Status set to ${scenario.status}.`,
        created_at: new Date(now).toISOString()
      }
    ];

    if (deals.length > 0) {
      auditEvents.push({
        audit_event_id: `ev-${eventSequence++}`,
        account_id: DEFAULT_DEMO_ACCOUNT_ID,
        type: "deals_evaluated",
        timestamp: new Date(now - 12 * 60 * 1000).toISOString(),
        label: "Replacement deals evaluated",
        detail: `Found ${deals.length} candidate deal(s).`,
        created_at: new Date(now).toISOString()
      });
    }

    if (scenario.status === "swap_in_progress") {
      auditEvents.push({
        audit_event_id: `ev-${eventSequence++}`,
        account_id: DEFAULT_DEMO_ACCOUNT_ID,
        type: "swap_step_completed",
        timestamp: new Date(now - 9 * 60 * 1000).toISOString(),
        label: "Swap initiated with merchant",
        detail: "Cancellation requested and replacement checkout started.",
        created_at: new Date(now).toISOString()
      });
    }

    if (scenario.status === "swap_completed") {
      auditEvents.push({
        audit_event_id: `ev-${eventSequence++}`,
        account_id: DEFAULT_DEMO_ACCOUNT_ID,
        type: "swap_completed",
        timestamp: new Date(now - 20 * 60 * 1000).toISOString(),
        label: "Swap completed successfully",
        detail: "Original order canceled and replacement order placed.",
        created_at: new Date(now).toISOString()
      });
    }

    if (scenario.status === "needs_review") {
      auditEvents.push({
        audit_event_id: `ev-${eventSequence++}`,
        account_id: DEFAULT_DEMO_ACCOUNT_ID,
        type: "swap_failed",
        timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
        label: "Manual review required",
        detail: "Automation paused due to extraction/merchant issues.",
        created_at: new Date(now).toISOString()
      });
    }

    const swapExecution =
      scenario.status === "swap_in_progress" || scenario.status === "swap_completed"
        ? {
            swap_execution_id: `swap-${scenario.purchase_id}`,
            account_id: DEFAULT_DEMO_ACCOUNT_ID,
            purchase_id: scenario.purchase_id,
            selected_deal_id: deals[0]?.deal_id || `deal-${scenario.purchase_id}`,
            mode: "semi_automated",
            sequence_policy: "buy_second_cancel_first",
            status:
              scenario.status === "swap_completed"
                ? "completed"
                : "executing",
            acknowledgement_checked: true,
            final_start_confirmed: true,
            started_at: new Date(now - 10 * 60 * 1000).toISOString(),
            completed_at:
              scenario.status === "swap_completed"
                ? new Date(now - 5 * 60 * 1000).toISOString()
                : undefined,
            created_at: new Date(now).toISOString(),
            updated_at: new Date(now).toISOString()
          }
        : null;

    const merchantReliability = {
      merchant_reliability_id: `mr-${scenario.merchant
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")}`,
      account_id: DEFAULT_DEMO_ACCOUNT_ID,
      merchant_key: scenario.merchant.toLowerCase().replace(/\s+/g, "_"),
      country: "US",
      reliability_score: scenario.status === "needs_review" ? 0.62 : 0.9,
      captcha_events_lookback_count:
        scenario.issues?.includes("captcha_blocked") ? 1 : 0,
      ui_drift_events_lookback_count: scenario.status === "needs_review" ? 1 : 0,
      successful_navigation_rate: scenario.status === "needs_review" ? 0.7 : 0.94,
      updated_at: new Date(now).toISOString()
    };

    return {
      purchase,
      items: buildItems(scenario),
      deals,
      auditEvents,
      swapExecution,
      merchantReliability
    };
  });

  const [firstPurchaseRow, ...otherPurchaseRows] = purchaseRows;

  return [
    {
      seedUser,
      seedAccount,
      seedMembership,
      seedProfile,
      seedSettings,
      seedUserPreferences,
      seedBillingProfile,
      seedDeviceSession,
      ...firstPurchaseRow
    },
    ...otherPurchaseRows
  ];
}

const FALLBACK_SAMPLE_DATA = makeSampleSeedData();

function toBestDealSummary(deals) {
  if (!deals.length) return undefined;
  const bestDeal = [...deals].sort(
    (a, b) => b.net_savings_minor - a.net_savings_minor
  )[0];
  return {
    best_net_savings: toMajor(bestDeal.net_savings_minor),
    best_savings_pct: bestDeal.savings_percentage,
    best_deal_total_price: toMajor(bestDeal.total_price_minor),
    best_deal_merchant: bestDeal.merchant_or_seller,
    last_scan_at: bestDeal.last_checked_at
  };
}

function toListItem(purchase, deals) {
  const cancellationWindowRemaining = purchase.cancellation_window_end
    ? Math.max(
        0,
        Math.floor(
          (new Date(purchase.cancellation_window_end).getTime() - Date.now()) / 1000
        )
      )
    : undefined;

  return {
    purchase_id: purchase.purchase_id,
    merchant: purchase.merchant,
    primary_item_title: purchase.primary_item_title,
    purchase_time: purchase.purchase_time,
    currency: purchase.currency || "USD",
    total_paid: toMajor(purchase.total_paid_minor),
    delivery_estimate: resolveDeliveryEstimate(purchase),
    cancellation_window_remaining: cancellationWindowRemaining,
    cancellation_window_estimated: purchase.cancellation_window_inferred,
    cancellation_window_confidence: purchase.cancellation_window_confidence,
    status: purchase.status,
    best_deal_summary: toBestDealSummary(deals),
    issues: purchase.issues,
    order_id: purchase.order_id,
    item_count: purchase.item_count
  };
}

function toDetailPurchase(purchase, items) {
  return {
    purchase_id: purchase.purchase_id,
    merchant: purchase.merchant,
    order_id: purchase.order_id,
    purchase_time: purchase.purchase_time,
    country: purchase.country || "US",
    currency: purchase.currency || "USD",
    items: items.map((item) => ({
      title: item.title,
      attributes: item.attributes || {},
      quantity: item.quantity,
      price: toMajor(item.price_minor)
    })),
    delivery_estimate: resolveDeliveryEstimate(purchase),
    cancellation_window: {
      end: purchase.cancellation_window_end || new Date().toISOString(),
      inferred: Boolean(purchase.cancellation_window_inferred)
    },
    extraction_confidence_score:
      purchase.extraction_confidence_score == null
        ? 1
        : purchase.extraction_confidence_score,
    monitoring_enabled: purchase.monitoring_enabled !== false,
    last_scan_at: purchase.last_scan_at
  };
}

function toDealResponse(deal) {
  return {
    deal_id: deal.deal_id,
    merchant_or_seller: deal.merchant_or_seller,
    listing_url: deal.listing_url,
    match_tier: toLegacyMatchTier(deal.match_tier),
    base_price: toMajor(deal.base_price_minor),
    shipping: toMajor(deal.shipping_minor),
    tax_estimate: toMajor(deal.tax_estimate_minor),
    total_price: toMajor(deal.total_price_minor),
    delivery_estimate: resolveDeliveryEstimate(deal),
    return_policy_summary: deal.return_policy_summary,
    coupon: deal.coupon,
    reliability_score: deal.reliability_score,
    net_savings: toMajor(deal.net_savings_minor),
    savings_percentage: deal.savings_percentage,
    last_checked_at: deal.last_checked_at,
    in_stock_flag: deal.in_stock_flag,
    stock_confidence: deal.stock_confidence,
    cross_border: deal.cross_border
  };
}

function toAuditEventResponse(event) {
  return {
    id: event.audit_event_id || event.id,
    type: event.type,
    timestamp: event.timestamp,
    label: event.label,
    detail: event.detail
  };
}

async function seedSampleData() {
  const seedRows = makeSampleSeedData();
  const root = seedRows[0];

  const [existingPurchases, existingItems, existingDeals, existingEvents, existingSwaps, existingReliability, existingPrefs] =
    await Promise.all([
      listByField("purchases", "account_id", DEFAULT_DEMO_ACCOUNT_ID),
      listByField("purchase_items", "account_id", DEFAULT_DEMO_ACCOUNT_ID),
      listByField("deal_candidates", "account_id", DEFAULT_DEMO_ACCOUNT_ID),
      listByField("audit_events", "account_id", DEFAULT_DEMO_ACCOUNT_ID),
      listByField("swap_executions", "account_id", DEFAULT_DEMO_ACCOUNT_ID),
      listByField("merchant_reliability", "account_id", DEFAULT_DEMO_ACCOUNT_ID),
      listByField("user_preferences", "account_id", DEFAULT_DEMO_ACCOUNT_ID)
    ]);

  const wipeTx = [];
  for (const row of existingItems) wipeTx.push(db.tx.purchase_items[row.id].delete());
  for (const row of existingDeals) wipeTx.push(db.tx.deal_candidates[row.id].delete());
  for (const row of existingEvents) wipeTx.push(db.tx.audit_events[row.id].delete());
  for (const row of existingSwaps) wipeTx.push(db.tx.swap_executions[row.id].delete());
  for (const row of existingReliability)
    wipeTx.push(db.tx.merchant_reliability[row.id].delete());
  for (const row of existingPrefs) wipeTx.push(db.tx.user_preferences[row.id].delete());
  for (const row of existingPurchases) wipeTx.push(db.tx.purchases[row.id].delete());

  if (wipeTx.length > 0) {
    await db.transact(wipeTx);
  }

  const txChunks = [
    db.tx.app_users[id()].update(root.seedUser),
    db.tx.accounts[id()].update(root.seedAccount),
    db.tx.account_memberships[id()].update(root.seedMembership),
    db.tx.account_profiles[id()].update(root.seedProfile),
    db.tx.account_settings[id()].update(root.seedSettings),
    db.tx.user_preferences[id()].update(root.seedUserPreferences),
    db.tx.billing_profiles[id()].update(root.seedBillingProfile),
    db.tx.device_sessions[id()].update(root.seedDeviceSession)
  ];

  for (const row of seedRows) {
    txChunks.push(db.tx.purchases[id()].update(row.purchase));
    txChunks.push(db.tx.merchant_reliability[id()].update(row.merchantReliability));
    for (const item of row.items) {
      txChunks.push(
        db.tx.purchase_items[id()].update({
          purchase_item_id: `${row.purchase.purchase_id}_${item.title}`
            .toLowerCase()
            .replace(/\s+/g, "_"),
          account_id: row.purchase.account_id,
          purchase_id: row.purchase.purchase_id,
          created_at: nowIso(),
          updated_at: nowIso(),
          ...item
        })
      );
    }
    for (const deal of row.deals) {
      txChunks.push(
        db.tx.deal_candidates[id()].update({
          purchase_id: row.purchase.purchase_id,
          ...deal
        })
      );
    }
    if (row.swapExecution) {
      txChunks.push(db.tx.swap_executions[id()].update(row.swapExecution));
    }
    for (const event of row.auditEvents) {
      txChunks.push(
        db.tx.audit_events[id()].update({
          purchase_id: row.purchase.purchase_id,
          ...event
        })
      );
    }
  }

  await db.transact(txChunks);

  return { seeded: true, replaced: existingPurchases.length, added: seedRows.length };
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    instant_app_id: INSTANT_APP_ID,
    admin_token_configured: Boolean(INSTANT_ADMIN_TOKEN),
    default_demo_account_id: DEFAULT_DEMO_ACCOUNT_ID
  });
});

app.post("/api/seed", requireAdminToken, async (req, res) => {
  try {
    const result = await seedSampleData();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to seed data" });
  }
});

app.get("/api/purchases", async (req, res) => {
  try {
    if (!INSTANT_ADMIN_TOKEN) {
      const fallbackPurchases = FALLBACK_SAMPLE_DATA.map((entry) => entry.purchase);
      const fallbackDeals = FALLBACK_SAMPLE_DATA.flatMap((entry) => entry.deals || []);
      const dealsByPurchaseId = fallbackDeals.reduce((acc, deal) => {
        const dealPurchaseId = deal.purchase_id;
        if (!acc[dealPurchaseId]) acc[dealPurchaseId] = [];
        acc[dealPurchaseId].push(deal);
        return acc;
      }, {});

      const fallbackResult = fallbackPurchases
        .map((purchase) =>
          toListItem(purchase, dealsByPurchaseId[purchase.purchase_id] || [])
        )
        .sort(
          (a, b) =>
            new Date(b.purchase_time).getTime() - new Date(a.purchase_time).getTime()
        );

      res.json({
        account_id: DEFAULT_DEMO_ACCOUNT_ID,
        purchases: fallbackResult,
        mode: "fallback_sample_data"
      });
      return;
    }

    const context = await resolveRequestContext(req);
    const purchasesResponse = await db.query({
      purchases: {
        $: { where: { account_id: context.account_id } }
      }
    });
    const dealsResponse = await db.query({
      deal_candidates: {
        $: { where: { account_id: context.account_id } }
      }
    });
    const purchases = rowsFromQuery(purchasesResponse, "purchases");
    const deals = rowsFromQuery(dealsResponse, "deal_candidates");

    const dealsByPurchaseId = deals.reduce((acc, deal) => {
      const dealPurchaseId = deal.purchase_id;
      if (!acc[dealPurchaseId]) acc[dealPurchaseId] = [];
      acc[dealPurchaseId].push(deal);
      return acc;
    }, {});

    const result = purchases
      .map((purchase) =>
        toListItem(purchase, dealsByPurchaseId[purchase.purchase_id] || [])
      )
      .sort(
        (a, b) =>
          new Date(b.purchase_time).getTime() - new Date(a.purchase_time).getTime()
      );

    res.json({ account_id: context.account_id, purchases: result });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch purchases" });
  }
});

app.get("/api/purchases/:purchaseId", async (req, res) => {
  try {
    const { purchaseId } = req.params;

    if (!INSTANT_ADMIN_TOKEN) {
      const fallbackMatch = FALLBACK_SAMPLE_DATA.find(
        (entry) => entry.purchase.purchase_id === purchaseId
      );
      if (!fallbackMatch) {
        res.status(404).json({ error: "Purchase not found" });
        return;
      }

      const fallbackDeals = [...(fallbackMatch.deals || [])]
        .sort((a, b) => b.net_savings_minor - a.net_savings_minor)
        .map(toDealResponse);
      const fallbackAuditEvents = [...(fallbackMatch.auditEvents || [])]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .map(toAuditEventResponse);

      res.json({
        account_id: DEFAULT_DEMO_ACCOUNT_ID,
        status: fallbackMatch.purchase.status,
        purchase: toDetailPurchase(fallbackMatch.purchase, fallbackMatch.items || []),
        deals: fallbackDeals,
        auditEvents: fallbackAuditEvents,
        mode: "fallback_sample_data"
      });
      return;
    }

    const context = await resolveRequestContext(req);
    const [purchaseResponse, dealsResponse, itemsResponse, eventsResponse] =
      await Promise.all([
        db.query({
          purchases: {
            $: { where: { purchase_id: purchaseId, account_id: context.account_id } }
          }
        }),
        db.query({
          deal_candidates: {
            $: { where: { purchase_id: purchaseId, account_id: context.account_id } }
          }
        }),
        db.query({
          purchase_items: {
            $: { where: { purchase_id: purchaseId, account_id: context.account_id } }
          }
        }),
        db.query({
          audit_events: {
            $: { where: { purchase_id: purchaseId, account_id: context.account_id } }
          }
        })
      ]);

    const purchase = rowsFromQuery(purchaseResponse, "purchases")[0];
    if (!purchase) {
      res.status(404).json({ error: "Purchase not found" });
      return;
    }

    const deals = rowsFromQuery(dealsResponse, "deal_candidates")
      .sort((a, b) => b.net_savings_minor - a.net_savings_minor)
      .map(toDealResponse);
    const items = rowsFromQuery(itemsResponse, "purchase_items");
    const auditEvents = rowsFromQuery(eventsResponse, "audit_events")
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .map(toAuditEventResponse);

    res.json({
      account_id: context.account_id,
      status: purchase.status,
      purchase: toDetailPurchase(purchase, items),
      deals,
      auditEvents
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: error.message || "Failed to fetch purchase details" });
  }
});

app.patch(
  "/api/purchases/:purchaseId/monitoring",
  requireAdminToken,
  async (req, res) => {
    try {
      const { purchaseId } = req.params;
      const context = await resolveRequestContext(req);
      const { monitoring_enabled: monitoringEnabled } = req.body || {};

      if (typeof monitoringEnabled !== "boolean") {
        res
          .status(400)
          .json({ error: "`monitoring_enabled` must be a boolean value." });
        return;
      }

      const recordResponse = await db.query({
        purchases: {
          $: {
            where: { purchase_id: purchaseId, account_id: context.account_id }
          }
        }
      });
      const record = rowsFromQuery(recordResponse, "purchases")[0];

      if (!record) {
        res.status(404).json({ error: "Purchase not found" });
        return;
      }

      await db.transact(
        db.tx.purchases[record.id].update({
          monitoring_enabled: monitoringEnabled,
          status: monitoringEnabled ? record.status : "paused",
          updated_at: nowIso()
        })
      );

      res.json({ ok: true });
    } catch (error) {
      res
        .status(500)
        .json({ error: error.message || "Failed to update monitoring state" });
    }
  }
);

app.post("/api/auth/register", requireAdminToken, async (req, res) => {
  try {
    const { instant_user_id: instantUserId, email, full_name: fullName } =
      req.body || {};
    if (!instantUserId || !email) {
      res.status(400).json({
        error: "`instant_user_id` and `email` are required."
      });
      return;
    }

    const normalizedEmail = String(email).toLowerCase();
    let user = await findByField("app_users", "instant_user_id", instantUserId);
    const timestamp = nowIso();

    if (!user) {
      const newUser = {
        user_id: `user_${id()}`,
        instant_user_id: instantUserId,
        email: normalizedEmail,
        full_name: fullName || null,
        status: "active",
        created_at: timestamp,
        updated_at: timestamp,
        last_login_at: timestamp
      };
      await db.transact(db.tx.app_users[id()].update(newUser));
      user = newUser;
    } else {
      await db.transact(
        db.tx.app_users[user.id].update({
          email: normalizedEmail,
          full_name: fullName || user.full_name || null,
          last_login_at: timestamp,
          updated_at: timestamp
        })
      );
      user = {
        ...user,
        email: normalizedEmail,
        full_name: fullName || user.full_name || null,
        last_login_at: timestamp,
        updated_at: timestamp
      };
    }

    const memberships = await listByField(
      "account_memberships",
      "app_user_id",
      user.user_id
    );
    let membership = memberships.find((m) => m.membership_status === "active") || null;

    if (!membership) {
      // Check if demo account exists and assign user to it
      const demoAccount = await findByField(
        "accounts",
        "account_id",
        DEFAULT_DEMO_ACCOUNT_ID
      );

      let accountId;
      let accountName;

      if (demoAccount) {
        // Assign to existing demo account
        accountId = DEFAULT_DEMO_ACCOUNT_ID;
        accountName = demoAccount.name;

        // Create membership for this user in the demo account
        membership = {
          membership_id: `membership_${id()}`,
          account_id: accountId,
          app_user_id: user.user_id,
          role: "owner",
          membership_status: "active",
          invited_by_user_id: null,
          joined_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp
        };

        // Only create the membership, don't recreate the account
        await db.transact([
          db.tx.account_memberships[id()].update(membership)
        ]);
      } else {
        // Create a new account if demo doesn't exist
        accountId = `acct_${id()}`;
        accountName =
          (typeof fullName === "string" && fullName.trim()
            ? `${fullName.trim()}'s Workspace`
            : "My AfterSave Workspace");
        const account = {
          account_id: accountId,
          name: accountName,
          plan: "free",
          status: "active",
          timezone: "UTC",
          default_currency: "USD",
          country: "US",
          created_at: timestamp,
          updated_at: timestamp
        };
        membership = {
          membership_id: `membership_${id()}`,
          account_id: accountId,
          app_user_id: user.user_id,
          role: "owner",
          membership_status: "active",
          invited_by_user_id: null,
          joined_at: timestamp,
          created_at: timestamp,
          updated_at: timestamp
        };

        const profile = {
          profile_id: `profile_${id()}`,
          account_id: accountId,
          display_name: accountName,
          support_email: normalizedEmail,
          contact_phone: null,
          billing_address: null,
          logo_url: null,
          created_at: timestamp,
          updated_at: timestamp
        };

        const settings = {
          settings_id: `settings_${id()}`,
          account_id: accountId,
          notifications: {
            email_deal_alerts: true,
            email_window_closing: true,
            weekly_digest: true
          },
          automation_defaults: {
            allow_similar: false,
            allow_cross_border: false,
            default_execution_mode: "Manual"
          },
          privacy: {
            receipt_retention_days: 365,
            allow_analytics: true
          },
          created_at: timestamp,
          updated_at: timestamp
        };

        const billing = {
          billing_profile_id: `billing_${id()}`,
          account_id: accountId,
          provider: "manual",
          provider_customer_id: null,
          provider_subscription_id: null,
          billing_email: normalizedEmail,
          billing_status: "trialing",
          current_period_end: null,
          created_at: timestamp,
          updated_at: timestamp
        };

        await db.transact([
          db.tx.accounts[id()].update(account),
          db.tx.account_memberships[id()].update(membership),
          db.tx.account_profiles[id()].update(profile),
          db.tx.account_settings[id()].update(settings),
          db.tx.billing_profiles[id()].update(billing)
        ]);
      }
    }

    const deviceSession = {
      session_id: `session_${id()}`,
      account_id: membership.account_id,
      app_user_id: user.user_id,
      user_agent: req.header("user-agent") || null,
      ip_address: req.ip || null,
      last_seen_at: timestamp,
      revoked_at: null,
      created_at: timestamp
    };
    await db.transact(db.tx.device_sessions[id()].update(deviceSession));

    res.status(201).json({
      user_id: user.user_id,
      instant_user_id: user.instant_user_id,
      email: user.email,
      full_name: user.full_name || null,
      account_id: membership.account_id,
      role: membership.role
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to register user" });
  }
});

app.get("/api/account", requireAdminToken, async (req, res) => {
  try {
    const context = await resolveRequestContext(req);
    const [account, profile, settings, billing, sessions] = await Promise.all([
      findByField("accounts", "account_id", context.account_id),
      findByField("account_profiles", "account_id", context.account_id),
      findByField("account_settings", "account_id", context.account_id),
      findByField("billing_profiles", "account_id", context.account_id),
      listByField("device_sessions", "account_id", context.account_id)
    ]);

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    res.json({
      account,
      profile,
      settings,
      billing,
      sessions: sessions.sort(
        (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
      ),
      actor: {
        app_user_id: context.app_user_id,
        role: context.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to fetch account" });
  }
});

app.patch("/api/account/profile", requireAdminToken, async (req, res) => {
  try {
    const context = await resolveRequestContext(req);
    const profile = await findByField("account_profiles", "account_id", context.account_id);
    if (!profile) {
      res.status(404).json({ error: "Account profile not found" });
      return;
    }

    const patch = req.body || {};
    await db.transact(
      db.tx.account_profiles[profile.id].update({
        display_name:
          typeof patch.display_name === "string"
            ? patch.display_name
            : profile.display_name,
        support_email:
          typeof patch.support_email === "string"
            ? patch.support_email
            : profile.support_email,
        contact_phone:
          typeof patch.contact_phone === "string"
            ? patch.contact_phone
            : profile.contact_phone,
        logo_url:
          typeof patch.logo_url === "string" ? patch.logo_url : profile.logo_url,
        updated_at: nowIso()
      })
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update profile" });
  }
});

app.patch("/api/account/settings", requireAdminToken, async (req, res) => {
  try {
    const context = await resolveRequestContext(req);
    const settings = await findByField(
      "account_settings",
      "account_id",
      context.account_id
    );
    if (!settings) {
      res.status(404).json({ error: "Account settings not found" });
      return;
    }

    const patch = req.body || {};
    await db.transact(
      db.tx.account_settings[settings.id].update({
        notifications: patch.notifications || settings.notifications,
        automation_defaults:
          patch.automation_defaults || settings.automation_defaults,
        privacy: patch.privacy || settings.privacy,
        updated_at: nowIso()
      })
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to update settings" });
  }
});

// Export for Vercel serverless; only listen when running standalone
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, async () => {
    console.log(
      `[server] API running at http://localhost:${PORT} (Instant App: ${INSTANT_APP_ID})`
    );

    if (!INSTANT_ADMIN_TOKEN) {
      return;
    }

    try {
      const seedResult = await seedSampleData();
      if (seedResult.seeded) {
        console.log(
          `[server] Seeded ${seedResult.added} purchases into InstantDB (replaced ${seedResult.replaced}).`
        );
      }
    } catch (error) {
      console.error("[server] Failed seeding InstantDB data:", error);
    }
  });
}
