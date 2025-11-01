import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { NewChatPopover } from "./newchat-popover";

const ChatListHeader = ({ onSearch }: { onSearch: (val: string) => void }) => {
  return (
    <div className="px-4 py-4 border-b border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold tracking-tight">Chats</h1>
        <div>
          {/* NewChatPopover */}
          <NewChatPopover />
        </div>
      </div>
      <div>
        <InputGroup className="bg-secondary/50 border-0 text-sm rounded-lg hover:bg-secondary/70 transition-colors">
          <InputGroupAddon>
            <Search className="h-4 w-4 text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            placeholder="Search chats..."
            onChange={(e) => onSearch(e.target.value)}
            className="bg-transparent border-0 focus-visible:ring-0 placeholder:text-muted-foreground/60"
          />
        </InputGroup>
      </div>
    </div>
  );
};

export default ChatListHeader;
