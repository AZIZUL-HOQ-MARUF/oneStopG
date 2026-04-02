"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useAccounts } from "@/hooks/useAccounts";
import { useFileStore } from "@/stores/fileStore";
import { toast } from "sonner";

/** How often to silently poll Drive in the background (5 min) */
const BG_POLL_INTERVAL_MS = 5 * 60 * 1000;

export function useFiles() {
  const { accounts, getToken } = useAccounts();
  const { files, isLoading, error, loadInitial, refreshFiles, silentRefresh } =
    useFileStore();
  const lastError = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const accountEmails = useMemo(
    () => accounts.map((a) => a.email).join(","),
    [accounts],
  );

  /** Build token accounts with fresh tokens */
  const buildTokenAccounts = useCallback(async () => {
    return Promise.all(
      accounts.map(async (a) => {
        try {
          const token = await getToken(a.email);
          return { email: a.email, accessToken: token };
        } catch {
          return { email: a.email, accessToken: a.accessToken };
        }
      }),
    );
  }, [accounts, getToken]);

  // Initial load
  useEffect(() => {
    if (accounts.length === 0) return;
    const load = async () => {
      const tokenAccounts = await buildTokenAccounts();
      loadInitial(tokenAccounts);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountEmails, loadInitial]);

  // Background polling + visibility-based refresh
  useEffect(() => {
    if (accounts.length === 0) return;

    const doSilentRefresh = async () => {
      const tokenAccounts = await buildTokenAccounts();
      silentRefresh(tokenAccounts);
    };

    // Start interval
    intervalRef.current = setInterval(doSilentRefresh, BG_POLL_INTERVAL_MS);

    // Refresh when tab becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        doSilentRefresh();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountEmails]);

  useEffect(() => {
    if (error && error !== lastError.current) {
      toast.error("File sync failed", { description: error });
    }
    lastError.current = error;
  }, [error]);

  const refresh = useCallback(async () => {
    const tokenAccounts = await buildTokenAccounts();
    refreshFiles(tokenAccounts);
  }, [buildTokenAccounts, refreshFiles]);

  return { files, isLoading, error, refreshFiles: refresh };
}
