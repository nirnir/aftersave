## 1. Purpose & Scope

This document defines the end‑to‑end technical architecture for **AfterSave**, covering the MVP implementation across **Windows, macOS, Android**, with an extensible path for iOS. It is written to guide engineering, product, and security decisions while remaining compatible with a **bootstrapped, cost‑conscious** execution strategy.

The system is designed around a **client‑side AI browser agent** that detects purchases post‑checkout, discovers better deals within the refundable window, and assists users in executing a safe swap via **manual or semi‑automated (Human‑in‑the‑Loop)** flows.

---

## 2. Core Design Principles

1. **Local‑First Intelligence** – Purchase detection and parsing happen primarily on the client to minimize compliance risk and maximize reliability.
2. **Human‑in‑the‑Loop by Default** – No irreversible action is taken without explicit user confirmation.
3. **Adaptive Automation** – Automation depth adapts dynamically based on confidence, merchant reliability, and UI stability.
4. **Fail‑Soft, Never Fail‑Dangerous** – On uncertainty, fall back to guided manual flows.
5. **Bootstrapped Economics** – Prefer client‑side work, affiliate feeds, and targeted checks over expensive server scraping.

---

## 3. System Architecture Overview

### 3.1 High‑Level Components

**Client (Desktop & Android)**

- AfterSave App (UI)
- Background Watcher Service (persistent, survives reboot)
- Embedded Chromium Runtime
- LLM‑guided Automation Engine
- Local Secure Vault
- Notification Manager
- Audit Log

**Backend (Lean)**

- User & Device Registry
- Deal Discovery Orchestrator
- Affiliate & Partner Integrations
- Optional Coupon Intelligence
- Notification Relay (Push / Email)
- Minimal Event Store

---

## 4. Client Architecture (Desktop & Android)

### 4.1 App + Service Separation

The AfterSave client consists of two cooperating processes:

- **Background Service**
    - Starts at boot/login
    - Maintains authenticated browser contexts
    - Runs inbox monitoring scheduler
    - Triggers deal discovery
    - Sends local notifications
- **UI Application**
    - Onboarding and authentication
    - Email & merchant login flows
    - Swap execution (manual & semi‑automated)
    - Settings, preferences, audit log

This separation ensures uninterrupted monitoring while keeping user interaction explicit and controlled.

---

### 4.2 Platform Notes

**Windows**

- Windows Service + Electron/Tauri UI

**macOS**

- LaunchAgent / Login Item helper + UI app

**Android**

- Foreground service + WorkManager
- Chromium WebView or embedded engine

---

## 5. Email Purchase Detection

### 5.1 Supported Providers (MVP)

- Gmail Web
- Outlook Web (Consumer + O365)
- Yahoo Mail
- iCloud Mail
- Generic Webmail Fallback (LLM‑assisted, beta)

Architecture is **connector‑based**, allowing incremental addition of providers.

---

### 5.2 Inbox Connector Interface

Each connector implements:

- New‑message detection
- Message open/navigation
- Message body extraction
- Folder/category awareness (when available)

Connectors rely on **minimal DOM interaction**, jittered timing, and event‑based triggers to reduce provider defenses.

---

### 5.3 Receipt Classification Pipeline

**Step 1: Heuristic Filter**

- Sender domain
- Subject patterns
- Presence of price / order keywords

**Step 2: Template Match**

- Known merchant receipt templates

**Step 3: LLM Extraction (Fallback)**

- Applied only when confidence < threshold
- Runs locally when possible

**Output:** Structured `Purchase` object with confidence score.

---

## 6. Purchase Normalization Model

Canonical `Purchase` structure:

- purchase_id
- merchant
- order_id
- purchase_time
- items[]
    - title
    - attributes (brand, model, size, color, etc.)
    - quantity
    - price
- delivery_estimate
- cancellation_window (explicit or inferred)
- country / currency

This object is the sole input to deal discovery.

---

## 7. Product Matching Strategy

Matching is tiered and user‑configurable:

### Tier 1 – Exact Match

- Same SKU / UPC / MPN / URL signature

### Tier 2 – Attribute Match

- Same brand + model + key attributes

### Tier 3 – Similar / Trade‑Up

- Category similarity with constraints
- Requires explicit user opt‑in

User preferences control:

- Marketplace sellers allowed
- Used / refurbished allowed
- Minimum savings threshold
- Shipping parity requirements

---

## 8. Deal Discovery Engine

### 8.1 Orchestration Order

