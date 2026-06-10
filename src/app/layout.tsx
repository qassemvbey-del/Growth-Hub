import type { Metadata, Viewport } from "next";
// Commented out per rule "Never delete code, only comment it out"
// import { Inter, Space_Grotesk, Tajawal, Exo_2 } from "next/font/google";
import { Space_Grotesk, Inter, Tajawal } from 'next/font/google';
import "./globals.css";
import { GrowthProvider } from "@/context/GrowthContext";
import { SoundProvider } from "@/context/SoundContext";
import { ToastProvider } from "@/components/ui/Toast";
import { PomodoroProvider } from "@/context/PomodoroContext";
import NeuralMesh from "@/components/ui/NeuralMesh";
import PWARegistration from "@/components/layout/PWARegistration";
import GlobalCursor from "@/components/ui/GlobalCursor";
import Shell from '@/components/layout/Shell';

import Script from "next/script";

// Commented out per rule "Never delete code, only comment it out"
// const inter = Inter({ subsets: ["latin"], variable: "--font-inter", preload: false });
// const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space", preload: false });
// const tajawal = Tajawal({ weight: ["400", "500", "700", "800", "900"], subsets: ["arabic"], variable: "--font-tajawal", preload: false });
// const exo2 = Exo_2({ subsets: ["latin"], weight: ["700", "800", "900"], variable: "--font-exo2", preload: false });

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-heading',
  display: 'swap'
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap'
});

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700'],
  variable: '--font-arabic',
  display: 'swap'
});


export const metadata: Metadata = {
  title: "Growth Hub | Level Up Your Learning",
  description: "Track your goals, crush your courses, and level up with your squad",
};

export const viewport: Viewport = {
  themeColor: '#050505',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

// export default function RootLayout({
//   children,
// }: Readonly<{
//   children: React.ReactNode;
// }>) {
//   return (
//     <html lang="en" suppressHydrationWarning className="dark" style={{ WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}>
//       <head>
//         {typeof window === 'undefined' && (
//           <script id="theme-lang-script" dangerouslySetInnerHTML={{
//             __html: `
//               (function() {
//                 try {
//                   document.documentElement.classList.add('dark');
//                   var lang = localStorage.getItem('language') || 'en';
//                   var isRTL = lang === 'ar';
//                   document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
//                   document.documentElement.lang = isRTL ? 'ar' : 'en';
//                   document.documentElement.style.webkitTextSizeAdjust = '100%';
//                   document.documentElement.style.textSizeAdjust = '100%';
//                   /* Commented out per rule "Never delete code, only comment it out"
//                   var targetSize = isRTL ? '140%' : '100%';
//                   var targetLH = isRTL ? '1.8' : 'normal';
//                   document.documentElement.style.fontSize = targetSize;
//                   document.documentElement.style.lineHeight = targetLH;
//                   */
//                   document.documentElement.style.fontSize = '100%';
//                   document.documentElement.style.lineHeight = 'normal';
//                   var cachedColor = localStorage.getItem('cached_theme_color') || '#22c55e';
//                   document.documentElement.style.setProperty('--color-neon-green', cachedColor);
//                   document.documentElement.style.setProperty('--color-primary', cachedColor);
//                   document.documentElement.style.setProperty('--theme-color', cachedColor);
//                 } catch (e) {}
//               })();
//             `
//           }} />
//         )}
//         <link rel="manifest" href="/manifest.json" />
//         <meta name="apple-mobile-web-app-capable" content="yes" />
//         <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
//         <meta name="apple-mobile-web-app-title" content="Growth Hub" />
//         <link rel="icon" type="image/svg+xml" href="/icon.svg" />
//         <link rel="apple-touch-icon" href="/icon.svg" />
//       </head>
//       {/* Commented out per rule "Never delete code, only comment it out" */}
//       {/* <body className={`${inter.variable} ${spaceGrotesk.variable} ${tajawal.variable} ${exo2.variable} antialiased text-lg md:text-xl`}> */}
//       <body className={`${inter.variable} ${spaceGrotesk.variable} ${tajawal.variable} antialiased text-lg md:text-xl`}>
//         <SoundProvider>
//           <GrowthProvider>
//             <ToastProvider>
//               <PomodoroProvider>
//                 <NeuralMesh />
//                 <PWARegistration />
//                 <GlobalCursor />
//                 <Shell>
//                   {children}
//                 </Shell>
//               </PomodoroProvider>
//             </ToastProvider>
//           </GrowthProvider>
//         </SoundProvider>
//       </body>
//     </html>
//   );
// }


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning style={{ WebkitTextSizeAdjust: '100%', textSizeAdjust: '100%' }}>
      <head>
        {typeof window === 'undefined' && (
          <script id="theme-lang-script" dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme') || 'dark';
                  document.documentElement.className = savedTheme;
                  document.documentElement.setAttribute('data-theme', savedTheme);
                  
                  var lang = localStorage.getItem('language') || 'en';
                  var isRTL = lang === 'ar';
                  document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
                  document.documentElement.lang = isRTL ? 'ar' : 'en';
                  document.documentElement.style.webkitTextSizeAdjust = '100%';
                  document.documentElement.style.textSizeAdjust = '100%';
                  document.documentElement.style.fontSize = '100%';
                  document.documentElement.style.lineHeight = 'normal';
                  var cachedColor = localStorage.getItem('cached_theme_color') || '#22c55e';
                  document.documentElement.style.setProperty('--color-neon-green', cachedColor);
                  document.documentElement.style.setProperty('--color-primary', cachedColor);
                  document.documentElement.style.setProperty('--theme-color', cachedColor);
                } catch (e) {
                  document.documentElement.className = 'dark';
                }
              })();
            `
          }} />
        )}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Growth Hub" />
        <link rel="icon" type="image/svg+xml" href="/icon.svg" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${tajawal.variable} antialiased text-lg md:text-xl`}>
        <SoundProvider>
          <GrowthProvider>
            <ToastProvider>
              <PomodoroProvider>
                <NeuralMesh />
                <PWARegistration />
                <GlobalCursor />
                <Shell>
                  {children}
                </Shell>
              </PomodoroProvider>
            </ToastProvider>
          </GrowthProvider>
        </SoundProvider>
      </body>
    </html>
  );
}
