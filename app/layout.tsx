import type { Metadata } from "next";
import { Geist, Fraunces } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: "500",
});

export const metadata: Metadata = {
  title: "Saral AI - Voice AI for Indian Businesses",
  description: "Saral AI picks up every call in Hindi, Hinglish, or English — qualifies the lead and WhatsApps you a summary. Sub-2.5 second response. No missed customers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geist.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral text-on-surface font-sans">
        {children}
      </body>
    </html>
  );
}

