import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { ArrowUp, Loader2, Eye, EyeOff, Paperclip, ShieldCheck, X } from "lucide-react";
import { MessageOptions, FileAttachment } from "@/types/message";
import { SettingsPanel } from "./SettingsPanel";
import { useUISettings } from "@/contexts/UISettingsContext";
import { MAX_ATTACHMENTS } from "@/lib/storage/validation";

interface MessageInputProps {
  onSendMessage: (message: string, opts?: MessageOptions) => Promise<void>;
  onCancel?: () => void;
  onRetry?: () => Promise<void> | void;
  isLoading?: boolean;
  runStatus?: "idle" | "thinking" | "using_tools" | "cancelled";
  activeToolName?: string | null;
  statusText?: string;
  hasRetry?: boolean;
  maxLength?: number;
}

export const MessageInput = ({
  onSendMessage,
  onCancel,
  onRetry,
  isLoading = false,
  runStatus = "idle",
  activeToolName = null,
  statusText,
  hasRetry = false,
  maxLength = 2000,
}: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const {
    hideToolMessages,
    toggleToolMessages,
    provider,
    setProvider,
    model,
    setModel,
    apiKeys,
    personaId,
    approveAllTools,
    setApproveAllTools,
  } = useUISettings();

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";
    }
  }, [message]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = Math.max(0, MAX_ATTACHMENTS - attachments.length);
    if (remainingSlots <= 0) {
      alert(`You can attach up to ${MAX_ATTACHMENTS} files per message.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const selectedFiles = Array.from(files).slice(0, remainingSlots);
      if (selectedFiles.length < files.length) {
        alert(
          `Only the first ${remainingSlots} file(s) were selected (max ${MAX_ATTACHMENTS} attachments).`,
        );
      }

      const uploadPromises = selectedFiles.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/agent/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Upload failed");
        }

        const data = await response.json();
        return {
          url: data.url,
          key: data.key,
          name: data.name,
          type: data.type,
          size: data.size,
        } as FileAttachment;
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments((prev) => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error("File upload error:", error);
      alert(error instanceof Error ? error.message : "Failed to upload files");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeAttachment = (key: string) => {
    setAttachments((prev) => prev.filter((att) => att.key !== key));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && attachments.length === 0) || isLoading) return;

    await onSendMessage(message, {
      model,
      provider,
      apiKey: apiKeys[provider],
      personaId,
      tools: [],
      approveAllTools: approveAllTools,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    setMessage("");
    setAttachments([]);
  };
  // Calculate remaining characters
  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars < maxLength * 0.1; // Less than 10% remaining
  const statusLabel =
    statusText ||
    (runStatus === "using_tools"
      ? activeToolName?.toLowerCase().includes("figma")
        ? "Using Figma..."
        : `Using ${activeToolName?.replaceAll("_", " ") || "tools"}...`
      : runStatus === "thinking"
        ? "Thinking..."
        : runStatus === "cancelled"
          ? "Cancelled"
          : "");
  return (
    <form onSubmit={handleSubmit} className="relative">
      <div
        className={`relative mx-auto flex w-full flex-col rounded-[1.35rem] border bg-white/85 shadow-sm backdrop-blur transition-all duration-200 dark:bg-[#12151b]/90 ${
          isFocused
            ? "border-teal-400 shadow-[0_0_0_3px_rgba(45,212,191,0.14)]"
            : "border-gray-200/90 dark:border-white/10"
        }`}
      >
        {/* Settings Panel */}
        <SettingsPanel
          isExpanded={settingsExpanded}
          onToggle={() => setSettingsExpanded(!settingsExpanded)}
          provider={provider}
          setProvider={setProvider}
          model={model}
          setModel={setModel}
        />

        {/* Input Section */}
        <div className="px-3 pt-3 pb-2 sm:px-4">
          {/* File Attachments Display */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.key}
                  className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-white/10"
                >
                  <span className="max-w-[200px] truncate">{attachment.name}</span>
                  <span className="text-xs text-gray-500">
                    ({attachment.size < 1024 ? "<1KB" : `${(attachment.size / 1024).toFixed(0)}KB`})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(attachment.key)}
                    className="ml-1 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    aria-label="Remove attachment"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            <textarea
              value={message}
              ref={textareaRef}
              onChange={(e) => setMessage(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={isLoading ? statusLabel || "Thinking..." : "Type your message..."}
              className="max-h-[180px] min-h-10 flex-1 resize-none overflow-auto bg-transparent py-2 pr-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-gray-100 dark:placeholder:text-gray-500"
              rows={1}
              aria-label="Message input"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            <div className="flex shrink-0 items-center gap-1 pb-1">
              {isLoading && onCancel && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={onCancel}
                  className="h-8 rounded-full px-3 text-xs"
                >
                  Cancel
                </Button>
              )}

              {!isLoading && hasRetry && onRetry && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => void onRetry()}
                  className="h-8 rounded-full px-3 text-xs"
                >
                  Retry
                </Button>
              )}

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || isUploading || attachments.length >= MAX_ATTACHMENTS}
                className="h-8 w-8 rounded-full p-0 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                aria-label="Attach file"
                title="Attach file"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>

              <Button
                type="submit"
                size="sm"
                disabled={(!message.trim() && attachments.length === 0) || isLoading}
                className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full p-0 ${
                  (message.trim() || attachments.length > 0) && !isLoading
                    ? "bg-primary hover:bg-primary/90 text-white dark:bg-teal-500 dark:text-gray-950 dark:hover:bg-teal-400"
                    : "dark:bg-white/10"
                }`}
                aria-label="Send message"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp,application/pdf,text/markdown,text/plain,.md,.markdown,.txt"
            onChange={handleFileSelect}
            className="hidden"
            aria-label="File upload"
          />

          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-white/5">
            <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1.5">
              {/* Character counter */}
              <div
                className={`rounded-full px-2 py-1 text-[11px] ${
                  isNearLimit
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                    : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400"
                }`}
                title="Remaining characters"
              >
                {remainingChars}/{maxLength}
              </div>

              {statusLabel && (
                <div className="flex items-center gap-1.5 rounded-full bg-teal-50 px-2 py-1 text-[11px] text-teal-700 dark:bg-teal-400/10 dark:text-teal-300">
                  {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{statusLabel}</span>
                </div>
              )}

              {/* Auto-approve tools setting - always visible */}
              <label
                className="flex cursor-pointer items-center gap-1.5 rounded-full px-2 py-1 text-[11px] text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
                title="Auto-approve tools"
              >
                <input
                  type="checkbox"
                  checked={approveAllTools}
                  onChange={(e) => setApproveAllTools(e.target.checked)}
                  className="sr-only"
                />
                <ShieldCheck
                  className={`h-3.5 w-3.5 ${approveAllTools ? "text-teal-500" : "text-gray-400"}`}
                />
                <span>Auto</span>
              </label>

              {/* Tool messages toggle */}
              <button
                type="button"
                onClick={toggleToolMessages}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[11px] transition-colors hover:bg-gray-100 dark:hover:bg-white/5"
                aria-label={hideToolMessages ? "Show tool messages" : "Hide tool messages"}
                title={hideToolMessages ? "Show tool messages" : "Hide tool messages"}
              >
                {hideToolMessages ? (
                  <EyeOff className="h-3.5 w-3.5 text-gray-500" />
                ) : (
                  <Eye className="h-3.5 w-3.5 text-gray-500" />
                )}
                <span className="text-gray-600 dark:text-gray-300">
                  {hideToolMessages ? "Show tools" : "Hide tools"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
