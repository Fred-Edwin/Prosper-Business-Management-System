import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "@/app/register-sw";

export const metadata: Metadata = {
  title: "Prosper",
  description: "Business management system for Restaurant, Canteen, and Store.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
