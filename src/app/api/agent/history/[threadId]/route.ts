import { NextRequest, NextResponse } from "next/server";
import { fetchThreadHistory } from "@/services/agentService";
import { applyThreadOwnerCookie, getThreadOwner } from "@/lib/threadOwner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ threadId: string }> }) {
  // In Next.js 15 dynamic route handlers, params is now async.
  const { threadId } = await params;
  const owner = getThreadOwner(req);

  const messages = await fetchThreadHistory(threadId, owner.ownerId);
  return applyThreadOwnerCookie(NextResponse.json(messages, { status: 200 }), owner);
}
