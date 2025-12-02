import ChatBody from "@/components/chat/chat-body";
import ChatFooter from "@/components/chat/chat-footer";
import ChatHeader from "@/components/chat/chat-header";
import EmptyState from "@/components/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import useChatId from "@/hooks/use-chat-id";
import { useSocket } from "@/hooks/use-socket";
import type { MessageType } from "@/types/chat.type";
import { useEffect, useState } from "react";
import { UserProfileDialog } from "@/components/user-profile-dialog";
import { GroupSettingsDialog } from "@/components/group/group-settings-dialog";
import { ImagePreviewDialog } from "@/components/chat/image-preview-dialog";

const SingleChat = () => {
  const chatId = useChatId();
  const { fetchSingleChat, isSingleChatLoading, singleChat, fetchAllUsers, users, markChatAsRead, setActiveChat } = useChat();
  const { socket } = useSocket();
  const { user } = useAuth();

  const [replyTo, setReplyTo] = useState<MessageType | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGroupSettingsOpen, setIsGroupSettingsOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<{url: string; name: string} | null>(null);

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileOpen(true);
  };

  const handleImageClick = (imageUrl: string, imageName?: string) => {
    setPreviewImage({
      url: imageUrl,
      name: imageName || "Image"
    });
  };

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const currentUserId = user?.id || null;
  const chat = singleChat?.chat;
  const messages = singleChat?.messages || [];

  useEffect(() => {
    if (!chatId) return;
    fetchSingleChat(chatId);
  }, [chatId, fetchSingleChat]);

  // Track which chat is currently open and clear its unread count
  useEffect(() => {
    if (!chatId) return;
    setActiveChat(chatId);
    markChatAsRead(chatId);

    return () => {
      setActiveChat(null);
    };
  }, [chatId, setActiveChat, markChatAsRead]);

  //Socket Chat room
  useEffect(() => {
    if (!chatId || !socket) return;

    socket.emit("chat:join", chatId);
    return () => {
      socket.emit("chat:leave", chatId);
    };
  }, [chatId, socket]);

  if (isSingleChatLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner className="w-11 h-11 !text-primary" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-lg">Chat not found</p>
      </div>
    );
  }

  return (
    <div className="relative h-svh flex flex-col">
      <ChatHeader 
        chat={chat} 
        currentUserId={currentUserId}
        onGroupSettingsClick={() => setIsGroupSettingsOpen(true)}
      />

      <div className="flex-1 overflow-y-auto bg-background no-scrollbar">
        {messages.length === 0 ? (
          <EmptyState
            title="Start a conversation"
            description="No messages yet. Send the first message"
          />
        ) : (
          <ChatBody 
            chatId={chatId} 
            messages={messages} 
            onReply={setReplyTo}
            onUserClick={handleUserClick}
            onImageClick={handleImageClick}
          />
        )}
      </div>

      <ChatFooter
        replyTo={replyTo}
        chatId={chatId}
        currentUserId={currentUserId}
        onCancelReply={() => setReplyTo(null)}
      />

      <UserProfileDialog
        userId={selectedUserId}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />

      <GroupSettingsDialog
        open={isGroupSettingsOpen}
        onOpenChange={setIsGroupSettingsOpen}
        chat={chat}
        availableUsers={users || []}
        onGroupUpdated={() => {
          if (chatId) {
            fetchSingleChat(chatId);
          }
        }}
      />

      <ImagePreviewDialog
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        imageUrl={previewImage?.url || ""}
        imageName={previewImage?.name}
      />
    </div>
  );
};

export default SingleChat;
