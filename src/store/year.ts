import { create } from "zustand";
import {
  getUserPreferences,
  upsertUserPreferences,
} from "@/integrations/supabase/preferences";

type YearState = {
  year: number;
  loading: boolean;
  setYear: (y: number) => Promise<void>;
  hydrate: () => Promise<void>;
};

export const useYearStore = create<YearState>((set) => ({
  year: new Date().getFullYear(),
  loading: false,
  hydrate: async () => {
    set({ loading: true });
    try {
      const prefs = await getUserPreferences();
      if (prefs?.selected_year) set({ year: prefs.selected_year });
    } finally {
      set({ loading: false });
    }
  },
  setYear: async (y: number) => {
    set({ year: y });
    try {
      await upsertUserPreferences(y);
    } catch {
      // swallow errors but keep UI responsive
    }
  },
}));
