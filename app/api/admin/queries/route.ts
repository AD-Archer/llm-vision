import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all users with their queries
    const usersWithQueries = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        savedQueries: {
          select: {
            id: true,
            question: true,
            result: true,
            visualizationName: true,
            isFavorite: true,
            deleted: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
      },
    });

    // Transform to match expected format
    const formattedData = usersWithQueries.map((user) => ({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      queries: user.savedQueries,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error("Failed to fetch all users' queries:", error);
    return NextResponse.json(
      { error: "Failed to fetch queries" },
      { status: 500 }
    );
  }
}
