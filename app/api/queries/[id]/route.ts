import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const UpdateQueryPayload = z.object({
  visualizationName: z.string().optional(),
  isFavorite: z.boolean().optional(),
});

export async function GET(
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

    const query = await prisma.savedQuery.findFirst({
      where: { id, userId },
    });

    if (!query) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    return NextResponse.json(query);
  } catch (error) {
    console.error("Failed to fetch query:", error);
    return NextResponse.json(
      { error: "Failed to fetch query" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateQueryPayload.safeParse(body);

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

    const query = await prisma.savedQuery.updateMany({
      where: { id, userId },
      data: parsed.data,
    });

    if (query.count === 0) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update query:", error);
    return NextResponse.json(
      { error: "Failed to update query" },
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

    const query = await prisma.savedQuery.updateMany({
      where: { id, userId, deleted: false },
      data: { deleted: true },
    });

    if (query.count === 0) {
      return NextResponse.json({ error: "Query not found" }, { status: 404 });
    }

    // Decrement user's query count
    await prisma.user.update({
      where: { id: userId },
      data: { queryCount: { decrement: 1 } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete query:", error);
    return NextResponse.json(
      { error: "Failed to delete query" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const action = searchParams.get("action");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (action === "restore") {
      const query = await prisma.savedQuery.updateMany({
        where: { id, userId, deleted: true },
        data: { deleted: false },
      });

      if (query.count === 0) {
        return NextResponse.json(
          { error: "Query not found or not deleted" },
          { status: 404 }
        );
      }

      // Increment user's query count
      await prisma.user.update({
        where: { id: userId },
        data: { queryCount: { increment: 1 } },
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Failed to restore query:", error);
    return NextResponse.json(
      { error: "Failed to restore query" },
      { status: 500 }
    );
  }
}
