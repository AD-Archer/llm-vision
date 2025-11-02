import type { Metadata } from "next";
// @ts-ignore - allow side-effect CSS import without a type declaration
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
