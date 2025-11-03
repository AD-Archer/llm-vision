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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link
            href="/dashboard"
            className="flex items-center space-x-1 sm:space-x-2 min-w-0"
          >
            <div className="text-lg sm:text-2xl font-bold text-white truncate">
              LLM Visi<span className="text-blue-500">on</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
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

          {/* Right side: Hamburger + User Menu */}
          <div className="flex items-center space-x-2">
            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-slate-700 transition-colors"
              aria-label="Toggle menu"
            >
              <svg
                className={`w-6 h-6 text-slate-300 transition-transform ${
                  isMobileMenuOpen ? "rotate-90" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {isMobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              >
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline text-xs sm:text-sm text-slate-200 truncate max-w-[120px]">
                  {user?.email}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
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
                <div className="absolute right-0 mt-2 w-40 sm:w-48 bg-slate-700 rounded-lg shadow-lg border border-slate-600 overflow-hidden z-10">
                  <div className="px-3 sm:px-4 py-3 border-b border-slate-600">
                    <p className="text-xs text-slate-400">Signed in as</p>
                    <p className="text-xs sm:text-sm font-medium text-white truncate">
                      {user?.email}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      router.push("/settings");
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
                  >
                    ⚙️ Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 sm:px-4 py-2 text-xs sm:text-sm text-red-400 hover:bg-slate-600 hover:text-red-300 transition-colors border-t border-slate-600"
                  >
                    🚪 Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden pb-3 space-y-1 border-t border-slate-700 pt-3">
            <Link
              href="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                isActive("/dashboard")
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/queries"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                isActive("/queries")
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              Saved Queries
            </Link>
            <Link
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded text-xs sm:text-sm font-medium transition-colors ${
                isActive("/settings")
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              Settings
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};
