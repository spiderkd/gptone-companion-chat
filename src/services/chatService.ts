import type { MessageOptions, MessageResponse, Thread } from "@/types/message";

export interface ChatServiceConfig {
  baseUrl?: string;
  endpoints?: {
    history?: string;
    chat?: string;
    stream?: string;
    threads?: string;
  };
  headers?: Record<string, string>;
}

const config: ChatServiceConfig = {
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || "/api/agent",
  endpoints: {
    history: "/history",
    chat: "/chat",
    stream: "/stream",
    threads: "/threads",
  },
};

function getUrl(endpoint: keyof Required<ChatServiceConfig>["endpoints"]): string {
  return `${config.baseUrl}${config.endpoints?.[endpoint] || ""}`;
}

export interface MessageStream {
  onmessage: ((event: MessageEvent<string>) => void) | null;
  addEventListener: (event: "done" | "error", callback: (event: MessageEvent<string>) => void) => void;
  close: () => void;
}

export async function fetchMessageHistory(threadId: string): Promise<MessageResponse[]> {
  const response = await fetch(`${getUrl("history")}/${threadId}`, {
    headers: config.headers,
  });
  if (!response.ok) {
    throw new Error("Failed to load history");
  }
  const data = await response.json();
  return data as MessageResponse[];
}

export function createMessageStream(
  threadId: string,
  message: string,
  opts?: MessageOptions,
): MessageStream {
  const controller = new AbortController();
  const listeners: Record<"done" | "error", Array<(event: MessageEvent<string>) => void>> = {
    done: [],
    error: [],
  };

  const stream: MessageStream = {
    onmessage: null,
    addEventListener: (event, callback) => {
      listeners[event].push(callback);
    },
    close: () => controller.abort(),
  };

  const emit = (event: "message" | "done" | "error", data: string) => {
    const messageEvent = new MessageEvent(event, { data });
    if (event === "message") {
      stream.onmessage?.(messageEvent);
      return;
    }
    listeners[event].forEach((listener) => listener(messageEvent));
  };

  const parseSSE = (block: string) => {
    const lines = block.split(/\r?\n/);
    let event: "message" | "done" | "error" = "message";
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) {
        const name = line.slice("event:".length).trim();
        if (name === "done" || name === "error") event = name;
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice("data:".length).trimStart());
      }
    }

    if (dataLines.length > 0 || event !== "message") {
      emit(event, dataLines.join("\n"));
    }
  };

  (async () => {
    try {
      const response = await fetch(getUrl("stream"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...config.headers,
        },
        body: JSON.stringify({ threadId, content: message, ...opts }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error((await response.text()) || "Failed to start stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || "";
        parts.forEach(parseSSE);
      }

      if (buffer.trim()) parseSSE(buffer);
    } catch (error) {
      if (controller.signal.aborted) return;
      emit(
        "error",
        JSON.stringify({
          message: error instanceof Error ? error.message : "An error occurred while streaming.",
        }),
      );
    }
  })();

  return stream;
}

export async function fetchThreads(): Promise<Thread[]> {
  const response = await fetch(getUrl("threads"), {
    headers: config.headers,
  });
  if (!response.ok) {
    throw new Error("Failed to load threads");
  }
  return await response.json();
}

export async function createNewThread(personaId?: string): Promise<Thread> {
  const response = await fetch(getUrl("threads"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({ personaId }),
  });
  if (!response.ok) {
    throw new Error("Failed to create thread");
  }
  return await response.json();
}

export async function deleteThread(threadId: string): Promise<void> {
  const response = await fetch(getUrl("threads"), {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...config.headers,
    },
    body: JSON.stringify({ id: threadId }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to delete thread");
  }
}
