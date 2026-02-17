import { createContext, useContext } from "react";

export interface InstantAuthContextValue {
  isLoading: boolean;
  isRegistering: boolean;
  user: { id: string; email: string | null } | null;
  accountId: string | null;
  error: string | null;
  signOut: () => Promise<void>;
}

export const InstantAuthContext = createContext<InstantAuthContextValue | null>(null);

export function useInstantAuth() {
  const context = useContext(InstantAuthContext);
  if (!context) {
    throw new Error("useInstantAuth must be used within InstantAuthProvider.");
  }
  return context;
}
