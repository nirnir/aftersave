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

function firstOrNull(values) {
  return values && values.length > 0 ? values[0] : null;
}

async function findByField(entityName, fieldName, fieldValue) {
  const response = await db.query({
    [entityName]: {
      $: { where: { [fieldName]: fieldValue } }
    }
  });
  return firstOrNull(response?.data?.[entityName] || []);
}

async function listByField(entityName, fieldName, fieldValue) {
  const response = await db.query({
    [entityName]: {
      $: { where: { [fieldName]: fieldValue } }
    }
  });
  return response?.data?.[entityName] || [];
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
      const firstAccount = firstOrNull(accountsResponse?.data?.accounts || []);
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
          price: Number(scenario.totalPaid.toFixed(2))
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
        price: index === scenario.itemCount - 1
          ? Number((scenario.totalPaid - basePrice * (scenario.itemCount - 1)).toFixed(2))
          : basePrice
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
      total_paid: scenario.totalPaid,
      delivery_estimate: deliveryEstimate,
      cancellation_window_remaining: remainingSeconds,
      cancellation_window_estimated: scenario.windowEstimated,
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
            merchant_or_seller: `${scenario.merchant} Marketplace`,
            listing_url: `https://example.com/${scenario.purchase_id}/deal`,
            match_tier: scenario.status === "deal_found" ? "Exact" : "Attribute",
            base_price: Number((scenario.totalPaid * 0.82).toFixed(2)),
            shipping: 4.99,
            tax_estimate: Number((scenario.totalPaid * 0.06).toFixed(2)),
            total_price: Number((scenario.totalPaid * 0.9).toFixed(2)),
            delivery_estimate: new Date(now + 2 * 24 * 60 * 60 * 1000).toISOString(),
            return_policy_summary: "Standard returns within 30 days.",
            coupon: { code: "AFTERSAVE10", auto_apply_flag: true },
            reliability_score: 0.91,
            net_savings: Number((scenario.totalPaid * 0.1).toFixed(2)),
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
        type: "swap_step",
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
        type: "failure",
        timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
        label: "Manual review required",
        detail: "Automation paused due to extraction/merchant issues.",
        created_at: new Date(now).toISOString()
      });
    }

    return {
      purchase,
      items: buildItems(scenario),
      deals,
      auditEvents
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
  const bestDeal = [...deals].sort((a, b) => b.net_savings - a.net_savings)[0];
  return {
    best_net_savings: bestDeal.net_savings,
    best_savings_pct: bestDeal.savings_percentage,
    best_deal_total_price: bestDeal.total_price,
    best_deal_merchant: bestDeal.merchant_or_seller,
    last_scan_at: bestDeal.last_checked_at
  };
}

function toListItem(purchase, deals) {
  return {
    purchase_id: purchase.purchase_id,
    merchant: purchase.merchant,
    primary_item_title: purchase.primary_item_title,
    purchase_time: purchase.purchase_time,
    currency: purchase.currency || "USD",
    total_paid: purchase.total_paid,
    delivery_estimate: purchase.delivery_estimate,
    cancellation_window_remaining: purchase.cancellation_window_remaining,
    cancellation_window_estimated: purchase.cancellation_window_estimated,
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
      price: item.price
    })),
    delivery_estimate: purchase.delivery_estimate,
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

async function seedSampleData() {
  const existingPurchasesResponse = await db.query({
    purchases: {
      $: { where: { account_id: DEFAULT_DEMO_ACCOUNT_ID } }
    }
  });
  const existingPurchases = existingPurchasesResponse?.data?.purchases || [];
  const existingPurchaseIds = new Set(
    existingPurchases.map((purchase) => purchase.purchase_id)
  );
  const seedRows = makeSampleSeedData();
  const missingRows = seedRows.filter(
    (row) => !existingPurchaseIds.has(row.purchase.purchase_id)
  );
  const txChunks = [];

  if (missingRows.length > 0) {
    const root = seedRows[0];
    txChunks.push(db.tx.app_users[id()].update(root.seedUser));
    txChunks.push(db.tx.accounts[id()].update(root.seedAccount));
    txChunks.push(db.tx.account_memberships[id()].update(root.seedMembership));
    txChunks.push(db.tx.account_profiles[id()].update(root.seedProfile));
    txChunks.push(db.tx.account_settings[id()].update(root.seedSettings));
    txChunks.push(db.tx.billing_profiles[id()].update(root.seedBillingProfile));
    txChunks.push(db.tx.device_sessions[id()].update(root.seedDeviceSession));
  }

  for (const row of missingRows) {
    txChunks.push(db.tx.purchases[id()].update(row.purchase));
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
        db.tx.deals[id()].update({
          purchase_id: row.purchase.purchase_id,
          ...deal
        })
      );
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

  if (txChunks.length > 0) {
    await db.transact(txChunks);
  }

  return {
    seeded: missingRows.length > 0,
    added: missingRows.length,
    count: existingPurchases.length + missingRows.length
  };
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
      deals: {
        $: { where: { account_id: context.account_id } }
      }
    });
    const purchases = purchasesResponse?.data?.purchases || [];
    const deals = dealsResponse?.data?.deals || [];

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

      const fallbackDeals = [...(fallbackMatch.deals || [])].sort(
        (a, b) => b.net_savings - a.net_savings
      );
      const fallbackAuditEvents = [...(fallbackMatch.auditEvents || [])].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

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
          deals: {
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

    const purchase = purchaseResponse?.data?.purchases?.[0];
    if (!purchase) {
      res.status(404).json({ error: "Purchase not found" });
      return;
    }

    const deals = (dealsResponse?.data?.deals || []).sort(
      (a, b) => b.net_savings - a.net_savings
    );
    const items = itemsResponse?.data?.purchase_items || [];
    const auditEvents = (eventsResponse?.data?.audit_events || []).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

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
      const record = recordResponse?.data?.purchases?.[0];

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
      const accountId = `acct_${id()}`;
      const accountName =
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
        `[server] Seeded ${seedResult.added} new purchases into InstantDB (total: ${seedResult.count}).`
      );
    }
  } catch (error) {
    console.error("[server] Failed seeding InstantDB data:", error);
  }
});
