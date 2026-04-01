import { create } from "zustand";
import * as drive from "@/services/drive";
import * as fileCache from "@/services/fileCache";
import type { FileMetadata } from "@/types";

interface AccountToken {
  email: string;
  accessToken: string;
}

interface FileState {
  files: FileMetadata[];
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number;
  refreshFiles: (accounts: AccountToken[]) => Promise<void>;
  loadInitial: (accounts: AccountToken[]) => Promise<void>;
  clearFiles: () => void;
}

/** Version counter to prevent stale writes from outdated async operations */
let version = 0;
/** In-flight fetch promise to prevent concurrent API calls */
let inFlightFetch: Promise<void> | null = null;
/** How long in-memory data is considered fresh (skip API entirely) */
const MEMORY_TTL_MS = 10 * 60 * 1000; // 10 minutes

export const useFileStore = create<FileState>((set, get) => ({
  files: [],
  isLoading: true,
  error: null,
  lastFetchedAt: 0,

  refreshFiles: async (accounts: AccountToken[]) => {
    if (accounts.length === 0) {
      set({ files: [], isLoading: false, error: null });
      return;
    }

    // Deduplicate concurrent fetches
    if (inFlightFetch) {
      await inFlightFetch;
      return;
    }

    const doFetch = async () => {
      const currentVersion = ++version;
      set({ isLoading: true, error: null });

      try {
        const allFiles: FileMetadata[] = [];

        for (const account of accounts) {
          try {
            const accountFiles = await drive.syncAllFiles(
              account.accessToken,
              account.email,
            );
            allFiles.push(...accountFiles);
            await fileCache.cacheFiles(account.email, accountFiles);
          } catch (err) {
            console.warn(`Failed to sync files for ${account.email}:`, err);
            try {
              const cached = await fileCache.getCachedFiles(account.email);
              allFiles.push(...cached);
            } catch {
              // Cache also failed
            }
          }
        }

        if (currentVersion === version) {
          set({ files: allFiles, isLoading: false, lastFetchedAt: Date.now() });
        }
      } catch (err) {
        if (currentVersion === version) {
          try {
            const cached = await fileCache.getCachedFiles();
            set({
              files: cached,
              error: err instanceof Error ? err.message : "Failed to load files",
              isLoading: false,
            });
          } catch {
            set({
              files: [],
              error: err instanceof Error ? err.message : "Failed to load files",
              isLoading: false,
            });
          }
        }
      } finally {
        inFlightFetch = null;
      }
    };

    inFlightFetch = doFetch();
    await inFlightFetch;
  },

  loadInitial: async (accounts: AccountToken[]) => {
    if (accounts.length === 0) {
      set({ files: [], isLoading: false, error: null });
      return;
    }

    const state = get();

    // If files are already loaded in memory and fresh, skip everything
    if (state.files.length > 0 && Date.now() - state.lastFetchedAt < MEMORY_TTL_MS) {
      set({ isLoading: false });
      return;
    }

    const currentVersion = ++version;

    try {
      // Show cached files immediately if memory is empty
      if (state.files.length === 0) {
        const cached = await fileCache.getCachedFiles();
        if (currentVersion === version && cached.length > 0) {
          set({ files: cached, isLoading: false });
        }
      }

      const stale = await fileCache.isCacheStale();
      if (stale && currentVersion === version) {
        const store = useFileStore.getState();
        await store.refreshFiles(accounts);
      } else if (currentVersion === version) {
        set({ isLoading: false });
      }
    } catch {
      if (currentVersion === version) {
        const store = useFileStore.getState();
        await store.refreshFiles(accounts);
      }
    }
  },

  clearFiles: () => {
    version++;
    set({ files: [], isLoading: false, error: null });
  },
}));
