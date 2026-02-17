import { init } from "@instantdb/react";

const DEFAULT_INSTANT_APP_ID = "3e431316-67d8-4c1f-9757-73b16679832b";
const instantAppId =
  (import.meta.env.VITE_INSTANT_APP_ID as string | undefined) || DEFAULT_INSTANT_APP_ID;

export const instantDb = init({ appId: instantAppId });

interface AuthHeadersState {
  instantUserId: string | null;
  email: string | null;
  accountId: string | null;
}

const authHeadersState: AuthHeadersState = {
  instantUserId: null,
  email: null,
  accountId: null
};

export function updateAuthHeadersState(next: AuthHeadersState) {
  authHeadersState.instantUserId = next.instantUserId;
  authHeadersState.email = next.email;
  authHeadersState.accountId = next.accountId;
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  if (authHeadersState.instantUserId) {
    headers["x-instant-user-id"] = authHeadersState.instantUserId;
  }
  if (authHeadersState.email) {
    headers["x-user-email"] = authHeadersState.email;
  }
  if (authHeadersState.accountId) {
    headers["x-account-id"] = authHeadersState.accountId;
  }
  return headers;
}
