import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface DeleteChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  chatName: string;
  isGroup: boolean;
  isAdmin?: boolean;
  isLoading?: boolean;
}

export const DeleteChatDialog = ({
  open,
  onOpenChange,
  onConfirm,
  chatName,
  isGroup,
  isAdmin = false,
  isLoading = false,
}: DeleteChatDialogProps) => {
  const getTitle = () => {
    if (!isGroup) return "Delete Chat?";
    return isAdmin ? "Delete Group?" : "Leave Group?";
  };

  const getDescription = () => {
    if (!isGroup) {
      return `Are you sure you want to delete this chat with ${chatName}? This action cannot be undone and all messages will be permanently deleted.`;
    }
    
    if (isAdmin) {
      return `Are you sure you want to delete the group "${chatName}"? This will delete the group for all members. This action cannot be undone and all messages will be permanently deleted.`;
    }
    
    return `Are you sure you want to leave the group "${chatName}"? You will no longer receive messages from this group.`;
  };

  const getButtonText = () => {
    if (!isGroup) return "Delete";
    return isAdmin ? "Delete Group" : "Leave Group";
  };
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {getTitle()}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {getDescription()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isGroup && !isAdmin ? "Leaving..." : "Deleting..."}
              </>
            ) : (
              getButtonText()
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
