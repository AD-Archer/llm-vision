import type { Metadata } from "next";
// @ts-ignore - allow side-effect CSS import without a type declaration
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import { AdminProvider } from "../context/AdminContext";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "LLM Visualization Dashboard",
  description:
    "Dashboard for visualizing and managing LLM-powered RAG workflows for LaunchPad Philly",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SettingsProvider>
            <AdminProvider>
              <Navbar />
              {children}
            </AdminProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
