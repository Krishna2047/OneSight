import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OneSight — Cloud Billing Alert System & Agentic AI FinOps Platform",
  description:
    "Enterprise Multi-Cloud Billing Observability, Real-Time Spike Anomaly Detection, and Autonomous Agentic AI Root Cause Analysis (AWS, GCP, Azure).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
