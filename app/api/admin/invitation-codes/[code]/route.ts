import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const updatedCode = await prisma.invitationCode.update({
      where: { code },
      data: { revoked: true },
    });

    return NextResponse.json({
      code: updatedCode.code,
      revoked: updatedCode.revoked,
    });
  } catch (error) {
    console.error("[admin] Failed to revoke invitation code", error);
    return NextResponse.json(
      { error: "Failed to revoke invitation code" },
      { status: 500 }
    );
  }
}
