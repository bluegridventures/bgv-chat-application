import { memo, useEffect, useState } from "react";
import { useChat } from "@/hooks/use-chat";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { ArrowLeft, PenBoxIcon, Search, UsersIcon } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Spinner } from "../ui/spinner";
import type { UserType } from "../../types/auth.type";
import AvatarWithBadge from "../avatar-with-badge";
import { Checkbox } from "../ui/checkbox";
import { useNavigate } from "react-router-dom";
import { CreateGroupDialog } from "@/components/group/create-group-dialog";

export const NewChatPopover = memo(() => {
  const navigate = useNavigate();
  const { fetchAllUsers, users, isUsersLoading, createChat, isCreatingChat } =
    useChat();

  const [isOpen, setIsOpen] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);

  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, [fetchAllUsers]);

  const toggleUserSelection = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
    );
  };

  const handleBack = () => {
    resetState();
  };

  const resetState = () => {
    setIsGroupMode(false);
    setGroupName("");
    setSelectedUsers([]);
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    resetState();
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers?.length === 0) return;
    const response = await createChat({
      isGroup: true,
      participants: selectedUsers,
      groupName: groupName,
    });
    setIsOpen(false);
    resetState();
    navigate(`/chat/${response?.id}`);
  };

  const handleCreateChat = async (userId: string) => {
    setLoadingUserId(userId);
    try {
      const response = await createChat({
        isGroup: false,
        participantId: userId,
      });
      setIsOpen(false);
      resetState();
      navigate(`/chat/${response?.id}`);
    } finally {
      setLoadingUserId(null);
      setIsOpen(false);
      resetState();
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="h-8 w-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-sm"
        >
          <PenBoxIcon className="!h-4 !w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-80 z-[999] p-0
         rounded-xl min-h-[400px]
         max-h-[80vh] flex flex-col
        "
      >
        <div className="border-b p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {isGroupMode && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft size={16} />
              </Button>
            )}
            <h3 className="text-lg font-semibold">
              {isGroupMode ? "New Group" : "New Chat"}
            </h3>
          </div>

          <InputGroup>
            {isGroupMode ? (
              <InputGroupInput
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
              />
            ) : (
              <InputGroupInput
                placeholder="Search name"
                readOnly
              />
            )}
            <InputGroupAddon>
              {isGroupMode ? <UsersIcon /> : <Search />}
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div
          className="flex-1 justify-center overflow-y-auto
         px-1 py-1 space-y-1
        "
        >
          {isUsersLoading ? (
            <Spinner className="w-6 h-6" />
          ) : users && users?.length === 0 ? (
            <div className="text-center text-muted-foreground">
              No users found
            </div>
          ) : !isGroupMode ? (
            <>
              <NewGroupItem
                disabled={isCreatingChat}
                onClick={() => setIsCreateGroupOpen(true)}
              />
              {users?.map((user) => (
                <ChatUserItem
                  key={user.id}
                  user={user}
                  isLoading={loadingUserId === user.id}
                  disabled={loadingUserId !== null}
                  onClick={handleCreateChat}
                />
              ))}
            </>
          ) : (
            users?.map((user) => (
              <GroupUserItem
                key={user.id}
                user={user}
                isSelected={selectedUsers.includes(user.id)}
                onToggle={toggleUserSelection}
              />
            ))
          )}
        </div>

        {isGroupMode && (
          <div className="border-t p-3">
            <Button
              onClick={handleCreateGroup}
              className="w-full"
              disabled={
                isCreatingChat ||
                !groupName.trim() ||
                selectedUsers.length === 0
              }
            >
              {isCreatingChat && <Spinner className="w-4 h-4" />}
              Create Group
            </Button>
          </div>
        )}
      </PopoverContent>

      {/* WhatsApp-style Create Group Dialog */}
      <CreateGroupDialog
        open={isCreateGroupOpen}
        onOpenChange={setIsCreateGroupOpen}
        users={(users as UserType[]) || []}
        onGroupCreated={(chatId) => {
          setIsCreateGroupOpen(false);
          setIsOpen(false);
          resetState();
          if (chatId) {
            navigate(`/chat/${chatId}`);
          }
        }}
      />
    </Popover>
  );
});
NewChatPopover.displayName = "NewChatPopover";

const UserAvatar = memo(({ user }: { user: UserType }) => (
  <>
    <AvatarWithBadge name={user.name} src={user.avatar ?? ""} />
    <div className="flex-1 min-w-0">
      <h5 className="text-[13.5px] font-medium truncate">{user.name}</h5>
      <p className="text-xs text-muted-foreground">Hey there! I'm using whop</p>
    </div>
  </>
));

UserAvatar.displayName = "UserAvatar";

const NewGroupItem = memo(
  ({ disabled, onClick }: { disabled: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center
       gap-2 p-2 rounded-sm hover:bg-accent
       transition-colors text-left disabled:opacity-50
      "
    >
      <div className="bg-primary/10 p-2 rounded-full">
        <UsersIcon className="size-4 text-primary" />
      </div>
      <span>New Group</span>
    </button>
  )
);

NewGroupItem.displayName = "NewGroupItem";

const ChatUserItem = memo(
  ({
    user,
    isLoading,
    disabled,
    onClick,
  }: {
    user: UserType;
    disabled: boolean;
    isLoading: boolean;
    onClick: (id: string) => void;
  }) => (
    <button
      className="
      relative w-full flex items-center gap-2 p-2
    rounded-sm hover:bg-accent
       transition-colors text-left disabled:opacity-50"
      disabled={isLoading || disabled}
      onClick={() => onClick(user.id)}
    >
      <UserAvatar user={user} />
      {isLoading && <Spinner className="absolute right-2 w-4 h-4 ml-auto" />}
    </button>
  )
);

ChatUserItem.displayName = "ChatUserItem";

const GroupUserItem = memo(
  ({
    user,
    isSelected,
    onToggle,
  }: {
    user: UserType;
    isSelected: boolean;
    onToggle: (id: string) => void;
  }) => (
    <label
      role="button"
      className="w-full flex items-center gap-2 p-2
      rounded-sm hover:bg-accent
       transition-colors text-left
      "
    >
      <UserAvatar user={user} />
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle(user.id)}
      />
    </label>
  )
);

GroupUserItem.displayName = "GroupUserItem";
