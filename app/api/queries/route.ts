import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

const CreateQueryPayload = z.object({
  question: z.string().trim().min(1),
  result: z.object({}).passthrough(), // Json
  visualizationName: z.string().optional(),
  userId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const queries = await prisma.savedQuery.findMany({
      where: {
        userId,
        deleted: includeDeleted ? undefined : false,
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(queries);
  } catch (error) {
    logger.error("Failed to fetch queries:", error);
    return NextResponse.json(
      { error: "Failed to fetch queries" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateQueryPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, ...data } = parsed.data;

    const query = await prisma.savedQuery.create({
      data: {
        ...data,
        userId,
        result: JSON.parse(JSON.stringify(data.result)),
      },
    });

    // Increment user's query count
    await prisma.user.update({
      where: { id: userId },
      data: { queryCount: { increment: 1 } },
    });

    return NextResponse.json(query, { status: 201 });
  } catch (error) {
    logger.error("Failed to create query:", error);
    return NextResponse.json(
      { error: "Failed to create query" },
      { status: 500 }
    );
  }
}
