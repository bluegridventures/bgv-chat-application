/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import type { UserType } from "@/types/auth.type";
import type {
  ChatType,
  CreateChatType,
  CreateMessageType,
  MessageType,
} from "@/types/chat.type";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { useAuth } from "./use-auth";
import { generateUUID } from "@/lib/helper";

interface ChatState {
  chats: ChatType[];
  users: UserType[];
  singleChat: {
    chat: ChatType;
    messages: MessageType[];
  } | null;

  currentAIStreamId: string | null;
  typingUsers: Map<string, string[]>; // chatId -> array of user names
  unreadCounts: Map<string, number>; // chatId -> unread message count

  isChatsLoading: boolean;
  isUsersLoading: boolean;
  isCreatingChat: boolean;
  isSingleChatLoading: boolean;
  isSendingMsg: boolean;

  fetchAllUsers: () => void;
  fetchChats: () => void;
  createChat: (payload: CreateChatType) => Promise<ChatType | null>;
  fetchSingleChat: (chatId: string) => void;
  sendMessage: (payload: CreateMessageType) => void;

  addNewChat: (newChat: ChatType) => void;
  updateChatLastMessage: (chatId: string, lastMessage: MessageType) => void;
  addNewMessage: (chatId: string, message: MessageType) => void;
  deleteChat: (chatId: string) => Promise<void>;
  
  // Typing indicators
  addTypingUser: (chatId: string, userName: string) => void;
  removeTypingUser: (chatId: string, userName: string) => void;
  getTypingUsers: (chatId: string) => string[];
  
  // Unread messages
  incrementUnreadCount: (chatId: string) => void;
  markChatAsRead: (chatId: string) => void;
  getUnreadCount: (chatId: string) => number;
}

