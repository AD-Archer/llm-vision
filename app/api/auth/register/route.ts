import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

const RegisterPayload = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().trim().min(1, "Name is required"),
  invitationCode: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = RegisterPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password, name, invitationCode } = parsed.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    // Check if this is the first user (should become admin)
    const userCount = await prisma.user.count();
    const isAdmin = userCount === 0; // First user becomes admin

    // For non-first users, require invitation code
    if (!isAdmin && !invitationCode) {
      return NextResponse.json(
        { error: "Invitation code is required" },
        { status: 400 }
      );
    }

    // Validate invitation code for non-admin users
    if (!isAdmin && invitationCode) {
      const code = await prisma.invitationCode.findUnique({
        where: { code: invitationCode },
      });

      if (!code) {
        return NextResponse.json(
          { error: "Invalid invitation code" },
          { status: 400 }
        );
      }

      if (code.revoked || code.usedBy || code.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Invitation code is expired or already used" },
          { status: 400 }
        );
      }

      // Mark code as used
      await prisma.invitationCode.update({
        where: { code: invitationCode },
        data: {
          usedBy: email,
          usedAt: new Date(),
        },
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        name,
        password: hashedPassword,
        isAdmin,
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        queryCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      user: newUser,
      message: isAdmin
        ? "Welcome! You are the first user and have been granted admin privileges."
        : "Account created successfully",
      requiresSetup: isAdmin, // First user needs to configure settings
    });
  } catch (error) {
    console.error("[auth] Registration failed", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
