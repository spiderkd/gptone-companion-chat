import type { MessageOptions, MessageResponse, Thread } from "@/types/message";
import type { PersonaSwitchSuggestion } from "@/lib/personaSwitch";

export interface SuggestPersonaSwitchInput {
  apiKey?: string;
  currentPersonaId: string;
  userMessage: string;
  messages: MessageResponse[];
}

export async function suggestPersonaSwitch(
  input: SuggestPersonaSwitchInput,
  signal?: AbortSignal,
): Promise<PersonaSwitchSuggestion> {
  const response = await fetch("/api/persona/suggest-switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      ...input,
      messages: input.messages
        .filter((message) => message.type === "human" || message.type === "ai")
        .slice(-2)
        .map((message) => ({
          type: message.type,
          data: {
            content: (typeof message.data.content === "string" ? message.data.content : "").slice(
              0,
              1500,
            ),
          },
        })),
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to suggest companion switch");
  }

  return response.json();
}

export async function summarizeForPersonaSwitch(
  input: {
    messages: MessageResponse[];
    provider?: string;
    model?: string;
    apiKey?: string;
  },
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch("/api/persona/summarize-switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Failed to summarize conversation");
  }

  const data = (await response.json()) as { neutralSummary?: string };
  return data.neutralSummary || "";
}

export async function updateThreadPersona(threadId: string, personaId: string): Promise<Thread> {
  const response = await fetch("/api/agent/threads", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: threadId, personaId }),
  });

  if (!response.ok) {
    throw new Error((await response.text()) || "Failed to update thread persona");
  }

  return response.json();
}

export function withSwitchSummary(opts: MessageOptions | undefined, neutralContextSummary: string) {
  return {
    ...(opts || {}),
    neutralContextSummary,
  };
}
