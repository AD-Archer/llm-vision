import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateFollowUpPayload = z.object({
  name: z.string().optional(),
  isFavorite: z.boolean().optional(),
  chartType: z.string().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateFollowUpPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Verify the user owns the follow-up through the parent query
    const followUp = await prisma.followUp.findFirst({
      where: {
        id,
        parentQuery: { userId },
      },
    });

    if (!followUp) {
      return NextResponse.json(
        { error: "Follow-up not found or access denied" },
        { status: 404 }
      );
    }

    const updatedFollowUp = await prisma.followUp.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(updatedFollowUp);
  } catch (error) {
    console.error("Failed to update follow-up:", error);
    return NextResponse.json(
      { error: "Failed to update follow-up" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    // Verify the user owns the follow-up through the parent query
    const followUp = await prisma.followUp.findFirst({
      where: {
        id,
        parentQuery: { userId },
      },
    });

    if (!followUp) {
      return NextResponse.json(
        { error: "Follow-up not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.followUp.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete follow-up:", error);
    return NextResponse.json(
      { error: "Failed to delete follow-up" },
      { status: 500 }
    );
  }
}
