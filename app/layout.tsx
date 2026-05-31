import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://timetable.logge.top"),
  title: "Timetable",
  description: "Private Festival-Abstimmung für Gruppen: Timetables vergleichen, Acts auswählen und sehen, wer wohin will.",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
