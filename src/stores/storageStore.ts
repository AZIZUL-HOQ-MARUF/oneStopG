import { create } from "zustand";
import * as drive from "@/services/drive";
import type { AccountQuota } from "@/types";

interface AccountToken {
  email: string;
  accessToken: string;
  storageQuota: { used: number; limit: number; free: number };
}

interface StorageState {
  quotas: AccountQuota[];
  totalUsed: number;
  totalLimit: number;
  totalFree: number;
  isLoading: boolean;
  error: string | null;
  refreshStorage: (accounts: AccountToken[]) => Promise<void>;
  clearStorage: () => void;
}

let refreshPromise: Promise<void> | null = null;

function computeTotals(
  accounts: AccountToken[],
  quotas: AccountQuota[],
): { totalUsed: number; totalLimit: number; totalFree: number } {
  let totalUsed = 0;
  let totalLimit = 0;
  let totalFree = 0;

  for (const account of accounts) {
    const q = quotas.find((q) => q.email === account.email);
    if (q?.isConnected) {
      totalUsed += q.used;
      totalLimit += q.limit;
      totalFree += q.free;
    } else {
      totalUsed += account.storageQuota.used;
      totalLimit += account.storageQuota.limit;
      totalFree += account.storageQuota.free;
    }
  }

  return { totalUsed, totalLimit, totalFree };
}

function buildFallbackQuotas(accounts: AccountToken[]): AccountQuota[] {
  return accounts.map((a) => ({
    email: a.email,
    used: a.storageQuota.used,
    limit: a.storageQuota.limit,
    free: a.storageQuota.free,
    isConnected: true,
  }));
}

export const useStorageStore = create<StorageState>((set) => ({
  quotas: [],
  totalUsed: 0,
  totalLimit: 0,
  totalFree: 0,
  isLoading: true,
  error: null,

  refreshStorage: async (accounts: AccountToken[]) => {
    if (accounts.length === 0) {
      set({
        quotas: [],
        totalUsed: 0,
        totalLimit: 0,
        totalFree: 0,
        isLoading: false,
        error: null,
      });
      return;
    }

    if (refreshPromise) {
      await refreshPromise;
      return;
    }

    const fallback = buildFallbackQuotas(accounts);
    const fallbackTotals = computeTotals(accounts, fallback);
    set({ quotas: fallback, ...fallbackTotals, isLoading: true, error: null });

    const doRefresh = async () => {
      try {
        const results = await drive.getAllQuotas(accounts);
        const totals = computeTotals(accounts, results);
        set({ quotas: results, ...totals, isLoading: false, error: null });
      } catch (err) {
        set({
          isLoading: false,
          error:
            err instanceof Error ? err.message : "Failed to refresh storage",
        });
      } finally {
        refreshPromise = null;
      }
    };

    refreshPromise = doRefresh();
    await refreshPromise;
  },

  clearStorage: () => {
    set({
      quotas: [],
      totalUsed: 0,
      totalLimit: 0,
      totalFree: 0,
      isLoading: false,
      error: null,
    });
  },
}));