export const useChat = create<ChatState>()((set, get) => ({
  chats: [],
  users: [],
  singleChat: null,

  isChatsLoading: false,
  isUsersLoading: false,
  isCreatingChat: false,
  isSingleChatLoading: false,
  isSendingMsg: false,

  currentAIStreamId: null,
  typingUsers: new Map(),
  unreadCounts: new Map(),

  fetchAllUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const { data } = await API.get("/user/all");
      set({ users: data.users });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch users");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  fetchChats: async () => {
    set({ isChatsLoading: true });
    try {
      const { data } = await API.get("/chat/all");
      set({ chats: data.chats });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch chats");
    } finally {
      set({ isChatsLoading: false });
    }
  },

  createChat: async (payload: CreateChatType) => {
    set({ isCreatingChat: true });
    try {
      const response = await API.post("/chat/create", {
        ...payload,
      });
      get().addNewChat(response.data.chat);
      toast.success("Chat created successfully");
      return response.data.chat;
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch chats");
      return null;
    } finally {
      set({ isCreatingChat: false });
    }
  },

  fetchSingleChat: async (chatId: string) => {
    set({ isSingleChatLoading: true });
    try {
      const { data } = await API.get(`/chat/${chatId}`);
      set({ singleChat: data });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to fetch chats");
    } finally {
      set({ isSingleChatLoading: false });
    }
  },

  sendMessage: async (payload: CreateMessageType) => {
    set({ isSendingMsg: true });
    const { chatId, replyTo, content, image, audio } = payload;
    const { user } = useAuth.getState();

    if (!chatId || !user?.id) return;

    const tempUserId = generateUUID();

    const tempMessage = {
      id: tempUserId,
      chatId,
      content: content || "",
      image: image || null,
      audio: audio || null,
      sender: user,
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "sending...",
    };

    // if (isAI) {
    //  // AI Feature Source code link =>
    // }

    set((state) => {
      if (state.singleChat?.chat?.id !== chatId) return state;
      return {
        singleChat: {
          ...state.singleChat,
          messages: [...state.singleChat.messages, tempMessage],
        },
      };
    });

    try {
      const { data } = await API.post("/chat/message/send", {
        chatId,
        content,
        image,
        audio,
        replyToId: replyTo?.id,
      });
      const { userMessage } = data;
      //replace the temp user message
      set((state) => {
        if (!state.singleChat) return state;
        return {
          singleChat: {
            ...state.singleChat,
            messages: state.singleChat.messages.map((msg) =>
              msg.id === tempUserId ? userMessage : msg
            ),
          },
        };
      });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send message");
    } finally {
      set({ isSendingMsg: false });
    }
  },

  addNewChat: (newChat: ChatType) => {
    set((state) => {
      const existingChatIndex = state.chats.findIndex(
        (c) => c.id === newChat.id
      );
      if (existingChatIndex !== -1) {
        //move the chat to the top
        return {
          chats: [newChat, ...state.chats.filter((c) => c.id !== newChat.id)],
        };
      } else {
        return {
          chats: [newChat, ...state.chats],
        };
      }
    });
  },

  updateChatLastMessage: (chatId, lastMessage) => {
    set((state) => {
      const chat = state.chats.find((c) => c.id === chatId);
      if (!chat) return state;
      return {
        chats: [
          { ...chat, lastMessage },
          ...state.chats.filter((c) => c.id !== chatId),
        ],
      };
    });
  },

  addNewMessage: (chatId, message) => {
    const { user } = useAuth.getState();
    const currentUserId = user?.id;
    const chat = get().singleChat;
    
    // Add message to current chat if it matches
    if (chat?.chat.id === chatId) {
      set({
        singleChat: {
          chat: chat.chat,
          messages: [...chat.messages, message],
        },
      });
    }
    
    // Increment unread count if message is from another user and not viewing this chat
    if (message.sender?.id !== currentUserId && chat?.chat.id !== chatId) {
      get().incrementUnreadCount(chatId);
    }
  },

  deleteChat: async (chatId: string) => {
    try {
      const response = await API.delete(`/chat/${chatId}`);
      
      // Remove chat from the list (works for both delete and leave)
      set({
        chats: get().chats.filter((chat) => chat.id !== chatId),
      });
      
      // Clear single chat if it's the one being deleted/left
      if (get().singleChat?.chat.id === chatId) {
        set({ singleChat: null });
      }
      
      // Show appropriate message based on response
      const message = response.data?.message || "Chat deleted successfully";
      toast.success(message);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete chat");
      throw error;
    }
  },

  // Typing indicators
  addTypingUser: (chatId: string, userName: string) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const currentUsers = newTypingUsers.get(chatId) || [];
      if (!currentUsers.includes(userName)) {
        newTypingUsers.set(chatId, [...currentUsers, userName]);
      }
      return { typingUsers: newTypingUsers };
    });
  },

  removeTypingUser: (chatId: string, userName: string) => {
    set((state) => {
      const newTypingUsers = new Map(state.typingUsers);
      const currentUsers = newTypingUsers.get(chatId) || [];
      const filteredUsers = currentUsers.filter(user => user !== userName);
      if (filteredUsers.length === 0) {
        newTypingUsers.delete(chatId);
      } else {
        newTypingUsers.set(chatId, filteredUsers);
      }
      return { typingUsers: newTypingUsers };
    });
  },

  getTypingUsers: (chatId: string) => {
    return get().typingUsers.get(chatId) || [];
  },

  // Unread messages
  incrementUnreadCount: (chatId: string) => {
    set((state) => {
      const newUnreadCounts = new Map(state.unreadCounts);
      const currentCount = newUnreadCounts.get(chatId) || 0;
      newUnreadCounts.set(chatId, currentCount + 1);
      return { unreadCounts: newUnreadCounts };
    });
  },

  markChatAsRead: (chatId: string) => {
    set((state) => {
      const newUnreadCounts = new Map(state.unreadCounts);
      newUnreadCounts.delete(chatId);
      return { unreadCounts: newUnreadCounts };
    });
  },

  getUnreadCount: (chatId: string) => {
    return get().unreadCounts.get(chatId) || 0;
  },
}));
