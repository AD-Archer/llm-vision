import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const RefreshPayload = z.object({
  userId: z.string().min(1, "User ID required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RefreshPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      queryCount: user.queryCount,
      createdAt: user.createdAt,
    };

    return NextResponse.json({
      user: userData,
    });
  } catch (error) {
    console.error("[auth] Refresh failed", error);
    return NextResponse.json(
      { error: "Failed to refresh user data" },
      { status: 500 }
    );
  }
}
