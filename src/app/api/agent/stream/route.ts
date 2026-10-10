import { NextRequest } from "next/server";
import { streamResponse } from "@/services/agentService";
import type { MessageResponse, FileAttachment } from "@/types/message";
import { getThreadOwner } from "@/lib/threadOwner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface StreamPayload {
  content?: string;
  threadId?: string;
  model?: string;
  provider?: string;
  apiKey?: string;
  personaId?: string;
  allowTool?: "allow" | "deny";
  tools?: string[];
  approveAllTools?: boolean;
  attachments?: FileAttachment[];
  neutralContextSummary?: string;
}

function streamAgent(req: NextRequest, payload: StreamPayload) {
  const owner = getThreadOwner(req);
  const encoder = new TextEncoder();
  const abortController = new AbortController();
  let isClosed = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (data: MessageResponse) => {
        if (isClosed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // Initial comment to establish stream
      controller.enqueue(encoder.encode(": connected\n\n"));

      // Run the agent streaming in the background
      (async () => {
        try {
          const iterable = await streamResponse({
            threadId: payload.threadId || "unknown",
            userText: payload.content || "",
            ownerId: owner.ownerId,
            signal: abortController.signal,
            opts: {
              model: payload.model,
              provider: payload.provider,
              apiKey: payload.apiKey,
              personaId: payload.personaId,
              tools: payload.tools,
              allowTool: payload.allowTool,
              approveAllTools: payload.approveAllTools,
              attachments: payload.attachments,
              neutralContextSummary: payload.neutralContextSummary,
            },
          });
          for await (const chunk of iterable) {
            // Only forward AI/tool chunks; ignore human/system
            if (chunk.type === "ai" || chunk.type === "tool") {
              send(chunk);
            }
          }

          // Signal completion
          if (!isClosed) {
            controller.enqueue(encoder.encode("event: done\n"));
            controller.enqueue(encoder.encode("data: {}\n\n"));
          }
        } catch (err: unknown) {
          if (abortController.signal.aborted || isClosed) return;
          // Emit an error event (client onerror will capture general network; providing data for diagnostics)
          controller.enqueue(encoder.encode("event: error\n"));
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ message: (err as Error)?.message || "Stream error", threadId: payload.threadId || "unknown" })}\n\n`,
            ),
          );
        } finally {
          if (!isClosed) {
            isClosed = true;
            controller.close();
          }
        }
      })();
    },
    cancel() {
      isClosed = true;
      abortController.abort();
    },
  });

  const response = new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
  if (owner.shouldSetCookie) {
    response.headers.append(
      "Set-Cookie",
      `gptone_owner_id=${owner.ownerId}; Path=/; Max-Age=31536000; SameSite=Lax; HttpOnly${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
  }
  return response;
}

/**
 * Legacy GET SSE endpoint. Kept for compatibility, but BYOK requests use POST
 * so API keys never travel in URL query params.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const toolsParam = searchParams.get("tools") || "";
  const attachmentsParam = searchParams.get("attachments") || "";

  let attachments: FileAttachment[] | undefined;
  if (attachmentsParam) {
    try {
      attachments = JSON.parse(attachmentsParam);
    } catch (error) {
      console.error("Failed to parse attachments:", error);
    }
  }

  return streamAgent(req, {
    content: searchParams.get("content") || "",
    threadId: searchParams.get("threadId") || "unknown",
    model: searchParams.get("model") || undefined,
    provider: searchParams.get("provider") || undefined,
    personaId: searchParams.get("personaId") || undefined,
    allowTool: (searchParams.get("allowTool") as "allow" | "deny" | null) || undefined,
    tools: toolsParam
      ? toolsParam
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : undefined,
    approveAllTools: searchParams.get("approveAllTools") === "true",
    attachments,
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as StreamPayload;
  return streamAgent(req, body);
}
