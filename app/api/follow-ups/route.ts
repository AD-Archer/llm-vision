import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logger } from "@/utils/logger";

const CreateFollowUpPayload = z.object({
  parentQueryId: z.string(),
  parentFollowUpId: z.string().optional(),
  question: z.string().trim().min(1),
  result: z.object({}).passthrough(), // Json
  name: z.string().optional(),
  chartType: z.string().optional(),
  userId: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const parentQueryId = searchParams.get("parentQueryId");

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    if (!parentQueryId) {
      return NextResponse.json(
        { error: "parentQueryId required" },
        { status: 400 }
      );
    }

    // Get follow-ups for a specific parent query
    const followUps = await prisma.followUp.findMany({
      where: {
        parentQueryId,
        parentQuery: { userId }, // Ensure user owns the parent query
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(followUps);
  } catch (error) {
    logger.error("Failed to fetch follow-ups:", error);
    return NextResponse.json(
      { error: "Failed to fetch follow-ups" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateFollowUpPayload.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const { userId, ...data } = parsed.data;

    // Verify the user owns the parent query
    const parentQuery = await prisma.savedQuery.findFirst({
      where: {
        id: data.parentQueryId,
        userId,
      },
    });

    if (!parentQuery) {
      return NextResponse.json(
        { error: "Parent query not found or access denied" },
        { status: 404 }
      );
    }

    // If parentFollowUpId is provided, verify it exists and belongs to the same chain
    if (data.parentFollowUpId) {
      const parentFollowUp = await prisma.followUp.findFirst({
        where: {
          id: data.parentFollowUpId,
          parentQueryId: data.parentQueryId,
        },
      });

      if (!parentFollowUp) {
        return NextResponse.json(
          { error: "Parent follow-up not found" },
          { status: 404 }
        );
      }
    }

    const followUp = await prisma.followUp.create({
      data: {
        ...data,
        result: JSON.parse(JSON.stringify(data.result)),
      },
    });

    return NextResponse.json(followUp, { status: 201 });
  } catch (error) {
    logger.error("Failed to create follow-up:", error);
    return NextResponse.json(
      { error: "Failed to create follow-up" },
      { status: 500 }
    );
  }
}
