import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

const LoginPayload = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = LoginPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
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

    // Check if admin user needs setup (no webhook URL configured)
    let requiresSetup = false;
    if (user.isAdmin) {
      try {
        const settings = await prisma.appSetting.findFirst();
        requiresSetup =
          !settings || !(settings.webhookUrl || settings.aiProviderUrl);
      } catch {
        // If settings table doesn't exist or query fails, assume setup is needed
        requiresSetup = true;
      }
    }

    return NextResponse.json({
      user: userData,
      message: "Login successful",
      requiresSetup,
    });
  } catch (error) {
    console.error("[auth] Login failed", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
