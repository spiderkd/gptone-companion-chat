import { NextRequest, NextResponse } from "next/server";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createChatModel } from "@/lib/agent/util";
import { DEFAULT_MODEL, DEFAULT_PROVIDER } from "@/lib/aiModels";
import type { MessageResponse } from "@/types/message";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SummarizeSwitchPayload {
  messages?: MessageResponse[];
  provider?: string;
  model?: string;
  apiKey?: string;
}

function messageText(message: MessageResponse) {
  const content = message.data?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) => ("text" in item && typeof item.text === "string" ? item.text : ""))
      .join(" ");
  }
  return "";
}

function transcript(messages: MessageResponse[] = []) {
  return messages
    .filter((message) => message.type === "human" || message.type === "ai")
    .map((message) => `${message.type === "human" ? "User" : "Assistant"}: ${messageText(message)}`)
    .filter((line) => line.trim().length > 0)
    .join("\n\n")
    .slice(-24000);
}

function extractText(content: unknown) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((item) =>
        item && typeof item === "object" && "text" in item
          ? String((item as { text?: unknown }).text || "")
          : "",
      )
      .join("");
  }
  return String(content || "");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SummarizeSwitchPayload;
  const conversation = transcript(Array.isArray(body.messages) ? body.messages : []);

  if (!conversation.trim()) {
    return NextResponse.json({ neutralSummary: "No prior conversation context yet." });
  }

  try {
    const model = createChatModel({
      provider: body.provider || DEFAULT_PROVIDER,
      model: body.model || DEFAULT_MODEL,
      temperature: 1,
      apiKey: body.apiKey,
    });

    const response = await model.invoke(
      [
        new SystemMessage(
          [
            "Summarize the conversation neutrally for a companion/persona switch.",
            "Remove all assistant personality, tone, roleplay, jokes, and style.",
            "Preserve facts, user goals, uploaded-file references, decisions, constraints, and open questions.",
            "Keep it concise. Use plain bullet points only if useful.",
          ].join("\n"),
        ),
        new HumanMessage(conversation),
      ],
      { signal: AbortSignal.any([req.signal, AbortSignal.timeout(45000)]) },
    );

    const neutralSummary = extractText(response.content).trim();
    if (!neutralSummary) throw new Error("Empty summary");
    return NextResponse.json({ neutralSummary });
  } catch {
    return NextResponse.json(
      {
        error:
          "Could not prepare conversation context. Check your selected model and API key, then retry, or keep your current companion.",
      },
      { status: 502 },
    );
  }
}
