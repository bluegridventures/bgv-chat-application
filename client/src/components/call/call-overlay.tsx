import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, PhoneOff, Video, VideoOff, RefreshCcw } from "lucide-react";
import { useCalls } from "@/hooks/use-calls";
import { useChat } from "@/hooks/use-chat";
import AvatarWithBadge from "@/components/avatar-with-badge";

const CallOverlay = () => {
  const {
    localStream,
    remoteStream,
    inCall,
    callType,
    isMuted,
    isCameraOff,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
    currentPeerUserId,
  } = useCalls();

  const { users } = useChat();

  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const remoteUser = users.find((u) => u.id === currentPeerUserId);
  const remoteName = remoteUser?.name || "Unknown user";

  const isVideo = callType === "video";

  useEffect(() => {
    if (localRef.current && localStream) {
      localRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteRef.current && remoteStream) {
      remoteRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!isVideo && audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isVideo]);

  if (!inCall) return null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-[1000] flex flex-col">
      <div className="flex-1 relative flex items-center justify-center p-4">
        {isVideo ? (
          <div className="relative w-full h-full max-w-5xl max-h-[80vh] rounded-xl overflow-hidden bg-black">
            {remoteStream ? (
              <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span>Connecting video…</span>
              </div>
            )}

            {/* local preview */}
            <div className="absolute bottom-4 right-4 w-48 h-32 rounded-md overflow-hidden border border-border/60 bg-black/60">
              {localStream && !isCameraOff ? (
                <video ref={localRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <AvatarWithBadge name="You" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-secondary size-28 flex items-center justify-center">
              <AvatarWithBadge name={remoteName} />
            </div>
            <div className="text-sm text-muted-foreground">Voice call with {remoteName}…</div>
            <audio ref={audioRef} autoPlay />
          </div>
        )}
      </div>

      <div className="pb-6 flex items-center justify-center gap-3">
        <Button variant={isMuted ? "secondary" : "default"} onClick={toggleMute} className="rounded-full size-12" aria-label={isMuted ? "Unmute" : "Mute"}>
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </Button>
        {isVideo && (
          <>
            <Button
              variant={isCameraOff ? "secondary" : "default"}
              onClick={toggleCamera}
              className="rounded-full size-12"
              aria-label={isCameraOff ? "Turn camera on" : "Turn camera off"}
            >
              {isCameraOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </Button>
            <Button
              variant="secondary"
              onClick={() => void switchCamera()}
              className="rounded-full size-12"
              aria-label="Switch camera"
            >
              <RefreshCcw className="h-5 w-5" />
            </Button>
          </>
        )}
        <Button variant="destructive" onClick={() => endCall()} className="rounded-full size-12" aria-label="End call">
          <PhoneOff className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default CallOverlay;
