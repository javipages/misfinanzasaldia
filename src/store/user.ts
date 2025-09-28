import { create } from "zustand";
import {
  getUserData,
  upsertUserPreferences,
  updateUserOnboarding,
  UserData,
  UserProfileSetup,
} from "@/integrations/supabase/preferences";

type UserState = {
  // Year management
  year: number;
  setYear: (y: number) => Promise<void>;

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
      } else {
        // If no user data exists, mark as hydrated but onboarding not completed
        set({ hasHydrated: true });
      }
    } finally {
      set({ onboardingLoading: false, _isHydrating: false });
    }
  },

  completeOnboarding: async (userProfile: UserProfileSetup) => {
    set({ onboardingLoading: true });
    try {
      const currentStep = get().userData?.onboarding_step ?? 0;
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
