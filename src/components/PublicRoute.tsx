import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import type { ReactNode } from "react";

const LoadingState = () => (
  <div className="flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    <span className="ml-2 text-gray-600">Cargando...</span>
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
