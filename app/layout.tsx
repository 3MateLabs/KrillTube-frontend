import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "KrillTube - Decentralized Video Platform",
  description: "Upload, transcode, and stream videos on Walrus storage",
  icons: {
    icon: "/logos/krilll.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@300..700&family=Fredericka+the+Great&family=Nunito+Sans:wght@400;600;700&family=Outfit:wght@100..900&family=Aclonica&family=Satisfy&family=Montserrat:wght@400;500;600;700&family=Russo+One&family=Kalam:wght@300;400;700&family=Playfair+Display:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className={`${outfit.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
