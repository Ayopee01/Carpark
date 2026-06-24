import type { Metadata } from "next";
// Import Libraries
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
// Providers
import DeviceRouteGuard from "@/src/app/providers/DeviceRouteGuard";
import HeartbeatProvider from "@/src/app/providers/HeartbeatProvider";
import { KioskThemeRealtimeProvider } from "@/src/app/providers/KioskThemeRealtimeProvider";
// Components
import Navbar from "./components/Navbar";
// Fonts
import { Inter, Noto_Sans_Thai } from "next/font/google";
// CSS
import "./globals.css";
import "@/src/app/css/PreloadPopup.css";

// ------------------------------- Fonts -------------------------------
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoThai = Noto_Sans_Thai({
  subsets: ["thai"],
  variable: "--font-thai",
  weight: ["400", "700"],
  display: "swap",
});

// ------------------------------- Metadata -------------------------------
export const metadata: Metadata = {
  title: "Carpark",
  description: "Carpark",
};

// ------------------------------- Root Layout -------------------------------
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${inter.variable} ${notoThai.variable}`}>
      <body>
        <NextIntlClientProvider>
          <DeviceRouteGuard>
            <HeartbeatProvider>
              <KioskThemeRealtimeProvider>
                <Navbar />
                {children}
              </KioskThemeRealtimeProvider>
            </HeartbeatProvider>
          </DeviceRouteGuard>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