1. Affiliate feeds & partner APIs
2. Cached price intelligence
3. Client-side ghost browsing spot checks

Only high-value or high-confidence cases trigger deeper checks.

---

### 8.2 Regional Adaptation Layer

The Deal Discovery Engine is **region-aware by design** and adapts dynamically to the user’s country and locale.

Key behaviors:

- Prioritize **local sellers and marketplaces** per country (e.g., Amazon.de vs Amazon.com, local electronics chains, regional fashion retailers).
- Respect **regional constraints** such as currency, VAT/tax inclusion, shipping boundaries, and local return policies.
- Maintain a lightweight **Regional Seller Registry** that ranks merchants by relevance, reliability, and historical success in each geography.
- Allow LLM-guided discovery to surface **long-tail local sellers** not present in global affiliate feeds.

This ensures AfterSave surfaces *realistic, actionable alternatives* rather than theoretically cheaper but impractical options.

---

### 8.3 Promotional & Category-Specific Signals

The engine supports **category-aware promotional discovery**, enabling integration with vertical-specific promoters and deal sources.

Examples:

- Category-focused affiliates (e.g., sim racing hardware stores, photography gear specialists, gaming peripherals).
- Sponsored or boosted media feeds tied to specific verticals (opt-in, clearly labeled).
- Event-driven promotions (seasonal sales, launches, category events).

Promotional inputs are:

- Treated as **signals**, not overrides.
- Filtered through the same matching, pricing, and user-preference constraints.
- Explicitly labeled to maintain user trust and transparency.

This allows AfterSave to capture value from **deep vertical ecosystems** without compromising neutrality.

---

### 8.4 Client-Side Ghost Browsing

- Runs from user IP
- Opens specific competitor pages
- Extracts price, stock, delivery
- Sends only structured results back

This minimizes backend scraping costs and bot exposure.

---

### 8.2 Client‑Side Ghost Browsing

- Runs from user IP
- Opens specific competitor pages
- Extracts price, stock, delivery
- Sends only structured results back

This minimizes backend scraping costs and bot exposure.

---

## 9. Swap Execution Model

### 9.1 Execution Modes

- **Manual**: Links + guided overlay
- **Semi‑Automated (HITL)**: Navigation + preparation, user confirms final action

Fully automated mode is explicitly out of scope for V1.

---

### 9.2 Human‑in‑the‑Loop Contract

Before asking for user confirmation, the system must display:

- Merchant
- Order number
- Item(s)
- Price
- Action to be taken

No irreversible action is executed without explicit user interaction.

---

### 9.3 Swap Sequencing Policies

**Policy A (Recommended)**: Secure second order → cancel first

**Policy B (User‑Enabled)**: Cancel first → buy second

Policy B includes safeguards:

- Stock verification
- Checkout readiness
- Time‑boxed execution

---

## 10. Merchant Automation Engine

### 10.1 LLM‑Guided Automation

- DOM understanding + semantic element search
- Step‑by‑step planning
- State verification after each step

### 10.2 Reliability Scoring

Each merchant accumulates a dynamic score based on:

- Navigation success
- CAPTCHA frequency
- UI drift
- User interventions required

Automation depth is adjusted automatically based on this score.

---

## 11. Background Monitoring Strategy

- Adaptive polling (2–5 min default)
- Jitter + exponential backoff
- Burst monitoring after new purchase
- Quiet hours + battery‑aware modes

---

## 12. Notifications & User Surfaces

- Push notifications
- Email notifications
- In‑app Savings Inbox

All actions are mirrored into the audit log.

---

## 13. Audit Log & Trust Layer

Users can see:

- Purchases detected
- Data extracted
- Deals evaluated
- Actions prepared/executed

This is a first‑class trust feature, not debugging output.

---

## 14. Security & Data Handling

- Encrypted local storage (OS vault + encrypted DB)
- Session‑based auth preferred; credentials stored only if required
- Minimal backend data retention
- Explicit pause / logout / delete controls

---

## 15. CAPTCHA & Failure Handling

On failure:

- Stop automation immediately
- Explain issue to user
- Switch to manual guided mode
- Log reliability impact

Never retry aggressively or loop blindly.

---

## 16. Backend Architecture (Lean)

- Stateless APIs
- Deal orchestration logic
- Affiliate integrations
- Notification relay
- Minimal event store

Designed to scale slowly and cheaply.

---

## 17. iOS (Deferred Strategy)

V1 approach:

- Opportunistic sync on app open
- Apple Mail client integration where available

Background DOM monitoring is intentionally excluded due to platform constraints.

---

