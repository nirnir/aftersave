# AfterSave

AfterSave is now set up as a full-stack app:
- Frontend: React + Vite
- Backend API: Express (`server/index.cjs`)
- Database: InstantDB

## Setup

1. Copy env vars:
   - `cp .env.example .env`
2. Add your InstantDB admin token in `.env`:
   - `INSTANT_ADMIN_TOKEN=...`
3. Install dependencies:
   - `npm install`

## Run

- Start frontend + backend together:
  - `npm run dev:fullstack`
- Frontend URL:
  - `http://localhost:5173`
- Backend health check:
  - `http://localhost:8787/api/health`

## Notes

- The backend auto-seeds sample records into InstantDB if the `purchases` namespace is empty.
- Instant app ID defaults to:
  - `3e431316-67d8-4c1f-9757-73b16679832b`

## Data Model

The canonical schema is defined in `instant.schema.ts`.

### Core entities

- `app_users`: app-level user record keyed by `instant_user_id` and `email`.
- `accounts`: tenant/workspace container for all data ownership.
- `account_memberships`: user-to-account role mapping (`owner`, `admin`, `member`, `viewer`).
- `account_profiles`: account identity/contact metadata.
- `account_settings`: notifications, automation defaults, and privacy policies.
- `billing_profiles`: subscription + billing provider state.
- `device_sessions`: session/device tracking for account security and activity.
- `purchases`: purchase-level record with status, return-window, extraction, and lifecycle fields.
- `purchase_items`: normalized line items for each purchase.
- `deals`: evaluated replacement offers, pricing breakdown, and confidence.
- `audit_events`: timeline records for transparency and debugging.

### Field parity from original frontend

All frontend purchase contracts in `src/types/purchase.ts` are represented:

- `PurchaseListItem` fields map into `purchases` (+ computed best-deal summary from `deals`).
- `Purchase` detail fields map into `purchases` + `purchase_items`.
- `Deal` fields map 1:1 into `deals` (including coupon JSON and stock/reliability fields).
- `AuditEvent` fields map into `audit_events`.
- Nullability policy:
  - Required values remain required for canonical data (`merchant`, `currency`, `status`, `total_paid`).
  - Runtime-optional frontend values are optional in schema (`delivery_estimate`, `order_id`, `issues`, confidence/window metadata).
  - Structured fields use JSON types (`attributes`, `coupon`, settings/privacy objects).

### Ownership and account lifecycle

- Registration (`POST /api/auth/register`) creates:
  - `app_users` record for the Instant auth identity.
  - A default `accounts` workspace when none exists for that user.
  - Supporting `account_memberships`, `account_profiles`, `account_settings`, and `billing_profiles` rows.
  - A `device_sessions` record for session tracking.
- Purchase APIs are tenant-scoped by `account_id`:
  - Backend resolves account context using `x-account-id` and/or user identity headers (`x-instant-user-id`, `x-user-email`).
  - Reads and writes are filtered by `account_id` to prevent cross-account access.
