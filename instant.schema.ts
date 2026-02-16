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
      merchant_logo_url: i.string().optional(),
      order_id: i.string().optional(),
      primary_item_title: i.string().optional(),
      purchase_time: i.date().indexed(),
      country: i.string(),
      currency: i.string(),
      total_paid_minor: i.number(),
      delivery_estimate_at: i.date().optional(),
      delivery_estimate_window: i
        .json<{ start_at: string; end_at: string }>()
        .optional(),
      cancellation_window_end: i.date().optional(),
      cancellation_window_inferred: i.boolean().optional(),
      cancellation_window_confidence: i.number().optional(),
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
      price_minor: i.number(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    deal_candidates: i.entity({
      deal_id: i.string().indexed(),
      account_id: i.string().indexed(),
      purchase_id: i.string().indexed(),
      merchant_or_seller: i.string().indexed(),
      listing_url: i.string(),
      match_tier: i.string<"exact" | "attribute" | "similar">().indexed(),
      base_price_minor: i.number(),
      shipping_minor: i.number(),
      tax_estimate_minor: i.number(),
      total_price_minor: i.number(),
      delivery_estimate_at: i.date().optional(),
      delivery_estimate_window: i
        .json<{ start_at: string; end_at: string }>()
        .optional(),
      return_policy_summary: i.string().optional(),
      coupon: i
        .json<{
          code: string;
          auto_apply_flag: boolean;
        } | null>()
        .optional(),
      reliability_score: i.number(),
      net_savings_minor: i.number(),
      savings_percentage: i.number(),
      last_checked_at: i.date(),
      in_stock_flag: i.boolean(),
      stock_confidence: i.number(),
      cross_border: i.boolean(),
      ranking_explanation: i.string().optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    swap_executions: i.entity({
      swap_execution_id: i.string().indexed(),
      account_id: i.string().indexed(),
      purchase_id: i.string().indexed(),
      selected_deal_id: i.string().indexed(),
      mode: i.string<"manual" | "semi_automated">().indexed(),
      sequence_policy: i
        .string<"buy_second_cancel_first" | "cancel_first_buy_second">()
        .indexed(),
      status: i
        .string<
          | "draft"
          | "awaiting_confirmation"
          | "executing"
          | "fallback_manual"
          | "completed"
          | "failed"
          | "cancelled"
        >()
        .indexed(),
      acknowledgement_checked: i.boolean(),
      final_start_confirmed: i.boolean(),
      started_at: i.date().optional(),
      completed_at: i.date().optional(),
      fallback_reason: i.string().optional(),
      failure_reason_code: i.string().optional(),
      failure_detail: i.string().optional(),
      steps: i
        .json<
          {
            step_id: string;
            label: string;
            status: "pending" | "running" | "completed" | "failed";
            started_at?: string;
            finished_at?: string;
            detail?: string;
          }[]
        >()
        .optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    user_preferences: i.entity({
      preferences_id: i.string().indexed(),
      account_id: i.string().indexed(),
      allow_similar_items: i.boolean(),
      marketplace_sellers_allowed: i.boolean(),
      used_refurbished_allowed: i.boolean(),
      allow_cross_border: i.boolean(),
      minimum_savings_minor: i.number(),
      shipping_parity_required: i.boolean(),
      default_execution_mode: i.string<"manual" | "semi_automated">(),
      auto_open_from_notification: i.boolean().optional(),
      quiet_hours: i
        .json<{ start_local: string; end_local: string }>()
        .optional(),
      created_at: i.date(),
      updated_at: i.date()
    }),

    merchant_reliability: i.entity({
      merchant_reliability_id: i.string().indexed(),
      account_id: i.string().indexed(),
      merchant_key: i.string().indexed(),
      country: i.string().indexed(),
      reliability_score: i.number(),
      captcha_events_lookback_count: i.number(),
      ui_drift_events_lookback_count: i.number(),
      successful_navigation_rate: i.number(),
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
          | "swap_started"
          | "swap_step_completed"
          | "swap_failed"
          | "swap_completed"
          | "monitoring_paused"
          | "monitoring_resumed"
        >()
        .indexed(),
      timestamp: i.date().indexed(),
      label: i.string(),
      detail: i.string().optional(),
      actor_user_id: i.string().optional(),
      metadata: i.json<Record<string, unknown>>().optional(),
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
    dealCandidatesPurchase: {
      forward: { on: "deal_candidates", has: "one", label: "purchase" },
      reverse: { on: "purchases", has: "many", label: "deal_candidates" }
    },
    swapExecutionsPurchase: {
      forward: { on: "swap_executions", has: "one", label: "purchase" },
      reverse: { on: "purchases", has: "many", label: "swap_executions" }
    },
    auditEventsPurchase: {
      forward: { on: "audit_events", has: "one", label: "purchase" },
      reverse: { on: "purchases", has: "many", label: "audit_events" }
    },
    userPreferencesAccount: {
      forward: { on: "user_preferences", has: "one", label: "account" },
      reverse: { on: "accounts", has: "one", label: "user_preferences" }
    },
    merchantReliabilityAccount: {
      forward: { on: "merchant_reliability", has: "one", label: "account" },
      reverse: { on: "accounts", has: "many", label: "merchant_reliability" }
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
export default schema;
