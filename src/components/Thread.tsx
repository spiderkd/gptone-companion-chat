"use client";
import { MessageInput } from "./MessageInput";
import MessageList from "./MessageList";
import { useChatThread } from "@/hooks/useChatThread";
import { useThreads } from "@/hooks/useThreads";
import { Loader2, Sparkles, X } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useEffect, useRef, useState } from "react";
import { MessageOptions } from "@/types/message";
import { useUISettings } from "@/contexts/UISettingsContext";
import { getToolCalls, isToolMessage } from "@/services/messageUtils";
import { ChatCompanion } from "./characters/ChatCompanion";
import { motion, useReducedMotion } from "framer-motion";
import { getCharacter } from "@/lib/characters";
import { getPersona } from "@/lib/personas";
import {
  getCharacterByPersonaId,
  isCompanionCheckDue,
  SWITCH_CONFIDENCE_THRESHOLD,
  type PersonaSwitchSuggestion,
} from "@/lib/personaSwitch";
import {
  suggestPersonaSwitch,
  summarizeForPersonaSwitch,
  updateThreadPersona,
  withSwitchSummary,
} from "@/services/personaSwitchService";

interface ThreadProps {
  threadId: string;
  onFirstMessageSent?: (threadId: string) => void;
}

export const Thread = ({ threadId, onFirstMessageSent }: ThreadProps) => {
  const {
    messages,
    isLoadingHistory,
    isSending,
    runStatus,
    activeToolName,
    sendError,
    sendMessage,
    cancelResponse,
    retryLastMessage,
    approveToolExecution,
  } = useChatThread({ threadId });
  const { threads, refetchThreads } = useThreads();
  const { setPersonaId, provider, model, apiKeys, approveAllTools } = useUISettings();
  const firstMessageInitiatedRef = useRef(false);
  const [awaitingFirstResponse, setAwaitingFirstResponse] = useState(false);
  const [localPersonaId, setLocalPersonaId] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<{
    text: string;
    opts?: MessageOptions;
    suggestion: PersonaSwitchSuggestion;
  } | null>(null);
  const [isSwitchingPersona, setIsSwitchingPersona] = useState(false);
  const [isCheckingPersona, setIsCheckingPersona] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);
  const [failedCheck, setFailedCheck] = useState<{ text: string; opts?: MessageOptions } | null>(
    null,
  );
  const operationRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);
  const activeThread = threads.find((thread) => thread.id === threadId);
  const threadPersonaId = localPersonaId || activeThread?.personaId || "efficient";
  const activePersona = getPersona(threadPersonaId);
  const character = getCharacter(threadPersonaId);
  const reduceMotion = useReducedMotion();
  const answeredToolCallIds = new Set(
    messages.filter(isToolMessage).map((message) => message.data.tool_call_id),
  );
  const pendingToolCallIds = messages.flatMap((message) =>
    message.type === "ai"
      ? getToolCalls(message)
          .map((toolCall) => toolCall.id)
          .filter((id) => id && !answeredToolCallIds.has(id))
      : [],
  );
  const hasPendingToolApproval = pendingToolCallIds.length > 0 && !isSending;

  useEffect(() => {
    setPersonaId(threadPersonaId);
  }, [setPersonaId, threadPersonaId]);

  useEffect(() => {
    setLocalPersonaId(null);
    setPendingSwitch(null);
    setIsSwitchingPersona(false);
    setIsCheckingPersona(false);
    setSwitchError(null);
    setFailedCheck(null);
    busyRef.current = false;
    return () => {
      operationRef.current?.abort();
    };
  }, [threadId]);

  const userMessageCount = messages.filter((message) => message.type === "human").length;

  const cooldownKey = `persona-switch-cooldown:${threadId}`;
  const readCooldown = () => {
    if (typeof window === "undefined") return { lastSuggestionAt: -999, lastDismissAt: -999 };
    try {
      const value = JSON.parse(localStorage.getItem(cooldownKey) || "{}") as {
        lastSuggestionAt?: number;
        lastDismissAt?: number;
      };
      return {
        lastSuggestionAt: value.lastSuggestionAt ?? -999,
        lastDismissAt: value.lastDismissAt ?? -999,
      };
    } catch {
      return { lastSuggestionAt: -999, lastDismissAt: -999 };
    }
  };

  const writeCooldown = (patch: { lastSuggestionAt?: number; lastDismissAt?: number }) => {
    if (typeof window === "undefined") return;
    const current = readCooldown();
    try {
      localStorage.setItem(cooldownKey, JSON.stringify({ ...current, ...patch }));
    } catch {}
  };

  const canSuggestSwitch = () => {
    if (pendingSwitch || isSending || hasPendingToolApproval) return false;
    return isCompanionCheckDue(userMessageCount, readCooldown());
  };

  const sendWithPersona = async (
    text: string,
    opts?: MessageOptions,
    personaId = threadPersonaId,
  ) => {
    if (messages.length === 0) {
      firstMessageInitiatedRef.current = true;
      setAwaitingFirstResponse(true);
    }
    await sendMessage(text, {
      ...opts,
      personaId,
    });
  };

  const handleSendMessage = async (message: string, opts?: MessageOptions) => {
    if (hasPendingToolApproval || busyRef.current || isSending || pendingSwitch) return;
    busyRef.current = true;
    const operation = new AbortController();
    operationRef.current = operation;
    setSwitchError(null);
    setFailedCheck(null);

    try {
      if (canSuggestSwitch()) {
        setIsCheckingPersona(true);
        try {
          const suggestion = await suggestPersonaSwitch(
            {
              currentPersonaId: threadPersonaId,
              apiKey: apiKeys.codiv,
              userMessage: message,
              messages,
            },
            operation.signal,
          );
          if (operation.signal.aborted) return;
          if (
            suggestion.shouldSuggestSwitch &&
            suggestion.suggestedPersonaId &&
            suggestion.suggestedPersonaId !== threadPersonaId &&
            suggestion.confidence >= SWITCH_CONFIDENCE_THRESHOLD
          ) {
            writeCooldown({ lastSuggestionAt: userMessageCount + 1 });
            setPendingSwitch({ text: message, opts, suggestion });
            return;
          }
        } catch (error) {
          if (operation.signal.aborted) return;
          setSwitchError(error instanceof Error ? error.message : "Companion check failed.");
          setFailedCheck({ text: message, opts });
          return;
        } finally {
          if (!operation.signal.aborted) setIsCheckingPersona(false);
        }
      }

      if (operation.signal.aborted) return;
      await sendWithPersona(message, opts);
    } finally {
      if (operationRef.current === operation) busyRef.current = false;
    }
  };

  const continuePendingSwitch = async (acceptSwitch: boolean) => {
    if (!pendingSwitch || busyRef.current) return;
    busyRef.current = true;
    const operation = new AbortController();
    operationRef.current = operation;
    const pending = pendingSwitch;
    setSwitchError(null);

    if (!acceptSwitch || !pending.suggestion.suggestedPersonaId) {
      writeCooldown({ lastDismissAt: userMessageCount + 1 });
      setPendingSwitch(null);
      try {
        await sendWithPersona(pending.text, pending.opts);
      } finally {
        busyRef.current = false;
      }
      return;
    }

    setIsSwitchingPersona(true);
    try {
      const nextPersonaId = pending.suggestion.suggestedPersonaId;
      const neutralContextSummary = await summarizeForPersonaSwitch(
        {
          messages,
          provider: pending.opts?.provider || provider,
          model: pending.opts?.model || model,
          apiKey: pending.opts?.apiKey || apiKeys[provider],
        },
        operation.signal,
      );
      if (operation.signal.aborted) return;
      await updateThreadPersona(threadId, nextPersonaId);
      if (operation.signal.aborted) return;
      setLocalPersonaId(nextPersonaId);
      setPersonaId(nextPersonaId);
      setPendingSwitch(null);
      void refetchThreads().catch(console.error);
      await sendWithPersona(
        pending.text,
        withSwitchSummary(pending.opts, neutralContextSummary),
        nextPersonaId,
      );
    } catch (error) {
      if (!operation.signal.aborted) {
        setSwitchError(
          error instanceof Error
            ? error.message
            : "Could not switch. Retry or stay with your current companion.",
        );
      }
    } finally {
      if (operationRef.current === operation) {
        busyRef.current = false;
        setIsSwitchingPersona(false);
      }
    }
  };

  const handleApproveToolExecution = async (toolCallId: string, action: "allow" | "deny") => {
    await approveToolExecution(toolCallId, action, {
      provider,
      model,
      apiKey: apiKeys[provider],
      personaId: threadPersonaId,
      approveAllTools,
    });
  };

  // Detect first AI/tool/error message arrival after initial user message to trigger redirect
  useEffect(() => {
    if (awaitingFirstResponse && !isSending) {
      const hasNonHuman = messages.some((m) => m.type !== "human");
      if (hasNonHuman) {
        setAwaitingFirstResponse(false);
        if (onFirstMessageSent) onFirstMessageSent(threadId);
      }
    }
  }, [awaitingFirstResponse, isSending, messages, onFirstMessageSent, threadId]);

  if (isLoadingHistory) {
    return (
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground mt-2">Loading conversation history...</p>
      </div>
    );
  }

  const started = messages.length > 0;
  return (
    <div className="absolute inset-0 flex min-h-0 flex-col overflow-y-auto">
      {started && (
        <div className="min-h-0 flex-1">
          <ScrollArea className="h-full">
            <div className="space-y-4 px-4 py-4 pb-6">
              <MessageList messages={messages} approveToolExecution={handleApproveToolExecution} />
            </div>
          </ScrollArea>
        </div>
      )}
      <motion.div
        layout
        transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
        className={
          started
            ? "mx-auto flex w-full max-w-4xl shrink-0 items-end gap-2 px-3 pb-4 sm:gap-3 sm:px-4"
            : "m-auto w-full max-w-3xl px-4 py-5"
        }
      >
        <motion.div
          layout
          transition={{ duration: reduceMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
          className={
            started
              ? "mb-1 h-20 w-16 shrink-0 sm:h-32 sm:w-28"
              : "mx-auto h-56 w-56 sm:h-64 sm:w-64"
          }
          data-avatar-position={started ? "docked" : "center"}
        >
          <ChatCompanion
            personaId={threadPersonaId}
            thinking={
              isSending || hasPendingToolApproval || isCheckingPersona || isSwitchingPersona
            }
          />
        </motion.div>
        {!started && (
          <div className="mb-5 text-center">
            <h1 className="text-2xl font-semibold">Chat with {character.name}</h1>
            <p className="text-muted-foreground mt-1 text-sm">{activePersona.shortName}</p>
          </div>
        )}
        <div className={started ? "min-w-0 flex-1" : ""}>
          {(pendingSwitch || failedCheck) && (
            <p className="text-muted-foreground mb-2 max-h-24 overflow-auto text-sm break-words whitespace-pre-wrap">
              {pendingSwitch?.text || failedCheck?.text}
            </p>
          )}
          {switchError && (
            <div
              role="alert"
              className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
            >
              <p>{switchError}</p>
              {failedCheck && (
                <div className="mt-2 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isCheckingPersona}
                    onClick={() => void handleSendMessage(failedCheck.text, failedCheck.opts)}
                    className="font-medium underline"
                  >
                    Retry check
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (busyRef.current) return;
                      const pending = failedCheck;
                      setFailedCheck(null);
                      setSwitchError(null);
                      void sendWithPersona(pending.text, pending.opts);
                    }}
                    className="font-medium underline"
                  >
                    Send with {character.name}
                  </button>
                </div>
              )}
            </div>
          )}
          {pendingSwitch && (
            <PersonaSwitchCard
              suggestion={pendingSwitch.suggestion}
              currentPersonaId={threadPersonaId}
              isSwitching={isSwitchingPersona}
              onStay={() => void continuePendingSwitch(false)}
              onSwitch={() => void continuePendingSwitch(true)}
            />
          )}
          <MessageInput
            onSendMessage={handleSendMessage}
            onCancel={isSending ? cancelResponse : undefined}
            onRetry={retryLastMessage}
            isLoading={
              isSending ||
              hasPendingToolApproval ||
              isCheckingPersona ||
              isSwitchingPersona ||
              !!pendingSwitch ||
              !!failedCheck
            }
            runStatus={hasPendingToolApproval ? "using_tools" : runStatus}
            activeToolName={activeToolName || "tools"}
            statusText={
              isCheckingPersona
                ? "Checking companion..."
                : isSwitchingPersona
                  ? "Preparing new companion..."
                  : pendingSwitch
                    ? "Choose whether to switch companion"
                    : hasPendingToolApproval
                      ? "Approve or deny the tool call first"
                      : undefined
            }
            hasRetry={!!sendError}
          />
        </div>
      </motion.div>
    </div>
  );
};

