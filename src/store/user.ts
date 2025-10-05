import { create } from "zustand";
import {
  getUserData,
  upsertUserPreferences,
  updateUserOnboarding,
  UserData,
  UserProfileSetup,
} from "@/integrations/supabase/preferences";
import {
  bulkCreateIncomeCategories,
  bulkCreateExpenseCategories,
  bulkCreateAssetCategories,
  cloneCategoriesFromYear,
  createFreshYear,
  listAvailableCategoryYears,
} from "@/integrations/supabase/categories";

type UserState = {
  // Year management
  year: number;
  availableYears: number[];
  setYear: (y: number) => Promise<void>;
  refreshAvailableYears: () => Promise<void>;
  activateYear: (y: number) => Promise<void>;

  // User data
  userData: UserData | null;
  onboardingCompleted: boolean;
  onboardingLoading: boolean;
  hasHydrated: boolean;

  // Internal state
  _isHydrating: boolean;

  // Actions
  hydrate: () => Promise<void>;
  completeOnboarding: (userProfile: UserProfileSetup) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => void;
};

export const useUserStore = create<UserState>((set, get) => ({
  // Initial state
  year: new Date().getFullYear(),
  availableYears: [],
  userData: null,
  onboardingCompleted: false,
  onboardingLoading: false,
  hasHydrated: false,
  _isHydrating: false,

  // Year management
  setYear: async (y: number) => {
    set({ year: y });
    try {
      await upsertUserPreferences(y);
    } catch {
      // swallow errors but keep UI responsive
    }
  },

  refreshAvailableYears: async () => {
    const summaries = await listAvailableCategoryYears();
    const years = summaries.map((s) => s.year);
    set({ availableYears: years });
  },

  activateYear: async (
    y: number,
    sourceYear?: number,
    initialCategory?: { name: string; type: "income" | "expense" | "asset" }
  ) => {
    if (sourceYear) {
      await cloneCategoriesFromYear(y, sourceYear);
    } else if (initialCategory) {
      await createFreshYear(y, initialCategory);
    }
    await get().refreshAvailableYears();
    await get().setYear(y);
  },

  // User data management
  hydrate: async () => {
    const state = get();

    // Prevent multiple simultaneous hydration calls
    if (state._isHydrating || state.onboardingLoading) {
      return;
    }

    set({ onboardingLoading: true, _isHydrating: true });
    try {
      const userData = await getUserData();
      if (userData) {
        set({
          userData,
          year: userData.selected_year,
          onboardingCompleted: userData.onboarding_completed ?? false,
          hasHydrated: true,
        });
        await get().refreshAvailableYears();
      } else {
        // If no user data exists, mark as hydrated but onboarding not completed
        set({ hasHydrated: true });
        await get().refreshAvailableYears();
      }
    } finally {
      set({ onboardingLoading: false, _isHydrating: false });
    }
  },

  completeOnboarding: async (userProfile: UserProfileSetup) => {
    set({ onboardingLoading: true });
    try {
      const currentStep = get().userData?.onboarding_step ?? 0;
      const year = get().year;

      // Save categories to specific tables if they don't exist
      const promises = [];

      // Save income categories
      if (userProfile.incomeCategories.length > 0) {
        promises.push(
          bulkCreateIncomeCategories(userProfile.incomeCategories, year)
        );
      }

      // Save expense categories
      if (userProfile.expenseCategories.length > 0) {
        promises.push(
          bulkCreateExpenseCategories(userProfile.expenseCategories, year)
        );
      }

      // Save asset categories
      if (userProfile.assetCategories.length > 0) {
        promises.push(
          bulkCreateAssetCategories(userProfile.assetCategories, year)
        );
      }

      // Wait for all category insertions to complete
      await Promise.all(promises);

      // Update user onboarding data
      const newData = await updateUserOnboarding(
        currentStep + 1,
        true,
        userProfile
      );

      set({
        userData: newData,
        onboardingCompleted: true,
      });
    } catch (error) {
      console.error("Error completing onboarding:", error);
      throw error;
    } finally {
      set({ onboardingLoading: false });
    }
  },

  setOnboardingCompleted: (completed: boolean) => {
    set({ onboardingCompleted: completed });
  },
}));
