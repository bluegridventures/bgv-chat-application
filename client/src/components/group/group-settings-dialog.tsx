import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Loader2,
  Users,
  UserPlus,
  UserMinus,
  Shield,
  LogOut,
} from "lucide-react";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ChatType } from "@/types/chat.type";
import type { UserType } from "@/types/auth.type";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chat: ChatType | null;
  availableUsers: UserType[];
  onGroupUpdated?: () => void;
}

export const GroupSettingsDialog = ({
  open,
  onOpenChange,
  chat,
  availableUsers,
  onGroupUpdated,
}: GroupSettingsDialogProps) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    groupName: "",
    groupDescription: "",
  });

  const isAdmin = chat?.group_admin_id === user?.id || chat?.groupAdminId === user?.id;

  useEffect(() => {
    if (chat) {
      setFormData({
        groupName: chat.group_name || chat.groupName || "",
        groupDescription: chat.group_description || chat.groupDescription || "",
      });
      setGroupAvatar(null);
    }
  }, [chat]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setGroupAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateGroup = async () => {
    if (!chat || !isAdmin) return;

    setIsLoading(true);
    try {
      await API.put(`/group/${chat.id}`, {
        groupName: formData.groupName,
        groupDescription: formData.groupDescription,
        groupAvatar: groupAvatar,
      });

      toast.success("Group updated successfully!");
      onGroupUpdated?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update group");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (userId: string) => {
    if (!chat) return;

    try {
      await API.post(`/group/${chat.id}/members`, { memberId: userId });
      toast.success("Member added successfully!");
      onGroupUpdated?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!chat) return;

    try {
      await API.delete(`/group/${chat.id}/members/${userId}`);
      toast.success("Member removed successfully!");
      onGroupUpdated?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to remove member");
    }
  };

  const handleLeaveGroup = async () => {
    if (!chat) return;

    if (isAdmin) {
      toast.error("Admin must transfer admin rights before leaving");
      return;
    }

    try {
      await API.post(`/group/${chat.id}/leave`);
      toast.success("Left group successfully!");
      onOpenChange(false);
      onGroupUpdated?.();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to leave group");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const currentMembers = chat?.participants || [];
  const nonMembers = availableUsers.filter(
    (u) => !currentMembers.some((m) => m.id === u.id)
  );

  if (!chat) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Group Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Group Info */}
          {isAdmin && (
            <>
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div
                    className={cn(
                      "w-20 h-20 rounded-full overflow-hidden bg-secondary flex items-center justify-center",
                      "ring-2 ring-border group-hover:ring-primary transition-all cursor-pointer"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {groupAvatar || chat.group_avatar || chat.groupAvatar ? (
                      <img
                        src={groupAvatar || chat.group_avatar || chat.groupAvatar || ""}
                        alt="Group"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-8 h-8 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Group Photo</p>
                  <p className="text-xs text-muted-foreground">
                    Click to change (max 5MB)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    value={formData.groupName}
                    onChange={(e) =>
                      setFormData({ ...formData, groupName: e.target.value })
                    }
                    className="bg-secondary/50 border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="groupDescription">Description</Label>
                  <Textarea
                    id="groupDescription"
                    value={formData.groupDescription}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        groupDescription: e.target.value,
                      })
                    }
                    rows={3}
                    className="bg-secondary/50 border-border/50 resize-none"
                  />
                </div>

                <Button
                  onClick={handleUpdateGroup}
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Group Info"
                  )}
                </Button>
              </div>

              <Separator />
            </>
          )}

          {/* Members List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">
                Members ({currentMembers.length})
              </Label>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddMembers(!showAddMembers)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Members
                </Button>
              )}
            </div>

            {/* Add Members Section */}
            {showAddMembers && isAdmin && (
              <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-secondary/20">
                <p className="text-sm font-medium">Available Users</p>
                <div className="max-h-[150px] overflow-y-auto space-y-2">
                  {nonMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No users available to add
                    </p>
                  ) : (
                    nonMembers.map((availableUser) => (
                      <div
                        key={availableUser.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50"
                      >
                        <Avatar className="w-8 h-8">
                          <AvatarImage
                            src={availableUser.avatar || ""}
                            alt={availableUser.name}
                          />
                          <AvatarFallback className="text-xs">
                            {getInitials(availableUser.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="flex-1 text-sm">{availableUser.name}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleAddMember(availableUser.id)}
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Current Members */}
            <div className="border border-border/50 rounded-lg p-3 max-h-[250px] overflow-y-auto space-y-2">
              {currentMembers.map((member) => {
                const isMemberAdmin =
                  member.id === chat.group_admin_id ||
                  member.id === chat.groupAdminId;
                const isCurrentUser = member.id === user?.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50"
                  >
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.avatar || ""} alt={member.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {member.name}
                        {isCurrentUser && " (You)"}
                      </p>
                      {isMemberAdmin && (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                    </div>
                    {isAdmin && !isMemberAdmin && !isCurrentUser && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <UserMinus className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Leave Group */}
          {!isAdmin && (
            <>
              <Separator />
              <Button
                variant="destructive"
                onClick={handleLeaveGroup}
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Leave Group
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
