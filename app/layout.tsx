import type { Metadata, Viewport } from "next";
import { OfflineRuntime } from "@/components/OfflineRuntime";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://timetable.logge.top"),
  title: "Timetable",
  description: "Private Festival-Abstimmung für Gruppen: Timetables vergleichen, Acts auswählen und sehen, wer wohin will.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Timetable",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Timetable",
    "application-name": "Timetable",
    "msapplication-TileColor": "#f97316",
  },
  openGraph: {
    title: "Timetable",
    description: "Private Festival-Abstimmung für Gruppen: Timetables vergleichen, Acts auswählen und sehen, wer wohin will.",
    url: "https://timetable.logge.top",
    siteName: "Timetable",
    locale: "de_DE",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Timetable Festival-Abstimmung",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Timetable",
    description: "Private Festival-Abstimmung für Gruppen: Timetables vergleichen, Acts auswählen und sehen, wer wohin will.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#f97316",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        <OfflineRuntime />
        {children}
      </body>
    </html>
  );
}