## 18. Phased Roadmap

**MVP**

- Desktop + Android
- Top 5 webmail providers
- Manual + semi‑automated swaps

**V1**

- Expanded merchants
- Improved matching
- Reliability scoring

**V2**

- iOS enhancement paths
- Pre‑purchase intelligence
- Capital pooling experiments

---

## 19. Key Risks & Mitigations

- UI drift → LLM + confidence gating
- Bot defenses → HITL + fail‑soft
- User trust → audit log + transparency
- Cost creep → client‑side first

---

## 20. Summary

AfterSave’s architecture deliberately balances ambition with restraint: powerful local intelligence, carefully bounded automation, and explicit human control. This enables a credible, scalable post-purchase agent without regulatory overreach or fragile infrastructure.

---

## 21. Conversation Summary – Decisions, Questions & Answers

This section summarizes the key decisions, clarifications, and constraints agreed during the technical deep-dive conversation that led to this document.

### Platforms & Scope

- **MVP platforms**: Windows, macOS, and Android (all three).
- **Desktop behavior**: AfterSave must survive reboots and run as a persistent background service (not just a tray app).
- **iOS**: Deferred. Initial strategy relies on opportunistic sync and Apple Mail integration (Options C + D), explicitly excluding always-on background webmail monitoring.

### Email Providers & Purchase Detection

- **Detection source**: Email only.
- **Email providers (MVP)**: Gmail, Outlook Web, Yahoo Mail, iCloud Mail, plus a generic webmail fallback.
- **Rationale**: While LLMs can parse almost any receipt format, reliable acquisition of email content requires provider-specific connectors. A connector-based architecture with LLM-assisted fallback was chosen to balance speed and coverage.
- **Desktop email clients**: Not in MVP, but acknowledged as a later-stage extension (e.g., Apple Mail, Outlook desktop).

### Product Matching Rules

- **Supported matching levels**:
    - Exact SKU / identifier match
    - Attribute-based match (brand, model, size, color, etc.)
    - Similar or trade-up products
- **Used / refurbished / marketplace sellers**: User-configurable preference.

### Deal Discovery Strategy

- **Primary sources**: Affiliate feeds and partner APIs.
- **Secondary source**: Client-side “ghost browsing” spot checks from the user’s IP.
- **Acceptance**: Best prices may occasionally come from non-affiliate merchants, and that is acceptable even if monetization is missed.

### Swap Execution Model

- **Supported modes (V1)**: Manual and semi-automated only.
- **Automation style**: Human-in-the-Loop (HITL) is mandatory for all irreversible actions.
- **Default swap sequencing**: User prefers *cancel first, then buy*, with very explicit communication and safeguards.
- **Alternative sequencing**: Secure/buy second then cancel first is documented as the safer recommended option.
- **User confirmation**: Required for every action.

### LLM Usage & Limitations

- **LLM role**:
    - Parsing receipts
    - Understanding unknown inbox UIs
    - Planning navigation and automation steps on merchant websites
- **Key clarification**: LLMs generalize well but are not sufficient alone. HITL, confidence gating, and merchant reliability scoring are required to make semi-automation safe and scalable.

### Merchant Automation Philosophy

- **Goal**: Work dynamically on any seller website.
- **Reality**: Achieved via LLM-guided automation plus adaptive reliability scoring, not blind trust in the model.
- **Hardcoded templates**: Minimal but expected for high-volume merchants to improve reliability.

### Background Monitoring & Performance

- **Monitoring cadence**: Adaptive. Frequency should optimize detection speed while avoiding provider blocks or bot defenses.
- **Anti-block strategy**: Minimal DOM interaction, jittered timing, exponential backoff, and fail-soft behavior.

### Credentials, Security & Privacy

- **Credential storage**: Allowed when necessary, stored securely using OS-level vaults.
- **Parsing strategy**: Whatever best supports performance and reliability, with a preference for local-first processing.
- **Audit log**: Explicitly required as a user-facing trust feature.

### Notifications

- **Surfaces**: Push notifications, email notifications, and an in-app inbox of savings opportunities.

### Business Constraints

- **Infrastructure budget**: As minimal as possible; solution must be bootstrapped-friendly.
- **CAPTCHA / bot defenses**: Acceptable friction; system should fall back to manual or guided flows and explain clearly to the user.
- **Open source requirement**: Not required; standard consumer SaaS trust model is acceptable.

---

This summary captures the explicit agreements and implicit constraints that shaped the V1 technical architecture and should be treated as part of the product’s foundational assumptions.