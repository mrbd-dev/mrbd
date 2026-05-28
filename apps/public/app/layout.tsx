import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MRBD Packages",
  description: "Unofficial npm packages and starter tooling for MRBD-compatible web apps.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/mrbd-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/mrbd-192.png", sizes: "192x192", type: "image/png" }],
  },
  openGraph: {
    title: "MRBD Packages",
    description: "Unofficial npm packages and starter tooling for MRBD-compatible web apps.",
    images: [{ url: "/icons/mrbd-512.png", width: 512, height: 512, alt: "MRBD glasses icon" }],
  },
  twitter: {
    card: "summary",
    title: "MRBD Packages",
    description: "Unofficial npm packages and starter tooling for MRBD-compatible web apps.",
    images: ["/icons/mrbd-512.png"],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
