"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useStorageStore } from "@/stores/storageStore";
import { toast } from "sonner";

export function useStorage() {
  const { accounts, getToken } = useAccounts();
  const { quotas, totalUsed, totalLimit, totalFree, isLoading, error, refreshStorage } =
    useStorageStore();
  const lastError = useRef<string | null>(null);

  const accountEmails = useMemo(
    () => accounts.map((a) => a.email).join(","),
    [accounts],
  );

  useEffect(() => {
    if (accounts.length === 0) return;

    const loadWithTokens = async () => {
      const tokenAccounts = await Promise.all(
        accounts.map(async (a) => {
          try {
            const token = await getToken(a.email);
            return {
              email: a.email,
              accessToken: token,
              storageQuota: a.storageQuota,
            };
          } catch {
            return {
              email: a.email,
              accessToken: a.accessToken,
              storageQuota: a.storageQuota,
            };
          }
        }),
      );
      refreshStorage(tokenAccounts);
    };

    loadWithTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountEmails, refreshStorage]);

  useEffect(() => {
    if (error && error !== lastError.current) {
      toast.error("Storage sync failed", { description: error });
    }
    lastError.current = error;
  }, [error]);

  const refresh = useCallback(async () => {
    const tokenAccounts = await Promise.all(
      accounts.map(async (a) => {
        try {
          const token = await getToken(a.email);
          return {
            email: a.email,
            accessToken: token,
            storageQuota: a.storageQuota,
          };
        } catch {
          return {
            email: a.email,
            accessToken: a.accessToken,
            storageQuota: a.storageQuota,
          };
        }
      }),
    );
    refreshStorage(tokenAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountEmails, refreshStorage, getToken]);

  return { quotas, totalUsed, totalLimit, totalFree, isLoading, refreshStorage: refresh };
}
