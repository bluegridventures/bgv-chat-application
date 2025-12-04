import { useEffect, useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { Spinner } from "../ui/spinner";
import ChatListItem from "./chat-list-item";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import ChatListHeader from "./chat-list-header";
import { useSocket } from "@/hooks/use-socket";
import type { ChatType } from "@/types/chat.type";
import type { MessageType } from "../../types/chat.type";
import { UserProfileDialog } from "../user-profile-dialog";
import { DeleteChatDialog } from "./delete-chat-dialog";
import { getOtherUserAndGroup } from "@/lib/helper";

const ChatList = () => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const {
    fetchChats,
    chats,
    isChatsLoading,
    addNewChat,
    updateChatLastMessage,
    deleteChat,
  } = useChat();
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatType | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId);
    setIsProfileOpen(true);
  };

  const handleDeleteClick = (chatId: string) => {
    const chat = chats?.find((c) => c.id === chatId);
    if (chat) {
      setChatToDelete(chat);
    }
  };

  const handleConfirmDelete = async () => {
    if (chatToDelete && !isDeleting) {
      setIsDeleting(true);
      try {
        await deleteChat(chatToDelete.id);
        setChatToDelete(null);
        navigate("/chat");
      } catch (error) {
        setChatToDelete(null); // Close dialog even if delete fails
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const filteredChats =
    chats?.filter(
      (chat) =>
        chat.groupName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.participants?.some(
          (p) =>
            p.id !== currentUserId &&
            p.name?.toLowerCase().includes(searchQuery.toLowerCase())
        )
    ) || [];

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!socket) return;

    const handleNewChat = (newChat: ChatType) => {
      console.log("Recieved new chat", newChat);
      addNewChat(newChat);
    };

    socket.on("chat:new", handleNewChat);

    return () => {
      socket.off("chat:new", handleNewChat);
    };
  }, [addNewChat, socket]);

  useEffect(() => {
    if (!socket) return;

    const handleChatUpdate = (data: {
      chatId: string;
      lastMessage: MessageType;
    }) => {
      console.log("Recieved update on chat", data.lastMessage);
      updateChatLastMessage(data.chatId, data.lastMessage);
    };

    socket.on("chat:update", handleChatUpdate);

    return () => {
      socket.off("chat:update", handleChatUpdate);
    };
  }, [socket, updateChatLastMessage]);

  const onRoute = (chatId: string) => {
    navigate(`/chat/${chatId}`);
  };

  return (
    <div
      className="fixed inset-y-0
      pb-20 lg:pb-0
      lg:max-w-[280px]
      lg:block
      border-r
      border-border/50
      bg-card
      max-w-[calc(100%-50px)]
      w-full
      left-[50px]
      z-[98]
      backdrop-blur-xl
    "
    >
      <div className="flex flex-col h-full">
        <ChatListHeader onSearch={setSearchQuery} />

        <div
          className="
         flex-1 h-[calc(100vh-100px)]
         overflow-y-auto
         no-scrollbar
        "
        >
          <div className="px-3 pb-10 pt-2 space-y-0.5">
            {isChatsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="w-6 h-6 text-primary" />
              </div>
            ) : filteredChats?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="text-muted-foreground text-sm">
                  {searchQuery ? "No chats found" : "No chats yet"}
                </div>
                <div className="text-xs text-muted-foreground/70 mt-1">
                  {!searchQuery && "Start a new conversation"}
                </div>
              </div>
            ) : (
              filteredChats?.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  currentUserId={currentUserId}
                  onClick={() => onRoute(chat.id)}
                  onUserClick={handleUserClick}
                  onDelete={handleDeleteClick}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <UserProfileDialog
        userId={selectedUserId}
        open={isProfileOpen}
        onOpenChange={setIsProfileOpen}
      />

      <DeleteChatDialog
        open={!!chatToDelete}
        onOpenChange={(open) => !open && !isDeleting && setChatToDelete(null)}
        onConfirm={handleConfirmDelete}
        chatName={
          chatToDelete
            ? getOtherUserAndGroup(chatToDelete, currentUserId).name
            : ""
        }
        isGroup={chatToDelete?.is_group || chatToDelete?.isGroup || false}
        isAdmin={
          chatToDelete?.group_admin_id === currentUserId ||
          chatToDelete?.groupAdminId === currentUserId
        }
        isLoading={isDeleting}
      />
    </div>
  );
};

export default ChatList;
