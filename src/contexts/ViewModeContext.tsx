import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ViewModeState {
  viewMode: "table" | "cards";
  showViewToggle: boolean;
  setViewMode: (mode: "table" | "cards") => void;
  setShowViewToggle: (show: boolean) => void;
}

export const useViewMode = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: "cards",
      showViewToggle: false,
      setViewMode: (mode) => set({ viewMode: mode }),
      setShowViewToggle: (show) => set({ showViewToggle: show }),
    }),
    {
      name: "view-mode-storage",
    }
  )
);
