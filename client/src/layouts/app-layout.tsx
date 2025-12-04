import AppWrapper from "@/components/app-wrapper";
import ChatList from "@/components/chat/chat-list";
import useChatId from "@/hooks/use-chat-id";
import { cn } from "@/lib/utils";
import { Outlet } from "react-router-dom";
import { useState } from "react";
import { List } from "lucide-react";

const AppLayout = () => {
  const chatId = useChatId();
  const [mobileListOpen, setMobileListOpen] = useState(false);
  return (
    <AppWrapper>
      <div className="h-full">
        {/* ChatList */}
        <div
          className={cn(
            chatId ? (mobileListOpen ? "block" : "hidden lg:block") : "block"
          )}
        >
          <ChatList />
        </div>
        <div
          className={cn(
            "lg:!pl-[330px] pl-[50px]",
            !chatId ? "hidden lg:block" : "block"
          )}
        >
          <Outlet />
        </div>

        {/* Mobile overlay behind the chat list when opened */}
        {chatId && mobileListOpen && (
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[97] lg:hidden"
            onClick={() => setMobileListOpen(false)}
          />
        )}

        {/* Floating toggle button on mobile to open/close the chat list */}
        {chatId && (
          <button
            aria-label="Toggle chat list"
            className="lg:hidden fixed bottom-4 right-4 z-[120] p-3 rounded-full bg-primary text-primary-foreground shadow-lg"
            onClick={() => setMobileListOpen((v) => !v)}
          >
            <List className="w-5 h-5" />
          </button>
        )}
      </div>
    </AppWrapper>
  );
};

export default AppLayout;
