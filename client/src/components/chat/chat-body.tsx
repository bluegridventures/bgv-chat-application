import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";
import type { MessageType } from "@/types/chat.type";
import { useEffect, useRef } from "react";
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
  const { addNewMessage, addTypingUser, removeTypingUser, getTypingUsers, users } = useChat();
  const { user } = useAuth();
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!chatId) return;
    if (!socket) return;

    const handleNewMessage = (msg: MessageType) => addNewMessage(chatId, msg);
    
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
    socket.on("typing:start", handleTypingStart);
    socket.on("typing:stop", handleTypingStop);
    
    return () => {
      socket.off("message:new", handleNewMessage);
      socket.off("typing:start", handleTypingStart);
      socket.off("typing:stop", handleTypingStop);
    };
  }, [socket, chatId, addNewMessage, addTypingUser, removeTypingUser, users, user?.id]);

  useEffect(() => {
    if (!messages.length) return;
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  const typingUsers = chatId ? getTypingUsers(chatId) : [];

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col px-3 py-2">
      {messages.map((message) => (
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
