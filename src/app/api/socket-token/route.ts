import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { createSocketToken, getSocketAuthSecret } from "@/lib/socket-auth";

export async function GET() {
  const session = getAuthSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = createSocketToken(
      session.userId,
      session.role,
      getSocketAuthSecret()
    );
    return NextResponse.json({ token });
  } catch (err) {
    console.error("Failed to create socket token:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
