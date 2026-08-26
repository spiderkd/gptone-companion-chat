import { ensureAgent } from "@/lib/agent";
import { ensureThread } from "@/lib/thread";
import type { MessageOptions, MessageResponse, ToolCall } from "@/types/message";
import prisma from "@/lib/database/prisma";
import { getHistory } from "@/lib/agent/memory";
import { BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import { Command } from "@langchain/langgraph";
import { processAttachmentsForAI } from "@/lib/storage/content";
import { buildPersonaSystemPrompt } from "@/lib/personas";

/**
 * Returns an async iterable producing incremental AI text chunks for a user text input.
 * Thread is ensured before streaming. The consumer (route) can package into SSE or any protocol.
 */
export async function streamResponse(params: {
  threadId: string;
  userText: string;
  opts?: MessageOptions;
  signal?: AbortSignal;
}) {
  const { threadId, userText, opts, signal } = params;
  const thread = await ensureThread(threadId, userText, opts?.personaId);
  const threadPersonaId = thread.personaId || opts?.personaId;

  // If allowTool is present, use Command with resume action instead of regular inputs
  if (opts?.allowTool) {
    const inputs = new Command({
      resume: {
        action: opts.allowTool === "allow" ? "continue" : "feedback",
        data:
          opts.allowTool === "allow"
            ? {}
            : "Tool call denied by the user. Continue without using that tool result.",
      },
    });

    const agent = await ensureAgent({
      model: opts?.model,
      provider: opts?.provider,
      apiKey: opts?.apiKey,
      systemPrompt: buildPersonaSystemPrompt(threadPersonaId),
      tools: opts?.tools,
      approveAllTools: opts?.approveAllTools,
    });

    // Type assertion needed for Command union with state update in v1
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const streamOptions = {
      streamMode: ["updates"],
      configurable: { thread_id: threadId },
      signal,
      stepTimeout: Number(process.env.AGENT_STEP_TIMEOUT_MS || 45000),
    };

    const iterable = await agent.stream(inputs as any, streamOptions as any);

    return generator(iterable);
  }

  // Build multimodal message with attachments
  let messageContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;

  if (opts?.attachments && opts.attachments.length > 0) {
    // Process attachments and build content array
    const attachmentContents = await processAttachmentsForAI(opts.attachments);

    // Combine user text with attachment contents
    messageContent = [{ type: "text", text: userText }, ...attachmentContents];
  } else {
    // Simple text message
    messageContent = userText;
  }

  const pendingToolCalls = await getPendingToolCalls(threadId);
  const recoveryToolMessages = pendingToolCalls.map(
    (toolCall) =>
      new ToolMessage({
        status: "error",
        name: toolCall.name,
        tool_call_id: toolCall.id,
        content:
          "Tool call was cancelled or left unfinished before a result was returned. Continue from the user's latest message without using that tool result.",
      }),
  );

  const userMessage = new HumanMessage({ id: crypto.randomUUID(), content: messageContent });
  const inputs = {
    messages: [...recoveryToolMessages, userMessage],
    ...(opts?.neutralContextSummary
      ? {
          neutralContextSummary: opts.neutralContextSummary,
          contextStartId: userMessage.id,
        }
      : {}),
  };

  const agent = await ensureAgent({
    model: opts?.model,
    provider: opts?.provider,
    apiKey: opts?.apiKey,
    systemPrompt: buildPersonaSystemPrompt(threadPersonaId),
    tools: opts?.tools,
    approveAllTools: opts?.approveAllTools,
  });

  // Type assertion needed for Command union with state update in v1
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const streamOptions = {
    streamMode: ["updates"],
    configurable: { thread_id: threadId },
    signal,
    stepTimeout: Number(process.env.AGENT_STEP_TIMEOUT_MS || 45000),
  };

  const iterable = await agent.stream(inputs as any, streamOptions as any);

  return generator(iterable);
}

async function getPendingToolCalls(threadId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const history = await getHistory(threadId);
    const answeredToolCallIds = new Set(
      history
        .filter((message) => message.getType() === "tool")
        .map((message) => (message as unknown as { tool_call_id?: string }).tool_call_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );

    return history.flatMap((message) => {
      if (message.getType() !== "ai") return [];
      const toolCalls = (
        message as unknown as { tool_calls?: Array<{ id?: string; name?: string }> }
      ).tool_calls;
      if (!Array.isArray(toolCalls)) return [];

      return toolCalls
        .filter((toolCall) => toolCall.id && !answeredToolCallIds.has(toolCall.id))
        .map((toolCall) => ({
          id: toolCall.id!,
          name: toolCall.name || "tool",
        }));
    });
  } catch (error) {
    console.error("pending tool check failed", error);
    return [];
  }
}

// Helper generator function to process stream chunks
async function* generator(
  iterable: AsyncIterable<unknown>,
): AsyncGenerator<MessageResponse, void, unknown> {
  for await (const chunk of iterable) {
    if (!chunk) continue;

    // Handle tuple format: [type, data]
    if (Array.isArray(chunk) && chunk.length === 2) {
      const [chunkType, chunkData] = chunk;

      if (
        chunkType === "updates" &&
        chunkData &&
        typeof chunkData === "object" &&
        !Array.isArray(chunkData)
      ) {
        // Handle updates: ['updates', { agent: { messages: [Array] } }]
        yield* processNodeMessages(chunkData, "agent", processAIMessage);
        yield* processNodeMessages(chunkData, "tools", processToolMessage);
      }
    }
  }
}

async function* processNodeMessages(
  chunkData: Record<string, unknown>,
  nodeName: "agent" | "tools",
  processor: (message: Record<string, unknown>) => MessageResponse | null,
) {
  const nodeData = chunkData[nodeName];
  if (
    !nodeData ||
    typeof nodeData !== "object" ||
    Array.isArray(nodeData) ||
    !("messages" in nodeData)
  ) {
    return;
  }

  const messages = Array.isArray(nodeData.messages) ? nodeData.messages : [nodeData.messages];
  for (const message of messages) {
    if (!message) continue;
    const processedMessage = processor(message as Record<string, unknown>);
    if (processedMessage) {
      yield processedMessage;
    }
  }
}

// Helper function to process any AI message and return the appropriate MessageResponse
function processAIMessage(message: Record<string, unknown>): MessageResponse | null {
  const toolCalls = Array.isArray(message.tool_calls) ? (message.tool_calls as ToolCall[]) : [];

  // Check both OpenAI-style tool_calls and Gemini-style content functionCall blocks.
  const hasToolCall =
    toolCalls.length > 0 ||
    (Array.isArray(message.content) &&
      message.content.some(
        (item: unknown) => item && typeof item === "object" && "functionCall" in item,
      ));

  if (hasToolCall) {
    // Return full AIMessageData for tool calls to preserve all information
    return {
      type: "ai",
      data: {
        id: (message.id as string) || Date.now().toString(),
        content: typeof message.content === "string" ? message.content : "",
        tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
        additional_kwargs: (message.additional_kwargs as Record<string, unknown>) || undefined,
        response_metadata: (message.response_metadata as Record<string, unknown>) || undefined,
      },
    };
  } else {
    // Handle regular text content - extract text from various content types
    let text = "";
    if (typeof message.content === "string") {
      text = message.content;
    } else if (Array.isArray(message.content)) {
      text = message.content
        .map((c: string | { text?: string }) => (typeof c === "string" ? c : c?.text || ""))
        .join("");
    } else {
      text = String(message.content ?? "");
    }

    // Only return message if we have actual text content
    if (text.trim()) {
      return {
        type: "ai",
        data: { id: (message.id as string) || Date.now().toString(), content: text },
      };
    }
  }
  return null;
}

function processToolMessage(message: Record<string, unknown>): MessageResponse | null {
  const isToolMessage =
    message?.constructor?.name === "ToolMessage" ||
    (typeof message === "object" && message !== null && "tool_call_id" in message);

  if (!isToolMessage) return null;

  const content =
    typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? "");

  return {
    type: "tool",
    data: {
      id: (message.id as string) || `tool-${Date.now()}`,
      content,
      status: (message.status as string) || "success",
      tool_call_id: (message.tool_call_id as string) || "",
      name: (message.name as string) || "tool",
      artifact: (message.artifact as unknown[]) || undefined,
      additional_kwargs: (message.additional_kwargs as Record<string, unknown>) || undefined,
      response_metadata: (message.response_metadata as Record<string, unknown>) || undefined,
    },
  };
}

/** Fetch prior messages for a thread from the LangGraph checkpoint/memory system. */
export async function fetchThreadHistory(threadId: string): Promise<MessageResponse[]> {
  const thread = await prisma.thread.findUnique({ where: { id: threadId } });
  if (!thread) return [];
  try {
    const history = await getHistory(threadId);
    return history.map((msg: BaseMessage) => msg.toDict() as MessageResponse);
  } catch (e) {
    console.error("fetchThreadHistory error", e);
    return [];
  }
}
