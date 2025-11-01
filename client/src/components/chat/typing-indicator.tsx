import { memo } from "react";
import { cn } from "@/lib/utils";

interface TypingIndicatorProps {
  users: string[];
  className?: string;
}

export const TypingIndicator = memo(({ users, className }: TypingIndicatorProps) => {
  if (users.length === 0) return null;

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0]} is typing...`;
    } else if (users.length === 2) {
      return `${users[0]} and ${users[1]} are typing...`;
    } else if (users.length === 3) {
      return `${users[0]}, ${users[1]} and ${users[2]} are typing...`;
    } else {
      return `${users[0]}, ${users[1]} and ${users.length - 2} others are typing...`;
    }
  };

  return (
    <div className={cn("flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground", className)}>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
      </div>
      <span className="text-xs">{getTypingText()}</span>
    </div>
  );
});

TypingIndicator.displayName = "TypingIndicator";
