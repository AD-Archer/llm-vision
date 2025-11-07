import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const CreateInvitationPayload = z.object({
  expiresInDays: z.number().int().min(1).max(365).optional().default(7),
});

export async function GET() {
  try {
    const codes = await prisma.invitationCode.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      codes.map((code) => ({
        code: code.code,
        createdAt: code.createdAt.toISOString(),
        expiresAt: code.expiresAt.toISOString(),
        usedBy: code.usedBy,
        usedAt: code.usedAt?.toISOString(),
        revoked: code.revoked,
      }))
    );
  } catch (error) {
    console.error("[admin] Failed to fetch invitation codes", error);
    return NextResponse.json(
      { error: "Failed to fetch invitation codes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateInvitationPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { expiresInDays } = parsed.data;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    // Generate a unique 8-character uppercase alphanumeric code
    let code: string;
    let exists = true;
    let attempts = 0;

    do {
      // Generate 8-character code using uppercase letters and numbers
      code = "";
      for (let i = 0; i < 8; i++) {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      attempts++;
      if (attempts >= 20) {
        return NextResponse.json(
          { error: "Failed to generate unique invitation code" },
          { status: 500 }
        );
      }

      exists = !!(await prisma.invitationCode.findUnique({ where: { code } }));
    } while (exists);

    const invitationCode = await prisma.invitationCode.create({
      data: {
        code,
        expiresAt,
      },
    });

    return NextResponse.json({
      code: invitationCode.code,
      createdAt: invitationCode.createdAt.toISOString(),
      expiresAt: invitationCode.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[admin] Failed to create invitation code", error);
    return NextResponse.json(
      { error: "Failed to create invitation code" },
      { status: 500 }
    );
  }
}
