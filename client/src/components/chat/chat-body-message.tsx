import { memo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/chat.type";
import AvatarWithBadge from "../avatar-with-badge";
import { formatChatTime } from "@/lib/helper";
import { Button } from "../ui/button";
import { ReplyIcon } from "lucide-react";
import VoiceNotePlayer from "@/components/media/voice-note-player";

interface Props {
  message: MessageType;
  onReply: (message: MessageType) => void;
  onUserClick?: (userId: string) => void;
  onImageClick?: (imageUrl: string, imageName?: string) => void;
}
const ChatMessageBody = memo(({ message, onReply, onUserClick, onImageClick }: Props) => {
  const { user } = useAuth();

  const userId = user?.id || null;
  const isCurrentUser = message.sender?.id === userId;
  const senderName = isCurrentUser ? "You" : message.sender?.name;

  const replySendername =
    message.replyTo?.sender?.id === userId
      ? "You"
      : message.replyTo?.sender?.name;

  const containerClass = cn(
    "group flex gap-3 py-2 px-4 hover:bg-secondary/20 transition-colors",
    isCurrentUser && "flex-row-reverse text-left"
  );

  const contentWrapperClass = cn(
    "max-w-[65%] flex flex-col relative",
    isCurrentUser && "items-end"
  );

  const messageClass = cn(
    "min-w-[200px] px-4 py-2.5 text-sm break-words shadow-sm backdrop-blur-sm",
    isCurrentUser
      ? "bg-primary/90 text-primary-foreground rounded-2xl rounded-tr-md"
      : "bg-secondary/80 text-foreground rounded-2xl rounded-tl-md"
  );

  const replyBoxClass = cn(
    `mb-2 p-2.5 text-xs rounded-lg border-l-2 backdrop-blur-sm !text-left`,
    isCurrentUser
      ? "bg-primary/20 border-l-primary/50"
      : "bg-secondary/60 border-l-accent"
  );
  return (
    <div className={containerClass}>
      {!isCurrentUser && (
        <div 
          className="flex-shrink-0 flex items-start cursor-pointer"
          onClick={() => message.sender?.id && onUserClick?.(message.sender.id)}
          role="button"
          tabIndex={0}
        >
          <AvatarWithBadge
            name={message.sender?.name || "No name"}
            src={message.sender?.avatar || ""}
          />
        </div>
      )}

      <div className={contentWrapperClass}>
        <div
          className={cn(
            "flex items-center gap-1",
            isCurrentUser && "flex-row-reverse"
          )}
        >
          <div className={messageClass}>
            {/* {Header} */}

            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-xs font-semibold",
                isCurrentUser ? "text-primary-foreground/90" : "text-foreground"
              )}>
                {senderName}
              </span>
              <span className={cn(
                "text-[10px]",
                isCurrentUser ? "text-primary-foreground/60" : "text-muted-foreground"
              )}>
                {formatChatTime(message?.createdAt || message?.created_at || new Date().toISOString())}
              </span>
            </div>

            {/* ReplyToBox */}
            {message.replyTo && (
              <div className={replyBoxClass}>
                <h5 className="font-medium">{replySendername}</h5>
                <p
                  className="font-normal text-muted-foreground
                 max-w-[250px]  truncate
                "
                >
                  {message?.replyTo?.content ||
                    (message?.replyTo?.audio
                      ? "🎤 Voice note"
                      : message?.replyTo?.image
                      ? "📷 Photo"
                      : "")}
                </p>
              </div>
            )}

            {message?.image && (
              <img
                src={message?.image || ""}
                alt="Shared image"
                className="rounded-lg max-w-xs cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onImageClick?.(message.image!, `Image from ${senderName}`)}
              />
            )}

            {message?.audio && (
              <VoiceNotePlayer
                src={message.audio || ""}
                compact
                className="mt-1 max-w-xs"
              />
            )}

            {message.content && <p>{message.content}</p>}
          </div>

          {/* {Reply Icon Button} */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onReply(message)}
            className="flex opacity-0 group-hover:opacity-100
            transition-all rounded-lg !size-7 hover:bg-secondary/80
            "
          >
            <ReplyIcon
              size={14}
              className={cn(
                "text-muted-foreground",
                isCurrentUser && "scale-x-[-1]"
              )}
            />
          </Button>
        </div>

        {message.status && (
          <span
            className="block
           text-[10px] text-gray-400 mt-0.5"
          >
            {message.status}
          </span>
        )}
      </div>
    </div>
  );
});

ChatMessageBody.displayName = "ChatMessageBody";

export default ChatMessageBody;
