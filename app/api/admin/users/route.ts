import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  try {
    // Fetch all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        queryCount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to match the expected UserStats format
    const userStats = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      queryCount: user.queryCount,
      createdAt: user.createdAt.toISOString(),
      lastActive: user.updatedAt.toISOString(), // Using updatedAt as lastActive
      status: user.isAdmin
        ? "active"
        : ("active" as "active" | "inactive" | "invited"), // For now, all are active
      isAdmin: user.isAdmin,
    }));

    return NextResponse.json(userStats);
  } catch (error) {
    console.error("[admin] Failed to fetch users", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}
