import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "../globals.css";

const interTight = Inter_Tight({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KrillTube - Decentralized Video Platform",
  description: "A decentralized video ocean where fans fuel creation. Powered by Walrus, driven by krill.",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${interTight.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
