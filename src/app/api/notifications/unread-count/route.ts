import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  const session = getAuthSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const count = await prisma.notification.count({
      where: {
        userId: session.userId,
        read: false,
      },
    });
    return NextResponse.json({ count });
  } catch (err) {
    console.error("Failed to fetch unread count:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
