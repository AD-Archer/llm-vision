import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import { AdminProvider } from "../context/AdminContext";
import { QueryProvider } from "../context/QueryContext";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "LLM Visualization Dashboard",
  description:
    "Dashboard for visualizing and managing LLM-powered RAG workflows for LaunchPad Philly",
  icons: {
    icon: "/icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
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
            <QueryProvider>
              <AdminProvider>
                <Navbar />
                {children}
              </AdminProvider>
            </QueryProvider>
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
