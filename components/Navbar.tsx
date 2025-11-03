"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="text-2xl font-bold text-white">
              LLM Visi<span className="text-blue-500">on</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                isActive("/dashboard")
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/queries"
              className={`text-sm font-medium transition-colors ${
                isActive("/queries")
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Saved Queries
            </Link>
            <Link
              href="/settings"
              className={`text-sm font-medium transition-colors ${
                isActive("/settings")
                  ? "text-blue-500 border-b-2 border-blue-500"
                  : "text-slate-300 hover:text-white"
              }`}
            >
              Settings
            </Link>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-slate-200">{user?.email}</span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${
                  isDropdownOpen ? "transform rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-700 rounded-lg shadow-lg border border-slate-600 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-600">
                  <p className="text-xs text-slate-400">Signed in as</p>
                  <p className="text-sm font-medium text-white truncate">
                    {user?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    router.push("/settings");
                    setIsDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                >
                  ⚙️ Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-600 hover:text-red-300 transition-colors border-t border-slate-600"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden pb-3 space-y-2">
          <Link
            href="/dashboard"
            className={`block px-3 py-2 rounded text-sm font-medium ${
              isActive("/dashboard")
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/queries"
            className={`block px-3 py-2 rounded text-sm font-medium ${
              isActive("/queries")
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Saved Queries
          </Link>
          <Link
            href="/settings"
            className={`block px-3 py-2 rounded text-sm font-medium ${
              isActive("/settings")
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-700"
            }`}
          >
            Settings
          </Link>
        </div>
      </div>
    </nav>
  );
};
