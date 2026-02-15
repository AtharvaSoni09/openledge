'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { HelpCircle, FileText, LogOut, LogIn } from 'lucide-react';

interface HeaderProps {
  email?: string | null;
}

export default function Header({ email }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await fetch('/api/auth/sign-out', { method: 'POST' }).catch(() => {});
    document.cookie = 'is_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'subscriber_email=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/');
    router.refresh();
  };

  const navLink = (href: string, label: string, Icon: any) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors ${
          active
            ? 'bg-zinc-100 text-zinc-900'
            : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        {label}
      </Link>
    );
  };

  return (
    <header className="h-12 px-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-white">
      {/* Left: brand + nav */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="flex items-center gap-2 mr-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <span className="text-white text-[10px] font-black">L</span>
          </div>
          <span className="font-sans font-black text-sm tracking-tight text-zinc-900">Ledge</span>
        </Link>

        <nav className="flex items-center gap-1">
          {navLink('/help', 'Help', HelpCircle)}
          {navLink('/bills', 'Bills', FileText)}
        </nav>
      </div>

      {/* Right: auth */}
      <div className="flex items-center gap-3">
        {email ? (
          <>
            <span className="text-[11px] text-zinc-400 hidden sm:block">{email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 transition-colors"
            >
              <LogOut className="w-3 h-3" /> Sign out
            </button>
          </>
        ) : (
          <Link
            href="/"
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-800 transition-colors font-semibold"
          >
            <LogIn className="w-3.5 h-3.5" /> Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
