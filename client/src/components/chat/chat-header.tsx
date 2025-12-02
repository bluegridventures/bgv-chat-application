import { getOtherUserAndGroup } from "@/lib/helper";
import { PROTECTED_ROUTES } from "@/routes/routes";
import type { ChatType } from "@/types/chat.type";
import { ChevronLeft, Settings, Phone, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AvatarWithBadge from "../avatar-with-badge";
import { Button } from "../ui/button";
import { useCalls } from "@/hooks/use-calls";
import { useGroupCall } from "@/hooks/use-group-call";

interface Props {
  chat: ChatType;
  currentUserId: string | null;
  onGroupSettingsClick?: () => void;
}
const ChatHeader = ({ chat, currentUserId, onGroupSettingsClick }: Props) => {
  const navigate = useNavigate();
  const { name, subheading, avatar, isOnline, isGroup } = getOtherUserAndGroup(
    chat,
    currentUserId
  );
  const { startCall, inCall } = useCalls();
  const { startGroupCall } = useGroupCall();

  const otherUser = !isGroup
    ? chat.participants?.find((p) => p.id !== currentUserId)
    : null;

  return (
    <div
      className="sticky top-0
    flex items-center gap-5 border-b border-border
    bg-card px-2 z-50
    "
    >
      <div className="h-14 px-4 flex items-center justify-between w-full">
        <div className="flex items-center">
          <div>
            <ChevronLeft
              className="w-8 h-8 inline-block lg:hidden
          text-muted-foreground cursor-pointer
          mr-2
          "
              onClick={() => navigate(PROTECTED_ROUTES.CHAT)}
            />
          </div>
          <AvatarWithBadge
            name={name}
            src={avatar}
            isGroup={isGroup}
            isOnline={isOnline}
          />
          <div className="ml-2">
            <h5 className="font-bold capitalize">{name}</h5>
            <p
              className={`text-sm font-bold ${
                isOnline ? "text-green-500" : "text-muted-foreground"
              }`}
            >
              {subheading}
            </p>
          </div>
        </div>
        {!isGroup && otherUser?.id && (
          <div className="flex items-center gap-2 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => !inCall && startCall(chat.id, otherUser.id, "audio")}
            >
              <Phone className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => !inCall && startCall(chat.id, otherUser.id, "video")}
            >
              <Video className="w-5 h-5" />
            </Button>
          </div>
        )}
        {isGroup && (
          <div className="flex items-center gap-2 mr-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startGroupCall(chat.id, "audio")}
            >
              <Phone className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => startGroupCall(chat.id, "video")}
            >
              <Video className="w-5 h-5" />
            </Button>
            {onGroupSettingsClick && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onGroupSettingsClick}
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </div>
        )}
      </div>
      {/* <div>
        <div
          className={`flex-1
            text-center
            py-4 h-full
            border-b-2
            border-primary
            font-medium
            text-primary`}
        >
          Chat
        </div>
      </div> */}
    </div>
  );
};

export default ChatHeader;
