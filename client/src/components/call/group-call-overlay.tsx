import { X, Video, Phone } from "lucide-react";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import "@livekit/components-styles";
import { Button } from "@/components/ui/button";
import { useGroupCall } from "@/hooks/use-group-call";
import { useMemo } from "react";

const GroupCallOverlay = () => {
  const { open, token, serverUrl, type, endGroupCall } = useGroupCall();

  const initialTracks = useMemo(() => {
    return {
      audio: true,
      video: type === "video",
    };
  }, [type]);

  if (!open || !token || !serverUrl) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-background/95 backdrop-blur-sm">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-2" disabled>
          {type === "video" ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
          Group {type === "video" ? "video" : "voice"} call
        </Button>
        <Button variant="destructive" size="icon" className="rounded-full" onClick={endGroupCall}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <LiveKitRoom
        token={token}
        serverUrl={serverUrl}
        connect
        audio={initialTracks.audio}
        video={initialTracks.video}
        onDisconnected={endGroupCall}
        data-lk-theme="default"
        className="h-full"
      >
        {/* Default full-featured conferencing UI */}
        <VideoConference />
      </LiveKitRoom>
    </div>
  );
};

export default GroupCallOverlay;
