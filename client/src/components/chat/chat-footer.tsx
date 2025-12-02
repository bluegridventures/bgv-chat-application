import { z } from "zod";
import type { MessageType } from "@/types/chat.type";
import { useRef, useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Paperclip, Send, X, Mic, Square } from "lucide-react";
import { Form, FormField, FormItem } from "../ui/form";
import { Input } from "../ui/input";
import ChatReplyBar from "./chat-reply-bar";
import { useChat } from "@/hooks/use-chat";
import { useSocket } from "@/hooks/use-socket";
import VoiceNotePlayer from "@/components/media/voice-note-player";

interface Props {
  chatId: string | null;
  currentUserId: string | null;
  replyTo: MessageType | null;
  onCancelReply: () => void;
}
const ChatFooter = ({
  chatId,
  currentUserId,
  replyTo,
  onCancelReply,
}: Props) => {
  const messageSchema = z.object({
    message: z.string().optional(),
  });

  const resizeImage = (dataUrl: string, maxWidth = 1280, quality = 0.8): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = height * ratio;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", quality);
        resolve(compressed);
      };

      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  };

  const { sendMessage, isSendingMsg } = useChat();
  const { socket } = useSocket();

  const [image, setImage] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);

  // Audio recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingIntervalRef = useRef<number | null>(null);

  const form = useForm({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      message: "",
    },
  });

  // Typing indicator functions
  const startTyping = useCallback(() => {
    if (!chatId || !socket || isTyping) return;
    
    setIsTyping(true);
    socket.emit("typing:start", chatId);
  }, [chatId, socket, isTyping]);

  const stopTyping = useCallback(() => {
    if (!chatId || !socket || !isTyping) return;
    
    setIsTyping(false);
    socket.emit("typing:stop", chatId);
  }, [chatId, socket, isTyping]);

  const handleTyping = useCallback(() => {
    if (!chatId || !socket) return;

    // Start typing if not already
    if (!isTyping) {
      startTyping();
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, 2000);
  }, [chatId, socket, isTyping, startTyping, stopTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (isTyping) {
        stopTyping();
      }
    };
  }, [isTyping, stopTyping]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const compressed = await resizeImage(base64, 1280, 0.8);
      setImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  // Audio recording handlers
  const startRecording = async () => {
    try {
      if (!("MediaRecorder" in window)) {
        toast.error("Voice recording is not supported in this browser");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setAudioDataUrl(reader.result as string);
        reader.readAsDataURL(blob);
        // stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      recordingIntervalRef.current = window.setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      toast.error(err?.message || "Unable to start recording");
    }
  };

  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const cancelRecording = () => {
    try {
      if (isRecording) {
        stopRecording();
      }
    } finally {
      setAudioDataUrl(null);
      audioChunksRef.current = [];
      setRecordingSeconds(0);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const onSubmit = (values: { message?: string }) => {
    if (isSendingMsg) return;
    if (!values.message?.trim() && !image && !audioDataUrl) {
      toast.error("Please enter a message, select an image, or record a voice note");
      return;
    }
    
    // Stop typing when sending message
    if (isTyping) {
      stopTyping();
    }
    
    const payload = {
      chatId,
      content: values.message,
      image: image || undefined,
      audio: audioDataUrl || undefined,
      replyTo: replyTo,
    };
    //Send Message
    sendMessage(payload);

    onCancelReply();
    handleRemoveImage();
    setAudioDataUrl(null);
    form.reset();
  };
  return (
    <>
      <div
        className="sticky bottom-0
       inset-x-0 z-[999]
       bg-card border-t border-border py-4
      "
      >
        {isRecording && (
          <div className="max-w-6xl mx-auto px-8.5 mb-2">
            <div className="flex items-center gap-3 p-2 rounded-lg border border-destructive/30 bg-destructive/10">
              <span className="inline-flex items-center gap-2 text-destructive font-medium text-sm">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
                Recording {`${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, "0")}`}
              </span>
              <div className="ml-auto flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="rounded-full"
                  onClick={stopRecording}
                  title="Stop recording"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  onClick={cancelRecording}
                  title="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
        {audioDataUrl && !isSendingMsg && (
          <div className="max-w-6xl mx-auto px-8.5 mb-2">
            <div className="flex items-center gap-2">
              <VoiceNotePlayer src={audioDataUrl} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={cancelRecording}
                title="Remove voice note"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
        {image && !isSendingMsg && (
          <div className="max-w-6xl mx-auto px-8.5">
            <div className="relative w-fit">
              <img
                src={image}
                className="object-contain h-16 bg-muted min-w-16"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-px right-1
                 bg-black/50 text-white rounded-full
                 cursor-pointer
                "
                onClick={handleRemoveImage}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="max-w-6xl px-8.5 mx-auto
            flex items-end gap-2
            "
          >
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={isSendingMsg}
                className="rounded-full"
                onClick={() => imageInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                disabled={isSendingMsg}
                ref={imageInputRef}
                onChange={handleImageChange}
              />
              <Button
                type="button"
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                disabled={isSendingMsg}
                className="rounded-full"
                onClick={() => (isRecording ? stopRecording() : startRecording())}
                title={isRecording ? "Stop recording" : "Record voice note"}
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
            </div>
            <FormField
              control={form.control}
              name="message"
              disabled={isSendingMsg}
              render={({ field }) => (
                <FormItem className="flex-1">
                  <Input
                    {...field}
                    autoComplete="off"
                    placeholder="Type new message"
                    className="min-h-[40px] bg-background"
                    onChange={(e) => {
                      field.onChange(e);
                      handleTyping();
                    }}
                  />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              size="icon"
              className="rounded-lg"
              disabled={isSendingMsg}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </Form>
      </div>

      {replyTo && !isSendingMsg && (
        <ChatReplyBar
          replyTo={replyTo}
          currentUserId={currentUserId}
          onCancel={onCancelReply}
        />
      )}
    </>
  );
};

export default ChatFooter;
