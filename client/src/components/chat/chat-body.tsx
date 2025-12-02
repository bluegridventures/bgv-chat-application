import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";
import type { MessageType } from "@/types/chat.type";
import { useEffect, useMemo, useRef } from "react";
import ChatBodyMessage from "./chat-body-message";
import { TypingIndicator } from "./typing-indicator";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  chatId: string | null;
  messages: MessageType[];
  onReply: (message: MessageType) => void;
  onUserClick?: (userId: string) => void;
  onImageClick?: (imageUrl: string, imageName?: string) => void;
}
const ChatBody = ({ chatId, messages, onReply, onUserClick, onImageClick }: Props) => {
  const { socket } = useSocket();
  const { addNewMessage, updateMessageInChat, deleteMessageInChat, addTypingUser, removeTypingUser, getTypingUsers, users } = useChat();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const uniqueMessages = useMemo(() => {
    const seen = new Set<string>();
    return messages.filter((m) => {
      const id = m?.id as string | undefined;
      if (!id) return true;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;
    if (!socket) return;

    const handleNewMessage = (msg: MessageType) => addNewMessage(chatId, msg);

    const handleMessageUpdated = (msg: MessageType) => {
      updateMessageInChat(chatId, msg);
    };

    const handleMessageDeleted = ({ chatId: eventChatId, messageId }: { chatId: string; messageId: string }) => {
      if (eventChatId !== chatId) return;
      deleteMessageInChat(chatId, messageId);
    };
    
    const handleTypingStart = ({ userId, chatId: typingChatId }: { userId: string; chatId: string }) => {
      if (typingChatId === chatId && userId !== user?.id) {
        const typingUser = users?.find(u => u.id === userId);
        if (typingUser) {
          addTypingUser(chatId, typingUser.name);
        }
      }
    };

    const handleTypingStop = ({ userId, chatId: typingChatId }: { userId: string; chatId: string }) => {
      if (typingChatId === chatId && userId !== user?.id) {
        const typingUser = users?.find(u => u.id === userId);
        if (typingUser) {
          removeTypingUser(chatId, typingUser.name);
        }
      }
    };

    socket.on("message:new", handleNewMessage);
    socket.on("message:updated", handleMessageUpdated);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("message:updated", handleMessageUpdated);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, chatId, addNewMessage, addTypingUser, removeTypingUser, users, user?.id]);

  useEffect(() => {
    if (!uniqueMessages.length) return;
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [uniqueMessages]);

  const typingUsers = chatId ? getTypingUsers(chatId) : [];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col px-3 py-2">
      {uniqueMessages.map((message) => (
        <ChatBodyMessage
          key={message.id}
          message={message}
          onReply={onReply}
          onUserClick={onUserClick}
          onImageClick={onImageClick}
        />
      ))}
      
      {typingUsers.length > 0 && (
        <TypingIndicator users={typingUsers} />
      )}
      
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatBody;
