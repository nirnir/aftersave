import { i } from "@instantdb/admin";

export const schema = i.schema({
  entities: {
    app_users: i.entity({
      user_id: i.string().indexed(),
      instant_user_id: i.string().indexed(),
      email: i.string().indexed(),
      full_name: i.string().optional(),
      avatar_url: i.string().optional(),
      status: i
        .string<"active" | "invited" | "suspended" | "deleted">()
        .indexed(),
      created_at: i.date(),
      updated_at: i.date(),
      last_login_at: i.date().optional()
    }),

    accounts: i.entity({
      account_id: i.string().indexed(),
      name: i.string().indexed(),
      plan: i.string<"free" | "pro" | "team" | "enterprise">().indexed(),
      status: i.string<"active" | "past_due" | "cancelled">().indexed(),
      timezone: i.string(),
      default_currency: i.string(),
      country: i.string(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    account_memberships: i.entity({
      membership_id: i.string().indexed(),
      account_id: i.string().indexed(),
      app_user_id: i.string().indexed(),
      role: i.string<"owner" | "admin" | "member" | "viewer">().indexed(),
      membership_status: i
        .string<"active" | "invited" | "revoked">()
        .indexed(),
      invited_by_user_id: i.string().optional(),
      joined_at: i.date().optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    account_profiles: i.entity({
      profile_id: i.string().indexed(),
      account_id: i.string().indexed(),
      display_name: i.string(),
      support_email: i.string().optional(),
      contact_phone: i.string().optional(),
      billing_address: i.json<Record<string, unknown>>().optional(),
      logo_url: i.string().optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    account_settings: i.entity({
      settings_id: i.string().indexed(),
      account_id: i.string().indexed(),
      notifications: i.json<{
        email_deal_alerts: boolean;
        email_window_closing: boolean;
        weekly_digest: boolean;
      }>(),
      automation_defaults: i.json<{
        allow_similar: boolean;
        allow_cross_border: boolean;
        default_execution_mode: "Manual" | "SemiAutomated";
      }>(),
      privacy: i.json<{
        receipt_retention_days: number;
        allow_analytics: boolean;
      }>(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    billing_profiles: i.entity({
      billing_profile_id: i.string().indexed(),
      account_id: i.string().indexed(),
      provider: i.string<"stripe" | "manual">().indexed(),
      provider_customer_id: i.string().optional(),
      provider_subscription_id: i.string().optional(),
      billing_email: i.string().optional(),
      billing_status: i
        .string<"trialing" | "active" | "past_due" | "cancelled">()
        .indexed(),
      current_period_end: i.date().optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    device_sessions: i.entity({
      session_id: i.string().indexed(),
      account_id: i.string().indexed(),
      app_user_id: i.string().indexed(),
      user_agent: i.string().optional(),
      ip_address: i.string().optional(),
      last_seen_at: i.date(),
      revoked_at: i.date().optional(),
      created_at: i.date()
    }),

    purchases: i.entity({
      purchase_id: i.string().indexed(),
      account_id: i.string().indexed(),
      merchant: i.string().indexed(),
      primary_item_title: i.string(),
      purchase_time: i.date().indexed(),
      country: i.string(),
      currency: i.string(),
      total_paid: i.number(),
      delivery_estimate: i.date().optional(),
      cancellation_window_remaining: i.number().optional(),
      cancellation_window_estimated: i.boolean().optional(),
      cancellation_window_confidence: i.number().optional(),
      cancellation_window_end: i.date().optional(),
      cancellation_window_inferred: i.boolean().optional(),
      status: i
        .string<
          | "monitoring"
          | "deal_found"
          | "window_closing"
          | "swap_in_progress"
          | "swap_completed"
          | "expired"
          | "needs_review"
          | "paused"
        >()
        .indexed(),
      monitoring_enabled: i.boolean(),
      extraction_confidence_score: i.number(),
      issues: i
        .json<
          (
            | "low_confidence"
            | "missing_order_id"
            | "merchant_not_supported"
            | "captcha_blocked"
            | "out_of_stock"
          )[]
        >()
        .optional(),
      order_id: i.string().optional(),
      item_count: i.number().optional(),
      last_scan_at: i.date().optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    purchase_items: i.entity({
      purchase_item_id: i.string().indexed(),
      account_id: i.string().indexed(),
      purchase_id: i.string().indexed(),
      title: i.string(),
      attributes: i.json<Record<string, string>>(),
      quantity: i.number(),
      price: i.number(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    deals: i.entity({
      deal_id: i.string().indexed(),
      account_id: i.string().indexed(),
      purchase_id: i.string().indexed(),
      merchant_or_seller: i.string().indexed(),
      listing_url: i.string(),
      match_tier: i.string<"Exact" | "Attribute" | "Similar">().indexed(),
      base_price: i.number(),
      shipping: i.number(),
      tax_estimate: i.number(),
      total_price: i.number(),
      delivery_estimate: i.date(),
      return_policy_summary: i.string().optional(),
      coupon: i
        .json<{
          code: string;
          auto_apply_flag: boolean;
        } | null>()
        .optional(),
      reliability_score: i.number(),
      net_savings: i.number(),
      savings_percentage: i.number(),
      last_checked_at: i.date(),
      in_stock_flag: i.boolean(),
      stock_confidence: i.number(),
      cross_border: i.boolean().optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    audit_events: i.entity({
      audit_event_id: i.string().indexed(),
      account_id: i.string().indexed(),
      purchase_id: i.string().indexed(),
      type: i
        .string<
          | "purchase_detected"
          | "data_extracted"
          | "deals_evaluated"
          | "recommendation_generated"
          | "swap_step"
          | "swap_completed"
          | "failure"
        >()
        .indexed(),
      timestamp: i.date().indexed(),
      label: i.string(),
      detail: i.string().optional(),
      actor_user_id: i.string().optional(),
      created_at: i.date()
    })
  },

  links: {
    membershipsAccount: {
      forward: { on: "account_memberships", has: "one", label: "account" },
      reverse: { on: "accounts", has: "many", label: "memberships" }
    },
    membershipsUser: {
      forward: { on: "account_memberships", has: "one", label: "user" },
      reverse: { on: "app_users", has: "many", label: "memberships" }
    },
    purchasesAccount: {
      forward: { on: "purchases", has: "one", label: "account" },
      reverse: { on: "accounts", has: "many", label: "purchases" }
    },
    purchaseItemsPurchase: {
      forward: { on: "purchase_items", has: "one", label: "purchase" },
      reverse: { on: "purchases", has: "many", label: "items" }
    },
    dealsPurchase: {
      forward: { on: "deals", has: "one", label: "purchase" },
      reverse: { on: "purchases", has: "many", label: "deals" }
    },
    auditEventsPurchase: {
      forward: { on: "audit_events", has: "one", label: "purchase" },
      reverse: { on: "purchases", has: "many", label: "audit_events" }
    },
    accountProfileAccount: {
      forward: { on: "account_profiles", has: "one", label: "account" },
      reverse: { on: "accounts", has: "one", label: "profile" }
    },
    accountSettingsAccount: {
      forward: { on: "account_settings", has: "one", label: "account" },
      reverse: { on: "accounts", has: "one", label: "settings" }
    },
    billingProfileAccount: {
      forward: { on: "billing_profiles", has: "one", label: "account" },
      reverse: { on: "accounts", has: "one", label: "billing_profile" }
    },
    deviceSessionAccount: {
      forward: { on: "device_sessions", has: "one", label: "account" },
      reverse: { on: "accounts", has: "many", label: "device_sessions" }
    },
    deviceSessionUser: {
      forward: { on: "device_sessions", has: "one", label: "user" },
      reverse: { on: "app_users", has: "many", label: "device_sessions" }
    }
  }
});

export type AfterSaveInstantSchema = typeof schema;
