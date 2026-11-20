import type { Metadata, Viewport } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const archivo = Archivo({ subsets: ["latin"], variable: "--font-archivo", axes: ["wdth"], display: "swap" });
const plex = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex", display: "swap" });

export const metadata: Metadata = {
  title: "Boats",
  description: "A fund manager who can't take your money.",
  applicationName: "Boats",
  appleWebApp: { capable: true, title: "Boats", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon-180.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0B1A30",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${plex.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
