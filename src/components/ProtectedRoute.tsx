import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useUserStore } from "@/store/user";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const LoadingState = () => (
  <div className="flex flex-col items-center gap-4">
    <Skeleton className="h-12 w-12 rounded-full" />
    <div className="space-y-2 text-center">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-40" />
    </div>
  </div>
);

const ProtectedRoute = () => {
  const { session, loading: authLoading } = useAuth();
  const location = useLocation();
  const { onboardingCompleted, onboardingLoading, hasHydrated, hydrate } =
    useUserStore();

  useEffect(() => {
    if (session) {
      hydrate();
    }
  }, [session, hydrate]);

  // If auth is still loading, show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  // If no session, redirect to auth immediately (don't wait for hydration)
  if (!session) {
    return <Navigate to="/auth" replace />;
  }

  // If session exists but user data is still loading, show loading state
  if (onboardingLoading || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  // If user hasn't completed onboarding and is not already on onboarding page
  if (!onboardingCompleted && location.pathname !== "/onboarding") {
    return <Navigate to="/onboarding" replace />;
  }

  // If user completed onboarding but is trying to access onboarding page, redirect to home
  if (onboardingCompleted && location.pathname === "/onboarding") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
