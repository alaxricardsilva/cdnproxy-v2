import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  let config = {
    app_name: "CDN Proxy",
    app_favicon: "/favicon.ico",
  };

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.cdnproxy.top";
    const res = await fetch(`${apiUrl}/api/public/config`, {
      cache: 'no-store',
      next: { revalidate: 60 } // Cache for 1 min
    });
    if (res.ok) {
      const data = await res.json();
      config = {
        app_name: data.app_name || "CDN Proxy",
        app_favicon: data.app_favicon || "/favicon.ico",
      };
    }
  } catch (e) {
    console.warn("Failed to fetch public config for metadata", e);
  }

  return {
    title: config.app_name,
    description: "Gestão Avançada de CDN & Proxy",
    icons: {
      icon: config.app_favicon,
      shortcut: config.app_favicon,
      apple: config.app_favicon,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
