import { NextRequest, NextResponse } from "next/server";
import type { Thread } from "@/types/message";
import prisma from "@/lib/database/prisma";
import { UpdateThreadBody, DeleteThreadBody } from "./schema";
import { applyThreadOwnerCookie, getThreadOwner } from "@/lib/threadOwner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ThreadEntity = {
  id: string;
  ownerId: string;
  title: string;
  personaId: string;
  createdAt: Date;
  updatedAt: Date;
};
export async function GET(req: NextRequest) {
  const owner = getThreadOwner(req);
  const dbThreads = await prisma.thread.findMany({
    where: { ownerId: owner.ownerId },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
  const threads: Thread[] = dbThreads.map((t: ThreadEntity) => ({
    id: t.id,
    title: t.title,
    personaId: t.personaId,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
  return applyThreadOwnerCookie(NextResponse.json(threads, { status: 200 }), owner);
}

export async function POST(req: NextRequest) {
  const owner = getThreadOwner(req);
  let personaId = "efficient";
  try {
    const body = await req.json();
    if (typeof body?.personaId === "string") {
      personaId = body.personaId;
    }
  } catch {}

  const created = await prisma.thread.create({
    data: { ownerId: owner.ownerId, title: "New thread", personaId },
  });
  const thread: Thread = {
    id: created.id,
    title: created.title,
    personaId: created.personaId,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
  return applyThreadOwnerCookie(NextResponse.json(thread, { status: 201 }), owner);
}

export async function PATCH(req: NextRequest) {
  const owner = getThreadOwner(req);
  try {
    const parsed = UpdateThreadBody.safeParse(await req.json());
    if (!parsed.success) {
      return applyThreadOwnerCookie(
        NextResponse.json({ error: "id and title or personaId required" }, { status: 400 }),
        owner,
      );
    }
    const { id, title, personaId } = parsed.data;
    const existing = await prisma.thread.findFirst({ where: { id, ownerId: owner.ownerId } });
    if (!existing) {
      return applyThreadOwnerCookie(
        NextResponse.json({ error: "Thread not found" }, { status: 404 }),
        owner,
      );
    }

    const updated = await prisma.thread.update({
      where: { id: existing.id },
      data: {
        ...(typeof title === "string" ? { title } : {}),
        ...(typeof personaId === "string" ? { personaId } : {}),
      },
    });
    return applyThreadOwnerCookie(
      NextResponse.json(
        {
          id: updated.id,
          title: updated.title,
          personaId: updated.personaId,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
        { status: 200 },
      ),
      owner,
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Update failed";
    return applyThreadOwnerCookie(NextResponse.json({ error: message }, { status: 500 }), owner);
  }
}

export async function DELETE(req: NextRequest) {
  const owner = getThreadOwner(req);
  try {
    const parsed = DeleteThreadBody.safeParse(await req.json());
    if (!parsed.success) {
      return applyThreadOwnerCookie(
        NextResponse.json({ error: "Thread id required" }, { status: 400 }),
        owner,
      );
    }
    const { id } = parsed.data;

    // First check if thread exists
    const thread = await prisma.thread.findFirst({ where: { id, ownerId: owner.ownerId } });
    if (!thread) {
      return applyThreadOwnerCookie(
        NextResponse.json({ error: "Thread not found" }, { status: 404 }),
        owner,
      );
    }

    // Delete the thread from Prisma (metadata)
    await prisma.thread.delete({ where: { id } });

    // Note: LangGraph checkpoint data will become orphaned but won't affect functionality
    // The checkpointer will simply not find any thread metadata for this thread_id
    // Future versions could implement direct checkpoint deletion via SQL if needed

    return applyThreadOwnerCookie(NextResponse.json({ success: true }, { status: 200 }), owner);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Delete failed";
    return applyThreadOwnerCookie(NextResponse.json({ error: message }, { status: 500 }), owner);
  }
}
