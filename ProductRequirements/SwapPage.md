# AfterSave – Purchase Details & Swap Deals Page Requirements

## 1. Page Overview

**Page Name:** Purchase Details ("Swap Center")
**Purpose:** Allow users to view a detected purchase, understand their cancellation/refund window, review better deals, and safely execute a swap.

This page must maximize clarity, trust, and actionable savings while preventing irreversible mistakes.

---

## 2. Core Objectives

1. Make the original purchase fully transparent (what we detected and how confident we are).
2. Clearly communicate time remaining to cancel or refund.
3. Present ranked swap opportunities based on true total savings.
4. Enable safe execution through a human-in-the-loop (HITL) flow.
5. Provide a visible audit trail of all actions.

---

## 3. Data Contracts

### 3.1 Purchase Object

Required fields:

* purchase_id
* merchant
* order_id
* purchase_time
* country
* currency
* items[]:

  * title
  * attributes (brand, model, size, color, etc.)
  * quantity
  * price
* delivery_estimate
* cancellation_window (explicit or inferred)
* extraction_confidence_score

The page must render even if confidence is low, but swaps must be blocked until key fields are confirmed.

---

### 3.2 Deal Object

Required fields:

* deal_id
* merchant_or_seller
* listing_url
* match_tier (Exact | Attribute | Similar)
* base_price
* shipping
* tax_estimate
* total_price
* delivery_estimate
* return_policy_summary (if available)
* coupon (code + auto_apply_flag)
* reliability_score
* net_savings
* savings_percentage
* last_checked_at
* in_stock_flag
* stock_confidence

Savings must always be calculated total-to-total.

---

## 4. Page Structure

### 4.1 Header (Sticky)

Must include:

* Purchase title or "Order with X items"
* Status badge (Monitoring, Deal Found, Window Closing, Swap in Progress, Completed, Expired)
* Countdown timer for cancellation window
* If inferred, label as "Estimated" with tooltip

---

### 4.2 Purchase Summary Card

Display:

* Merchant name and logo
* Order ID
* Total paid (with breakdown if available)
* Delivery estimate
* Item attributes
* Extraction confidence indicator
* "View Parsed Data" expandable section

If extraction_confidence_score < threshold:

* Show warning banner
* Require user confirmation of key fields before enabling swap

---

### 4.3 Savings Overview Strip

Display:

* Best savings found (absolute and %)
* Number of deals evaluated
* Last scan timestamp
* Monitoring toggle (On / Paused)

---

### 4.4 Deal List (Ranked)

Each deal card must show:

* Merchant or seller
* Reliability indicators
* Match tier label
* Total price (with breakdown on expand)
* Delivery estimate
* Net savings (absolute and %)
* Coupon chip (if applicable)
* "Swap to this deal" CTA
* "Why this match?" expandable explanation

Default ranking order:

1. Exact match
2. Highest net savings
3. Delivery parity (equal or faster)
4. Reliability score

Similar matches must be hidden unless user explicitly enables "Allow Similar Items".

---

## 5. Swap Flow (HITL Modal / Drawer)

Trigger: User taps "Swap to this deal".

### 5.1 Comparison View

Side-by-side comparison:

* Merchant
* Total price
* Delivery estimate
* Return policy summary
* Match tier
* Coupon application

### 5.2 Execution Sequencing

Default option:

* Buy second → Cancel first (recommended)

Optional option:

* Cancel first → Buy second

  * Requires additional confirmation
  * Requires fresh stock validation
  * Shows explicit inventory risk warning

### 5.3 Mode Selection

Available modes:

* Manual
* Semi-Automated (HITL)

Semi-Automated appears only if:

* reliability_score >= threshold
* No recent CAPTCHA failures

### 5.4 Required Confirmations

Before starting:

* Explicit acknowledgment checkbox
* Final "Start Swap" confirmation

---

## 6. Functional Requirements

### PR-01: Render Purchase

Must render all required purchase fields.
Block swaps if confidence below threshold until user confirms.

### PR-02: Countdown Logic

If known: show exact time remaining.
If inferred: show estimated label.
If expired: disable swap CTA and show guidance.

### PR-03: Deal Rendering

Must show total cost.
Must show last_checked_at.
Must compute savings total-to-total.

### PR-04: Match Tier Control

Similar matches hidden unless user opts in.

### PR-05: Swap Confirmation Gate

No navigation or automation without explicit user confirmation.

### PR-06: Automation Gating

Semi-automated mode only available if reliability threshold met.
Otherwise fallback to manual.

### PR-07: Fail-Soft Behavior

On CAPTCHA, UI drift, or stock change:

* Stop automation
* Explain issue
* Offer guided manual flow
* Log event in audit panel

### PR-08: Coupon Handling

If coupon exists:

* Provide copy-to-clipboard
* Show reminder during checkout

### PR-09: Multi-Item Orders

Support per-item swap.
Whole-order swap only if all items validated.

### PR-10: Cross-Border Handling

Suppress cross-border deals unless user opts in.
If enabled, show VAT/import warnings.

---

## 7. States

### Loading

* Skeleton UI
* "Scanning…" state with timestamp

### No Deals

* "No better deals found yet"
* Show next scan timing

### Swap In Progress

* Clear step indicator
* Real-time status updates

### Swap Completed

* Show savings summary
* Show confirmation references

---

## 8. Audit & Transparency Panel

Must include timeline of:

* Purchase detected
* Data extracted
* Deals evaluated
* Recommendation generated
* Swap steps executed
* Failures or interruptions

User must be able to expand and review details.

---

## 9. Privacy & Controls

Page must provide:

* Clear statement of what data is processed locally vs server-side
* Pause monitoring toggle
* Disconnect email session option
* Delete purchase record option

---

## 10. Analytics Events

Track at minimum:

* purchase_details_viewed
* deal_card_viewed
* swap_started
* swap_step_completed
* swap_failed
* swap_completed
* audit_opened

Include savings amount and execution mode in swap_completed event.

---

## 11. Out of Scope (V1)

* Fully autonomous swap without confirmation
* Negotiated volume discounts
* Complex subscription upsell flows

---

This specification defines the V1 implementation requirements for the Purchase Details & Swap Deals page.
