import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ViewModeState {
  viewMode: "table" | "cards";
  setViewMode: (mode: "table" | "cards") => void;
}

export const useViewMode = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: "cards",
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    {
      name: "view-mode-storage",
    }
  )
);
