import prisma from "@/lib/database/prisma";

/**
 * Ensure a thread exists; create if missing. Title derived from seed (first 100 chars) or fallback.
 * Returns the Prisma thread record.
 */
export async function ensureThread(
  threadId: string,
  titleSeed: string | undefined,
  personaId = "efficient",
  ownerId: string,
) {
  if (!threadId) throw new Error("threadId is required");
  const existing = await prisma.thread.findUnique({ where: { id: threadId } });
  const title = (titleSeed?.trim() || "New thread").substring(0, 100);
  if (existing) {
    if (existing.ownerId !== ownerId) {
      throw new Error("Thread not found");
    }

    if (titleSeed?.trim() && ["New thread", "Untitled thread"].includes(existing.title)) {
      return prisma.thread.update({ where: { id: threadId }, data: { title } });
    }

    return existing;
  }
  return prisma.thread.create({ data: { id: threadId, ownerId, title, personaId } });
}
