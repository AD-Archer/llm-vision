import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({ userCount });
  } catch (error) {
    console.error("[auth] Failed to check user count:", error);
    // If database query fails, assume no users to allow first user registration
    // This ensures the first user can always sign up without an invitation code
    return NextResponse.json({ userCount: 0 });
  }
}
