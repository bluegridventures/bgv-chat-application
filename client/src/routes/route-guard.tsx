import { useAuth } from "@/hooks/use-auth";
import { Navigate, Outlet } from "react-router-dom";
import { Spinner } from "@/components/ui/spinner";

interface Props {
  requireAuth?: boolean;
}

const RouteGuard = ({ requireAuth }: Props) => {
  const { user, isAuthStatusLoading } = useAuth();

  let hasToken = false;
  try {
    hasToken = !!localStorage.getItem("ACCESS_TOKEN") || document.cookie.includes("accessToken=");
  } catch {}

  // While checking auth (or if a token exists), render a lightweight loader to avoid premature redirects on refresh
  if (isAuthStatusLoading || (requireAuth && !user && hasToken)) {
    return (
      <div className="w-full h-svh flex items-center justify-center">
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  if (requireAuth) {
    if (!user) return <Navigate to="/" replace />;
    return <Outlet />;
  }

  // Public routes: if already authenticated, push to the app
  if (!requireAuth && user) return <Navigate to="/chat" replace />;

  return <Outlet />;
};

export default RouteGuard;
