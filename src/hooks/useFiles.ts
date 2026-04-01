"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useFileStore } from "@/stores/fileStore";
import { toast } from "sonner";

export function useFiles() {
  const { accounts, getToken } = useAccounts();
  const { files, isLoading, error, loadInitial, refreshFiles } = useFileStore();
  const lastError = useRef<string | null>(null);

  const accountEmails = useMemo(
    () => accounts.map((a) => a.email).join(","),
    [accounts],
  );

  useEffect(() => {
    if (accounts.length === 0) return;

    // Build account token list with refreshed tokens
    const loadWithTokens = async () => {
      const tokenAccounts = await Promise.all(
        accounts.map(async (a) => {
          try {
            const token = await getToken(a.email);
            return { email: a.email, accessToken: token };
          } catch {
            return { email: a.email, accessToken: a.accessToken };
          }
        }),
      );
      loadInitial(tokenAccounts);
    };

    loadWithTokens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountEmails, loadInitial]);

  useEffect(() => {
    if (error && error !== lastError.current) {
      toast.error("File sync failed", { description: error });
    }
    lastError.current = error;
  }, [error]);

  const refresh = useCallback(async () => {
    const tokenAccounts = await Promise.all(
      accounts.map(async (a) => {
        try {
          const token = await getToken(a.email);
          return { email: a.email, accessToken: token };
        } catch {
          return { email: a.email, accessToken: a.accessToken };
        }
      }),
    );
    refreshFiles(tokenAccounts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountEmails, refreshFiles, getToken]);

  return { files, isLoading, error, refreshFiles: refresh };
}
