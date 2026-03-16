import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        read: false,
      },
    });
    return NextResponse.json({ count });
  } catch (err) {
    console.error("Failed to fetch unread count:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
