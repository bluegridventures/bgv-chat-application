import { useEffect } from "react";
import { useAuth } from "./hooks/use-auth";
import AppRoutes from "./routes";
import { Spinner } from "./components/ui/spinner";
import Logo from "./components/logo";
import { useLocation } from "react-router-dom";
import { isAuthRoute } from "./routes/routes";
import { useSocket } from "./hooks/use-socket";
import { useCalls } from "./hooks/use-calls";
import IncomingCallDialog from "./components/call/incoming-call-dialog";
import CallOverlay from "./components/call/call-overlay";
import GroupCallOverlay from "./components/call/group-call-overlay";

function App() {
  const { pathname } = useLocation();
  const { user, isAuthStatus, isAuthStatusLoading } = useAuth();
  const isAuth = isAuthRoute(pathname);
  const { socket } = useSocket();
  const { initListeners } = useCalls();

  useEffect(() => {
    if (isAuth) return;
    isAuthStatus();
  }, [isAuthStatus, isAuth]);

  useEffect(() => {
    if (!socket) return;
    initListeners();
  }, [socket, initListeners]);

  if (isAuthStatusLoading && !user) {
    return (
      <div
        className="flex flex-col items-center
       justify-center h-screen
      "
      >
        <Logo imgClass="size-20" showText={false} />
        <Spinner className="w-6 h-6" />
      </div>
    );
  }

  return (
    <>
      <AppRoutes />
      <IncomingCallDialog />
      <CallOverlay />
      <GroupCallOverlay />
    </>
  );
}

export default App;
