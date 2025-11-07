import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

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

    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const queries = await prisma.savedQuery.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(queries);
  } catch (error) {
    console.error("Failed to fetch queries:", error);
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

    return NextResponse.json(query, { status: 201 });
  } catch (error) {
    console.error("Failed to create query:", error);
    return NextResponse.json(
      { error: "Failed to create query" },
      { status: 500 }
    );
  }
}
