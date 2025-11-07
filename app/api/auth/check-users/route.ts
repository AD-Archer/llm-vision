import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ userCount });
  } catch (error) {
    console.error("[auth] Failed to check user count:", error);
    // If database query fails, assume users exist to avoid breaking the app
    return NextResponse.json({ userCount: 1 });
  }
}
