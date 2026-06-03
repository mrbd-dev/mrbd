import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { MrbdKeyboardRoot } from "@/components/mrbd-keyboard-root";
import { isOnMetaRayBanDisplay } from "@/lib/mrbd-device";

export const metadata: Metadata = {
  title: "__MRBD_APP_TITLE__",
  description: "A Meta Ray-Ban Display web app.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

// On the glasses, lock to the fixed 600x600 display. Everywhere else (phone,
// laptop) behave like a normal responsive website.
export async function generateViewport(): Promise<Viewport> {
  if (await isOnMetaRayBanDisplay()) {
    return { width: 600, initialScale: 1, userScalable: false, themeColor: "#000000" };
  }

  return { width: "device-width", initialScale: 1, themeColor: "#0a0a0f" };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const onGlasses = await isOnMetaRayBanDisplay();

  return (
    <html lang="en" className={onGlasses ? "dark mrbd-glasses" : undefined}>
      <body className="bg-background text-foreground">
        {/* On glasses, native inputs open the head keyboard automatically. */}
        <MrbdKeyboardRoot autoBind={onGlasses}>{children}</MrbdKeyboardRoot>
      </body>
    </html>
  );
}
