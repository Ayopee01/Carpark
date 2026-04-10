import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import "@/src/app/css/PreloadPopup.css";
//import components
import Navbar from "./components/Navbar";

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

export const metadata: Metadata = {
  title: "Carpark",
  description: "Carpark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${notoThai.variable}`}>
      <body>
        <Navbar />
        {children}
      </body>
    </html>
  );
}