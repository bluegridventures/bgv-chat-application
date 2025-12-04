import { memo, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { MessageType } from "@/types/chat.type";
import AvatarWithBadge from "../avatar-with-badge";
import { formatChatTime } from "@/lib/helper";
import { Button } from "../ui/button";
import { Edit2, MoreVertical, ReplyIcon, SmilePlus, Trash2 } from "lucide-react";
import VoiceNotePlayer from "@/components/media/voice-note-player";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";

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

  const chatId = message.chatId || message.chat_id || "";

  const reactionSummary = useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return [] as { emoji: string; count: number }[];
    const map = new Map<string, number>();
    for (const r of message.reactions) {
      if (!r.emoji) continue;
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    }
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }, [message.reactions]);

  const handleReact = async (emoji: string) => {
    if (!chatId) return;
    try {
      await API.post("/chat/message/react", {
        chatId,
        messageId: message.id,
        emoji,
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to react to message");
    }
  };

  const handleEdit = async () => {
    if (!isCurrentUser || !chatId) return;
    const initial = message.content || "";
    const next = window.prompt("Edit message", initial);
    if (next === null) return;
    const trimmed = next.trim();
    if (!trimmed || trimmed === initial) return;
    try {
      await API.patch("/chat/message/edit", {
        chatId,
        messageId: message.id,
        content: trimmed,
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to edit message");
    }
  };

  const handleDelete = async () => {
    if (!isCurrentUser || !chatId) return;
    const confirmDelete = window.confirm("Delete this message?");
    if (!confirmDelete) return;
    try {
      await API.delete("/chat/message/delete", {
        data: {
          chatId,
          messageId: message.id,
        },
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete message");
    }
  };

  const contentWrapperClass = cn(
    "max-w-[78%] sm:max-w-[65%] flex flex-col relative",
    isCurrentUser && "items-end"
  );

  const messageClass = cn(
    "min-w-[40vw] sm:min-w-[200px] px-4 py-2.5 text-sm break-words shadow-sm backdrop-blur-sm",
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
                className="rounded-lg w-full max-w-full sm:max-w-xs h-auto object-cover max-h-[60vh] cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => onImageClick?.(message.image!, `Image from ${senderName}`)}
              />
            )}

            {message?.audio && (
              <VoiceNotePlayer
                src={message.audio || ""}
                compact
                className="mt-1 w-full max-w-xs"
              />
            )}

            {message.content && <p>{message.content}</p>}

            {reactionSummary.length > 0 && (
              <div
                className={cn(
                  "mt-1 flex flex-wrap gap-1",
                  isCurrentUser ? "justify-end" : "justify-start"
                )}
              >
                {reactionSummary.map(({ emoji, count }) => (
                  <span
                    key={emoji}
                    className="px-1.5 py-0.5 rounded-full bg-background/70 border text-[11px] leading-none"
                  >
                    {emoji} {count > 1 ? count : ""}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={cn("flex items-center gap-1", isCurrentUser && "flex-row-reverse")}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onReply(message)}
              className="flex opacity-0 group-hover:opacity-100 transition-all rounded-lg !size-7 hover:bg-secondary/80"
            >
              <ReplyIcon
                size={14}
                className={cn(
                  "text-muted-foreground",
                  isCurrentUser && "scale-x-[-1]"
                )}
              />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex opacity-0 group-hover:opacity-100 transition-all rounded-lg !size-7 hover:bg-secondary/80"
                >
                  <MoreVertical size={14} className="text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isCurrentUser ? "start" : "end"} className="min-w-[140px]">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {isCurrentUser && (
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </DropdownMenuItem>
                )}
                {isCurrentUser && (
                  <DropdownMenuItem onClick={handleDelete} variant="destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel>React</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleReact("👍")}>
                  <SmilePlus className="h-3.5 w-3.5" /> 👍
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReact("❤️")}>
                  ❤️
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReact("😂")}>
                  😂
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleReact("😮")}>
                  😮
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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
