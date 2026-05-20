import type { Metadata } from "next";
import { Inter, Space_Grotesk, Tajawal, Exo_2 } from "next/font/google";
import "./globals.css";
import { GrowthProvider } from "@/context/GrowthContext";
import { SoundProvider } from "@/context/SoundContext";
import { ToastProvider } from "@/components/ui/Toast";
import { PomodoroProvider } from "@/context/PomodoroContext";
import NeuralMesh from "@/components/ui/NeuralMesh";
import PWARegistration from "@/components/layout/PWARegistration";
import GlobalCursor from "@/components/ui/GlobalCursor";

import Script from "next/script";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const tajawal = Tajawal({ weight: ["400", "500", "700", "800", "900"], subsets: ["arabic"], variable: "--font-tajawal" });
const exo2 = Exo_2({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-exo2" });

export const metadata: Metadata = {
  title: "Growth Hub | Life Optimization Interface",
  description: "Professional high-fidelity life management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <Script id="theme-lang-script" strategy="beforeInteractive" dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                document.documentElement.classList.add('dark');
                var lang = localStorage.getItem('language') || 'en';
                var isRTL = lang === 'ar';
                document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
                document.documentElement.lang = isRTL ? 'ar' : 'en';
                var targetSize = isRTL ? '140%' : '100%';
                var targetLH = isRTL ? '1.8' : 'normal';
                document.documentElement.style.fontSize = targetSize;
                document.documentElement.style.lineHeight = targetLH;
                var cachedColor = localStorage.getItem('cached_theme_color') || '#22c55e';
                document.documentElement.style.setProperty('--color-neon-green', cachedColor);
                document.documentElement.style.setProperty('--color-primary', cachedColor);
                document.documentElement.style.setProperty('--theme-color', cachedColor);
                var metaThemeColor = document.querySelector('meta[name="theme-color"]');
                if (metaThemeColor) metaThemeColor.setAttribute('content', cachedColor);
              } catch (e) {}
            })();
          `
        }} />
        <link rel="manifest" href="/manifest.json" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
        <meta name="theme-color" content="#B0C4DE" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Growth Hub" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${tajawal.variable} ${exo2.variable} antialiased text-lg md:text-xl`}>
        <SoundProvider>
          <GrowthProvider>
            <ToastProvider>
              <PomodoroProvider>
                <NeuralMesh />
                <PWARegistration />
                <GlobalCursor />
                {children}
              </PomodoroProvider>
            </ToastProvider>
          </GrowthProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
