import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

const INTERNAL_MODE = process.env.NEXT_PUBLIC_INTERNAL_MODE === "true";

export const metadata: Metadata = {
  title: "IVY — Intelligent Visit Assistant",
  description:
    "Your AI Field Concierge. Capture visits, summarize, and validate with confidence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {INTERNAL_MODE && (
          <div className="w-full bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-900 shadow-sm">
            Internal use only. No patient/PII.
          </div>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
