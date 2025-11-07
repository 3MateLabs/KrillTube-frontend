import type { Metadata } from "next";
import { AppLayout } from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "KrillTube - Watch & Upload",
  description: "Watch and upload videos on KrillTube",
};

export default function AppLayoutWrapper({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppLayout>{children}</AppLayout>;
}
