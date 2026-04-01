import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      toggleCollapsed: () => set((state) => ({ collapsed: !state.collapsed })),
      setCollapsed: (value: boolean) => set({ collapsed: value }),
    }),
    {
      name: "sidebar-collapsed",
      version: 1,
      migrate: (persisted, version) => {
        if (version === 0) {
          if (typeof persisted === "boolean") {
            return { collapsed: persisted };
          }
          if (persisted && typeof persisted === "object" && "collapsed" in persisted) {
            return persisted as SidebarState;
          }
          return { collapsed: false };
        }
        return persisted as SidebarState;
      },
    },
  ),
);
