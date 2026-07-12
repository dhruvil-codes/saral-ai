import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Agentation } from "agentation";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const garamond = localFont({
  src: "../public/fonts/ITC Garamond Book Narrow Regular.otf",
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Saral AI — Multilingual Voice Intake for Clinics",
  description:
    "Voice AI for Indian clinics. Answer every call in Hindi, Hinglish, or English and get WhatsApp lead summaries in under 2.5 seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${garamond.variable}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans" suppressHydrationWarning>
        <TooltipProvider>
          {children}
          <Agentation />
        </TooltipProvider>
      </body>
    </html>
  );
}
