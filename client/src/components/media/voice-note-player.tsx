import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  src: string;
  compact?: boolean;
  className?: string;
}

const formatTime = (time: number) => {
  if (!isFinite(time) || time < 0) return "0:00";
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const VoiceNotePlayer = ({ src, compact = false, className }: Props) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTime = () => setCurrentTime(audio.currentTime || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [src]);

  const progress = useMemo(() => {
    if (!duration) return 0;
    return Math.min(1, Math.max(0, currentTime / duration));
  }, [currentTime, duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (_) {
        /* ignored */
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    audio.currentTime = pct * duration;
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border/60 bg-background/60",
        compact ? "p-1.5" : "p-2.5",
        className
      )}
    >
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          "inline-flex items-center justify-center rounded-full",
          compact ? "h-7 w-7" : "h-9 w-9",
          isPlaying ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Pause className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        ) : (
          <Play className={cn(compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div
          className={cn(
            "relative h-1.5 rounded-full bg-muted overflow-hidden cursor-pointer",
            compact ? "h-1.5" : "h-2"
          )}
          onClick={handleSeek}
        >
          <div
            className="absolute left-0 top-0 h-full bg-primary"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute -top-1 h-3 w-3 rounded-full bg-primary shadow-sm"
            style={{ transform: `translateX(calc(${progress * 100}% - 6px))` }}
          />
        </div>
        <div className="mt-1 text-[10px] text-muted-foreground select-none">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>

      <div className="hidden sm:flex items-end gap-0.5 h-5 w-5">
        <span
          className={cn(
            "w-0.5 bg-primary/70",
            isPlaying ? "animate-pulse h-3" : "h-2"
          )}
          style={{ animationDelay: "0ms" }}
        />
        <span
          className={cn(
            "w-0.5 bg-primary/70",
            isPlaying ? "animate-pulse h-4" : "h-3"
          )}
          style={{ animationDelay: "150ms" }}
        />
        <span
          className={cn(
            "w-0.5 bg-primary/70",
            isPlaying ? "animate-pulse h-2.5" : "h-2"
          )}
          style={{ animationDelay: "300ms" }}
        />
      </div>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
    </div>
  );
};

export default VoiceNotePlayer;
