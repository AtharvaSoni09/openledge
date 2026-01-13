import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { LayoutWrapper } from '@/components/layout/layout-wrapper';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "The Daily Law | Transparent Legislation",
  description: "AI-powered investigative journalism for US legislation.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://thedailylaw.org",
    siteName: "The Daily Law",
    title: "The Daily Law | Transparent Legislation",
    description: "AI-powered investigative journalism for US legislation.",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Daily Law | Transparent Legislation",
    description: "AI-powered investigative journalism for US legislation.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://thedailylaw.org" />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-serif antialiased",
          inter.variable,
          serif.variable
        )}
      >
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
        <Footer />
      </body>
    </html>
  );
}
