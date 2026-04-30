import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "New Chapter Real Estate CRM",
  description: "Property lead management for real estate wholesaling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${dmSans.className} min-h-screen bg-[#080b12] text-white antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
