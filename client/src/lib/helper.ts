import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { useSocket } from "@/hooks/use-socket";
import type { ChatType } from "@/types/chat.type";

export const isUserOnline = (userId?: string) => {
  if (!userId) return false;
  const { onlineUsers } = useSocket.getState();
  return onlineUsers.includes(userId);
};

export const getOtherUserAndGroup = (
  chat: ChatType,
  currentUserId: string | null
) => {
  const isGroup = chat?.isGroup || chat?.is_group || false;

  if (isGroup) {
    const name = chat.groupName || chat.group_name || "Unnamed Group";
    const avatar = chat.groupAvatar || chat.group_avatar || "";
    const membersCount = chat.participants?.length || 0;
    return {
      name,
      subheading: `${membersCount} members`,
      avatar,
      isGroup: true,
    };
  }

  const other = chat?.participants.find((p) => p.id !== currentUserId);
  const isOnline = isUserOnline(other?.id ?? "");

  return {
    name: other?.name || "Unknown",
    subheading: isOnline ? "Online" : "Offline",
    avatar: other?.avatar || "",
    isGroup: false,
    isOnline,
    isAI: (other as any)?.isAI || (other as any)?.is_ai || false,
  };
};

export const formatChatTime = (date: string | Date) => {
  if (!date) return "";
  const newDate = new Date(date);
  if (isNaN(newDate.getTime())) return "Invalid date";

  if (isToday(newDate)) return format(newDate, "h:mm a");
  if (isYesterday(newDate)) return "Yesterday";
  if (isThisWeek(newDate)) return format(newDate, "EEEE");
  return format(newDate, "M/d");
};

export function generateUUID(): string {
  return uuidv4();
}
