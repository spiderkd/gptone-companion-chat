import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCharacter } from "@/lib/characters";
import { classifyCompanion } from "@/lib/personaClassifier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const payload = z.object({
  currentPersonaId: z.string().max(40),
  userMessage: z.string().trim().min(1).max(2000),
  apiKey: z.string().trim().max(512).optional(),
  messages: z
    .array(
      z.object({
        type: z.enum(["human", "ai"]),
        data: z.object({ content: z.string().max(1500) }),
      }),
    )
    .max(2)
    .default([]),
});

export async function POST(req: NextRequest) {
  const parsed = payload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid companion check request." }, { status: 400 });
  }
  try {
    return NextResponse.json(
      await classifyCompanion(
        {
          userMessage: parsed.data.userMessage,
          messages: parsed.data.messages,
          currentPersonaId: getCharacter(parsed.data.currentPersonaId).personaId,
        },
        req.signal,
        parsed.data.apiKey,
      ),
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Companion check failed.";
    console.warn("Companion classification:", message);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
