"use client";

import { useSession } from "next-auth/react";
import { useCallback, useMemo } from "react";
import type { SessionAccount } from "@/types";

/** In-flight refresh promises by email, prevents duplicate concurrent refreshes */
const refreshCache = new Map<string, Promise<string | null>>();

export function useAccounts() {
  const { data: session, update } = useSession();
  const accounts: SessionAccount[] = useMemo(
    () => session?.connectedAccounts ?? [],
    [session?.connectedAccounts]
  );

  const getToken = useCallback(
    async (email: string): Promise<string> => {
      const account = accounts.find((a) => a.email === email);
      if (!account) throw new Error(`Account ${email} not found`);

      // Check if token is valid (5 min buffer)
      const now = Math.floor(Date.now() / 1000);
      if (now < account.expiresAt - 300) {
        return account.accessToken;
      }

      // Deduplicate concurrent refreshes for the same email
      const existing = refreshCache.get(email);
      if (existing) {
        const token = await existing;
        if (token) return token;
        throw new Error("Token refresh failed. Please re-authenticate.");
      }

      const refreshPromise = (async (): Promise<string | null> => {
        try {
          const res = await fetch(
            `/api/drive/token?email=${encodeURIComponent(email)}`,
          );
          const data = await res.json();

          if (!res.ok || data.stale) {
            return null;
          }

          // Trigger session update to reflect new tokens
          await update();

          return data.accessToken;
        } catch {
          return null;
        } finally {
          refreshCache.delete(email);
        }
      })();

      refreshCache.set(email, refreshPromise);

      const token = await refreshPromise;
      if (token) return token;
      throw new Error("Token refresh failed. Please re-authenticate.");
    },
    [accounts, update],
  );

  return {
    accounts,
    getToken,
    isAuthenticated: !!session,
    isLoading: !session,
    primaryEmail: session?.user?.email ?? null,
  };
}
