import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { API } from "@/lib/axios-client";
import type { UserType } from "@/types/auth.type";
import { Loader2, Mail, User, Briefcase, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface UserProfileDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UserProfileDialog = ({
  userId,
  open,
  onOpenChange,
}: UserProfileDialogProps) => {
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (userId && open) {
      fetchUserProfile();
    }
  }, [userId, open]);

  const fetchUserProfile = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data } = await API.get(`/user/${userId}`);
      setUser(data.user);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setIsLoading(false);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : user ? (
          <>
            {/* Header with gradient background */}
            <div className="relative h-32 bg-gradient-to-br from-primary/20 via-primary/10 to-background">
              <div className="absolute -bottom-12 left-6">
                <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                  <AvatarImage src={user.avatar || ""} alt={user.name} />
                  <AvatarFallback className="text-2xl font-semibold bg-primary/10">
                    {getInitials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            {/* Content */}
            <div className="pt-14 px-6 pb-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="text-2xl font-bold">
                  {user.name}
                </DialogTitle>
                {user.username && (
                  <p className="text-sm text-muted-foreground">
                    @{user.username}
                  </p>
                )}
              </DialogHeader>

              {/* Bio */}
              {user.bio && (
                <div className="mb-6">
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {user.bio}
                  </p>
                </div>
              )}

              <Separator className="my-4" />

              {/* User Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-foreground/90">{user.email}</span>
                </div>

                {user.role && (
                  <div className="flex items-center gap-3 text-sm">
                    <Briefcase className="w-4 h-4 text-muted-foreground" />
                    <span className="text-foreground/90">{user.role}</span>
                  </div>
                )}

                {user.created_at && (
                  <div className="flex items-center gap-3 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      Joined{" "}
                      {formatDistanceToNow(new Date(user.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* AI Badge */}
              {user.is_ai && (
                <div className="mt-4">
                  <Badge variant="secondary" className="gap-1">
                    <User className="w-3 h-3" />
                    AI Assistant
                  </Badge>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-muted-foreground">User not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
