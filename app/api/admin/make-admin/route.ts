import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const MakeAdminPayload = z.object({
  userId: z.string().min(1, "User ID required"),
  targetUserId: z.string().min(1, "Target user ID required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = MakeAdminPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, targetUserId } = parsed.data;

    // Verify the requesting user is an admin
    const requestingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!requestingUser || !requestingUser.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update target user to be an admin
    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isAdmin: true },
    });

    return NextResponse.json(
      {
        success: true,
        message: `User ${updatedUser.email} is now an admin`,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          isAdmin: updatedUser.isAdmin,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[make-admin] Failed to promote user", error);
    return NextResponse.json(
      { error: "Failed to promote user to admin" },
      { status: 500 }
    );
  }
}
