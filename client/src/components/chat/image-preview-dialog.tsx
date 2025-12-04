import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImagePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageName?: string;
}

export const ImagePreviewDialog = ({
  open,
  onOpenChange,
  imageUrl,
  imageName = "Image",
}: ImagePreviewDialogProps) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = imageName || "image";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to download image:", error);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.25, 0.25));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const resetTransforms = () => {
    setZoom(1);
    setRotation(0);
  };

  const handleClose = () => {
    resetTransforms();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="w-[100vw] h-[100svh] max-w-none rounded-none p-0 overflow-hidden sm:max-w-4xl sm:h-auto sm:max-h-[90vh] sm:rounded-lg"
      >
        <DialogHeader className="p-3 pb-2 sm:p-4 sm:pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg font-semibold truncate">
              {imageName}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={zoom <= 0.25}
                className="h-8 w-8"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm text-muted-foreground min-w-[3rem] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="h-8 w-8"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRotate}
                className="h-8 w-8"
              >
                <RotateCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="h-8 w-8"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto p-2 pt-2 sm:p-4 sm:pt-2">
          <div className="flex items-center justify-center min-h-[60svh] sm:min-h-[400px]">
            <img
              src={imageUrl}
              alt={imageName}
              className={cn(
                "block h-auto max-w-none object-contain transition-transform duration-200 select-none",
                "cursor-grab active:cursor-grabbing"
              )}
              style={{
                width: `${Math.max(zoom, 0.25) * 100}%`,
                transform: `rotate(${rotation}deg)`,
              }}
              draggable={false}
              onDoubleClick={resetTransforms}
            />
          </div>
        </div>

        <div className="p-3 pt-2 sm:p-4 sm:pt-2 border-t bg-muted/20">
          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <span>Double-tap image to reset zoom and rotation</span>
            <Button
              variant="outline"
              size="sm"
              onClick={resetTransforms}
              className="h-8"
            >
              Reset
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
