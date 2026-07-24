import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { PWA } from "@/components/pwa/PWA";
import { AuthProvider } from "@/lib/hooks/AuthProvider";
import { cookies } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "THULUTH — Financial Operating System",
  description: "A personal financial operating system based on the 33/33/33/1 wealth methodology.",
  applicationName: "THULUTH",
  // <link rel="manifest"> is injected automatically from app/manifest.ts.
  appleWebApp: {
    capable: true,
    title: "THULUTH",
    statusBarStyle: "black",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  // Financial figures must not be turned into tel: links by iOS Safari.
  formatDetection: { telephone: false },
};

// themeColor lives on the viewport export in this Next version (not metadata).
// The app is locked to dark, so a single dark chrome color matches --background.
export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('locale')?.value ?? 'en';
  const dir = savedLocale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextIntlClientProvider messages={messages}>
            <AuthProvider>
              {children}
              <Toaster richColors position="top-right" />
              <PWA />
            </AuthProvider>
            <Analytics />
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
