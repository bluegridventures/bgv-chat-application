import { useState, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Camera, Loader2, Users } from "lucide-react";
import { API } from "@/lib/axios-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { UserType } from "@/types/auth.type";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: UserType[];
  onGroupCreated?: (chatId: string) => void;
}

export const CreateGroupDialog = ({
  open,
  onOpenChange,
  users,
  onGroupCreated,
}: CreateGroupDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [groupAvatar, setGroupAvatar] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    groupName: "",
    groupDescription: "",
  });

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

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.groupName.trim()) {
      toast.error("Group name is required");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await API.post("/group/create", {
        groupName: formData.groupName,
        groupDescription: formData.groupDescription,
        groupAvatar: groupAvatar,
        participantIds: selectedUsers,
      });

      toast.success("Group created successfully!");
      onOpenChange(false);
      resetForm();
      if (data?.chat?.id) {
        onGroupCreated?.(data.chat.id);
      } else {
        onGroupCreated?.("");
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ groupName: "", groupDescription: "" });
    setGroupAvatar(null);
    setSelectedUsers([]);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Create New Group
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div
                className={cn(
                  "w-20 h-20 rounded-full overflow-hidden bg-secondary flex items-center justify-center",
                  "ring-2 ring-border group-hover:ring-primary transition-all cursor-pointer"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {groupAvatar ? (
                  <img
                    src={groupAvatar}
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
                Click to upload (max 5MB)
              </p>
            </div>
          </div>

          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name *</Label>
            <Input
              id="groupName"
              value={formData.groupName}
              onChange={(e) =>
                setFormData({ ...formData, groupName: e.target.value })
              }
              placeholder="Enter group name"
              required
              className="bg-secondary/50 border-border/50"
            />
          </div>

          {/* Group Description */}
          <div className="space-y-2">
            <Label htmlFor="groupDescription">Description</Label>
            <Textarea
              id="groupDescription"
              value={formData.groupDescription}
              onChange={(e) =>
                setFormData({ ...formData, groupDescription: e.target.value })
              }
              placeholder="What's this group about?"
              rows={3}
              className="bg-secondary/50 border-border/50 resize-none"
            />
          </div>

          {/* Member Selection */}
          <div className="space-y-3">
            <Label>Add Members ({selectedUsers.length} selected)</Label>
            <div className="border border-border/50 rounded-lg p-3 max-h-[200px] overflow-y-auto space-y-2">
              {users.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users available
                </p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                  >
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={() => handleUserToggle(user.id)}
                    />
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar || ""} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <label
                      htmlFor={user.id}
                      className="flex-1 text-sm cursor-pointer"
                    >
                      {user.name}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Group"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