function PersonaSwitchCard({
  suggestion,
  currentPersonaId,
  isSwitching,
  onStay,
  onSwitch,
}: {
  suggestion: PersonaSwitchSuggestion;
  currentPersonaId: string;
  isSwitching: boolean;
  onStay: () => void;
  onSwitch: () => void;
}) {
  const currentCharacter = getCharacter(currentPersonaId);
  const nextCharacter = getCharacterByPersonaId(suggestion.suggestedPersonaId);

  if (!nextCharacter) return null;

  return (
    <div
      role="region"
      aria-label="Companion suggestion"
      className="mb-3 rounded-lg border border-teal-200 bg-white/90 p-3 text-sm shadow-sm backdrop-blur dark:border-teal-400/20 dark:bg-white/[0.06]"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600 dark:bg-teal-400/10 dark:text-teal-300">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            Switch from {currentCharacter.name} to {nextCharacter.name}?
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-gray-300">
            {suggestion.reason}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSwitching}
              onClick={onStay}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-gray-200 px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/10"
            >
              <X className="h-3.5 w-3.5" />
              No, keep {currentCharacter.name}
            </button>
            <button
              type="button"
              disabled={isSwitching}
              onClick={onSwitch}
              className="inline-flex h-8 items-center rounded-full bg-teal-500 px-3 text-xs font-medium text-white transition-colors hover:bg-teal-400 disabled:opacity-60 dark:text-gray-950"
            >
              {isSwitching ? "Switching..." : `Yes, use ${nextCharacter.name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
