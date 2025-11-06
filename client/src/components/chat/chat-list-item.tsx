import { getOtherUserAndGroup } from "@/lib/helper";
import { cn } from "@/lib/utils";
import type { ChatType } from "@/types/chat.type";
import { useLocation } from "react-router-dom";
import AvatarWithBadge from "../avatar-with-badge";
import { formatChatTime } from "../../lib/helper";
import { Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { useState } from "react";
import { useChat } from "@/hooks/use-chat";

interface PropsType {
  chat: ChatType;
  currentUserId: string | null;
  onClick?: () => void;
  onUserClick?: (userId: string) => void;
  onDelete?: (chatId: string) => void;
}
const ChatListItem = ({ chat, currentUserId, onClick, onUserClick, onDelete }: PropsType) => {
  const [showDelete, setShowDelete] = useState(false);
  const { pathname } = useLocation();
  const { getUnreadCount } = useChat();
  const { lastMessage, createdAt } = chat;
  
  const unreadCount = getUnreadCount(chat.id);

  const { name, avatar, isOnline, isGroup } = getOtherUserAndGroup(
    chat,
    currentUserId
  );

  const getLastMessageText = () => {
    if (!lastMessage) {
      return isGroup
        ? chat.createdBy === currentUserId
          ? "Group created"
          : "You were added"
        : "Send a message";
    }
    if (lastMessage.audio) return "🎤 Voice note";
    if (lastMessage.image) return "📷 Photo";

    if (isGroup && lastMessage.sender) {
      return `${
        lastMessage.sender.id === currentUserId
          ? "You"
          : lastMessage.sender.name
      }: ${lastMessage.audio ? "🎤 Voice note" : lastMessage.image ? "📷 Photo" : lastMessage.content}`;
    }

    return lastMessage.audio ? "🎤 Voice note" : lastMessage.image ? "📷 Photo" : lastMessage.content;
  };

  const handleAvatarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isGroup && onUserClick) {
      const otherUser = chat.participants?.find((p) => p.id !== currentUserId);
      if (otherUser?.id) {
        onUserClick(otherUser.id);
      }
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (onDelete) {
      onDelete(chat.id);
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
      className={cn(
        `w-full flex items-center gap-3 p-2.5 px-3 rounded-lg
         hover:bg-secondary/80 transition-all duration-200 text-left
         group relative cursor-pointer`,
        pathname.includes(chat.id) && "bg-secondary shadow-sm"
      )}
    >
      <div onClick={handleAvatarClick} className={!isGroup ? "cursor-pointer" : ""}>
        <AvatarWithBadge
          name={name}
          src={avatar}
          isGroup={isGroup}
          isOnline={isOnline}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h5 className="text-sm font-medium truncate capitalize group-hover:text-foreground transition-colors">
            {name}
          </h5>
          <div className="flex items-center gap-2">
            {showDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {unreadCount > 0 && (
              <div className="bg-primary text-primary-foreground text-xs font-medium px-2 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </div>
            )}
            <span className="text-[11px] shrink-0 text-muted-foreground/80">
              {formatChatTime(lastMessage?.updatedAt || lastMessage?.updated_at || createdAt || chat.created_at || new Date().toISOString())}
            </span>
          </div>
        </div>
        <p className="text-xs truncate text-muted-foreground/90 leading-relaxed">
          {getLastMessageText()}
        </p>
      </div>
      
      {pathname.includes(chat.id) && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
    </div>
  );
};

export default ChatListItem;
