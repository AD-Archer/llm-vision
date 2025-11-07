import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const ResetPasswordPayload = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  adminUserId: z.string(), // ID of the admin performing the reset
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const parsed = ResetPasswordPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { newPassword, adminUserId } = parsed.data;

    // Check if the requester is an admin
    const adminUser = await prisma.user.findUnique({
      where: { id: adminUserId },
    });

    if (!adminUser || !adminUser.isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized: Admin access required" },
        { status: 403 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({
      message: `Password reset successfully for ${targetUser.email}`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.name,
      },
    });
  } catch (error) {
    console.error("[admin] Password reset failed", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
