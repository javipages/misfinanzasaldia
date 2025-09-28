import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { useUserStore } from "@/store/user";
import { useEffect } from "react";

const LoadingState = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-2 text-gray-600">Cargando...</span>
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

  if (authLoading || onboardingLoading || !hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingState />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" replace />;
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
