import type { Metadata } from "next";
import { Inter, Merriweather } from "next/font/google"; // Mixed typography for news feel
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Merriweather({
  weight: ['300', '400', '700', '900'],
  subsets: ["latin"],
  variable: "--font-serif"
});

export const metadata: Metadata = {
  title: "The Daily Law | Transparent Legislation",
  description: "AI-powered investigative journalism for US legislation.",
};

import Link from "next/link";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-serif antialiased",
          inter.variable,
          serif.variable
        )}
      >
        <header className="border-b bg-zinc-950 text-white py-4">
          <div className="container mx-auto px-4 flex items-center justify-between">
            <Link href="/legislation-summary" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <span className="bg-white text-black px-2 py-1 font-bold font-sans text-xs tracking-widest uppercase">The Daily Law</span>
            </Link>
            <nav className="text-sm font-sans text-zinc-400">
              <span>Est. 2024</span>
            </nav>
          </div>
        </header>
        <main className="min-h-screen">
          {children}
        </main>
        <footer className="border-t py-12 bg-zinc-50">
          <div className="container mx-auto px-4 text-center text-zinc-500 font-sans text-sm">
            &copy; {new Date().getFullYear()} The Daily Law. Open Source Government Intelligence.
          </div>
        </footer>
      </body>
    </html>
  );
}
