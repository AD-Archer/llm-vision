import type { Metadata } from "next";
// @ts-ignore - allow side-effect CSS import without a type declaration
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "LLM Visualization Dashboard",
  description: "Ask your RAG workflow for insights and visualize the answers",
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
            <Navbar />
            {children}
          </SettingsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
