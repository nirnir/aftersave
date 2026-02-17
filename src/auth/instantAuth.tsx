import React, { useEffect, useMemo, useState } from "react";
import { instantDb, updateAuthHeadersState } from "./instantClient";
import { InstantAuthContext, InstantAuthContextValue } from "./useInstantAuth";

interface RegisterResponse {
  account_id: string;
}

async function registerUser(params: { instantUserId: string; email: string }): Promise<string> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      instant_user_id: params.instantUserId,
      email: params.email
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message =
      body && typeof body.error === "string"
        ? body.error
        : `Registration failed with status ${response.status}`;
    throw new Error(message);
  }

  const data = (await response.json()) as RegisterResponse;
  return data.account_id;
}

export const InstantAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = instantDb.useAuth();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = auth.user?.id;
  const userEmail = auth.user?.email ?? null;

  useEffect(() => {
    if (!auth.user) {
      setAccountId(null);
      setError(null);
      setIsRegistering(false);
      updateAuthHeadersState({
        instantUserId: null,
        email: null,
        accountId: null
      });
      return;
    }

    if (!auth.user.email) {
      setError("Signed in user is missing an email address.");
      updateAuthHeadersState({
        instantUserId: auth.user.id,
        email: null,
        accountId: null
      });
      return;
    }

    let active = true;
    setIsRegistering(true);
    setError(null);

    void registerUser({
      instantUserId: auth.user.id,
      email: auth.user.email
    })
      .then((resolvedAccountId) => {
        if (!active) return;
        setAccountId(resolvedAccountId);
        updateAuthHeadersState({
          instantUserId: auth.user!.id,
          email: auth.user!.email ?? null,
          accountId: resolvedAccountId
        });
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to initialize account session.");
        setAccountId(null);
        updateAuthHeadersState({
          instantUserId: auth.user!.id,
          email: auth.user!.email ?? null,
          accountId: null
        });
      })
      .finally(() => {
        if (!active) return;
        setIsRegistering(false);
      });

    return () => {
      active = false;
    };
  }, [userId, userEmail, auth.user]);

  const value = useMemo<InstantAuthContextValue>(
    () => ({
      isLoading: auth.isLoading,
      isRegistering,
      user: auth.user
        ? {
            id: auth.user.id,
            email: auth.user.email ?? null
          }
        : null,
      accountId,
      error: auth.error?.message || error,
      signOut: () => instantDb.auth.signOut()
    }),
    [accountId, auth.error?.message, auth.isLoading, auth.user, error, isRegistering]
  );

  return <InstantAuthContext.Provider value={value}>{children}</InstantAuthContext.Provider>;
};
