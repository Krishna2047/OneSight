import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Costimizer — Cost Optimization Dashboard & AI FinOps Platform",
  description:
    "Efficiently track, optimize, and manage your cloud resources in one unified platform.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F4F6FA] text-slate-900 font-sans antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
