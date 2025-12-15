import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Topbar } from "@/components/ui/topbar";
import { Tour } from "./Tour";
import { Outlet } from "react-router-dom";
import {
  getUserData,
  updateUserTourCompleted,
} from "@/integrations/supabase/preferences";
import { usePrivacyEffect } from "@/store/privacyStore";
import { SuggestionButton } from "./SuggestionButton";

export function Layout() {
  const [showTour, setShowTour] = useState(false);
  const [showTourOnLoad, setShowTourOnLoad] = useState(false);
  const location = useLocation();

  usePrivacyEffect();

  // Check if we should show the tour automatically after onboarding
  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const userData = await getUserData();
        if (
          userData?.onboarding_completed &&
          !userData?.tour_completed &&
          location.pathname !== "/onboarding"
        ) {
          setShowTourOnLoad(true);
        }
      } catch (error) {
        console.error("Error checking tour status:", error);
      }
    };

    if (location.pathname !== "/onboarding") {
      checkTourStatus();
    }
  }, [location.pathname]);

  // Show tour automatically when component mounts and user hasn't seen it
  useEffect(() => {
    if (showTourOnLoad && location.pathname !== "/onboarding") {
      const timer = setTimeout(() => {
        setShowTour(true);
        setShowTourOnLoad(false);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [showTourOnLoad, location.pathname]);

  const handleStartTour = () => {
    setShowTour(true);
  };

  const handleCloseTour = async () => {
    setShowTour(false);
    try {
      await updateUserTourCompleted(true);
    } catch (error) {
      console.error("Error updating tour status:", error);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar onStartTour={handleStartTour} />
      <SidebarInset className="overflow-hidden">
        <Topbar onStartTour={handleStartTour} />
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </div>
        <Tour
          isVisible={showTour}
          onClose={handleCloseTour}
          autoStart={showTour}
        />
        <SuggestionButton />
      </SidebarInset>
    </SidebarProvider>
  );
}
