import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import BackgroundSystem from "@/components/BackgroundSystem";
import Navbar from "@/components/Navbar";
import SocialRail from "@/components/SocialRail";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Gaming Fest | The Ultimate Gaming Arena",
  description:
    "Join the biggest gaming tournament featuring Tekken, Mortal Kombat, FIFA 26, CODM, and BGMI. Register now and compete for glory!",
  keywords:
    "gaming fest, esports tournament, Tekken, Mortal Kombat, FIFA 26, CODM, BGMI, gaming competition, college esports",
  openGraph: {
    title: "Gaming Fest | The Ultimate Gaming Arena",
    description:
      "Join the biggest gaming tournament. Register now and compete for glory!",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} antialiased`}>
      <body className="min-h-screen bg-black font-sans text-white">
        <SmoothScrollProvider>
          <BackgroundSystem />
          <Navbar />
          <SocialRail />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
