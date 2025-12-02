import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCalls } from "@/hooks/use-calls";

const IncomingCallDialog = () => {
  const { incomingCall, acceptCall, rejectCall } = useCalls();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(!!incomingCall);
  }, [incomingCall]);

  const label = useMemo(() => {
    if (!incomingCall) return "Incoming call";
    const kind = incomingCall.type === "video" ? "Video" : "Voice";
    const who = incomingCall.fromUserName || "Unknown user";
    return `${kind} call from ${who}`;
  }, [incomingCall]);

  return (
    <Dialog open={open} onOpenChange={(o) => setOpen(o)}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {incomingCall ? "Tap Accept to answer or Reject to decline." : ""}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={acceptCall} className="gap-2">
              {incomingCall?.type === "video" ? (
                <Video className="h-4 w-4" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
              Accept
            </Button>
            <Button variant="destructive" onClick={rejectCall} className="gap-2">
              <PhoneOff className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IncomingCallDialog;
