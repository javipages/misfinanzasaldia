import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import type { ReactNode } from "react";
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

interface PublicRouteProps {
  children?: ReactNode;
}

const PublicRoute = ({ children }: PublicRouteProps) => {
  const { session, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return <LoadingState />;
  }

  // If user is authenticated, redirect to dashboard
  if (session) {
    return <Navigate to="/" replace />;
  }

  // If not authenticated, allow access to public routes
  return <>{children}</>;
};

export default PublicRoute;
