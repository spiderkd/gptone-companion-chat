import { NextRequest, NextResponse } from "next/server";

const THREAD_OWNER_COOKIE = "gptone_owner_id";
const OWNER_ID_PATTERN = /^[a-zA-Z0-9_-]{12,80}$/;

export interface ThreadOwner {
  ownerId: string;
  shouldSetCookie: boolean;
}

function isValidOwnerId(value: string | undefined): value is string {
  return typeof value === "string" && OWNER_ID_PATTERN.test(value);
}

export function getThreadOwner(req: NextRequest): ThreadOwner {
  const cookieOwnerId = req.cookies.get(THREAD_OWNER_COOKIE)?.value;
  if (isValidOwnerId(cookieOwnerId)) {
    return { ownerId: cookieOwnerId, shouldSetCookie: false };
  }

  const headerOwnerId = req.headers.get("x-gptone-owner-id") || undefined;
  if (isValidOwnerId(headerOwnerId)) {
    return { ownerId: headerOwnerId, shouldSetCookie: true };
  }

  return { ownerId: crypto.randomUUID(), shouldSetCookie: true };
}

export function applyThreadOwnerCookie<T>(response: NextResponse<T>, owner: ThreadOwner) {
  if (!owner.shouldSetCookie) return response;

  response.cookies.set({
    name: THREAD_OWNER_COOKIE,
    value: owner.ownerId,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
