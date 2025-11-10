"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export const dynamic = "force-dynamic";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [hasCheckedUsers, setHasCheckedUsers] = useState(false);

  useEffect(() => {
    const checkFirstTimeSetup = async () => {
      if (!isLoading && !hasCheckedUsers) {
        try {
          // Check if there are any users in the database
          const response = await fetch("/api/auth/check-users");
          const data = await response.json();

          if (data.userCount === 0) {
            // No users exist, redirect to signup for first user
            router.push("/signup");
            return;
          }
        } catch (error) {
          // If API fails, assume users exist and go to login
          console.error("Failed to check user count:", error);
        }

        setHasCheckedUsers(true);

        if (isAuthenticated) {
          router.push("/dashboard");
        } else {
          router.push("/login");
        }
      }
    };

    checkFirstTimeSetup();
  }, [isAuthenticated, isLoading, hasCheckedUsers, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-400">Loading...</p>
      </div>
    </div>
  );
}
