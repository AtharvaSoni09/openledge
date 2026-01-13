"use client";

import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/header-white";
import { AuthProvider } from "@/contexts/AuthContext";

interface LayoutWrapperProps {
  children: React.ReactNode;
}

export function LayoutWrapper({ children }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isHomepage = pathname === "/legislation-summary";

  return (
    <AuthProvider key="auth-provider">
      <Header isHomepage={isHomepage} />
      <main className="min-h-screen">
        {children}
      </main>
    </AuthProvider>
  );
}
