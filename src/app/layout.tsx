import type { Metadata, Viewport } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Providers } from "@/components/providers";

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "تریدینگ اُ‌اس | Trading OS",
  description: "سیستم‌عامل معامله‌گری مبتنی بر LIT — ژورنال، بک‌تست، آنالیز و منتور هوشمند",
  manifest: "/manifest.json",
  applicationName: "Trading OS",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Trading OS",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0e1a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistMono.variable} font-sans antialiased bg-background text-foreground`}
        style={{ fontFamily: "'Rokh', var(--font-geist-mono), ui-sans-serif, system-ui, sans-serif" }}
      >
        <Providers>
          {children}
          <Toaster />
          <SonnerToaster position="top-center" />
        </Providers>
      </body>
    </html>
  );
}
