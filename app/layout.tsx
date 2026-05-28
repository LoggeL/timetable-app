import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Timetable",
  description: "Private festival timetable voting for small groups.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
