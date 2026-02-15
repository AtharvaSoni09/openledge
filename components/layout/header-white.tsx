'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';
import { Search, Menu, X, User, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  isHomepage?: boolean;
}

export function Header({ isHomepage = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuth();

  const Logo = isHomepage ? 'h1' : 'div';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        {/* Utility Bar */}
        <aside
          className="border-b border-gray-100 bg-gray-50"
          style={{ backgroundColor: '#f8f9fa' }}
        >
          <div className="container mx-auto px-6">
            <div className="flex items-center justify-between py-2.5">
              <p className="text-[11px] text-zinc-400 font-sans tracking-wider uppercase">
                AI Legislative Monitor
              </p>
              <nav
                className="flex items-center gap-3 text-xs text-gray-700 font-medium"
                role="navigation"
                aria-label="Utility Navigation"
              >
                <Link href="/legislation-summary" className="hover:text-gray-900 transition-colors">
                  All Bills
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/dashboard" className="hover:text-gray-900 transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-300">|</span>
                <Link href="/about" className="hover:text-gray-900 transition-colors">
                  About
                </Link>
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Masthead */}
        <div className="container mx-auto px-6">
          <div
            className="flex items-center justify-center py-4 lg:py-5"
            style={{ alignItems: 'center', minHeight: '56px' }}
          >
            {/* Left: Search */}
            <div className="flex-1 flex justify-start">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 lg:w-48 bg-white text-black pl-9 pr-3 py-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  style={{ borderRadius: '4px', borderWidth: '1px', borderColor: '#f0f0f0' }}
                  aria-label="Search bills"
                />
              </form>
            </div>

            {/* Center: Logo */}
            <div className="flex-1 flex justify-center">
              <Link
                href="/"
                className="flex flex-col items-center hover:opacity-80 transition-opacity"
                aria-label="Ledge — AI Legislative Monitor"
              >
                <Logo className="text-2xl lg:text-3xl font-serif font-black tracking-tight m-0 leading-tight">
                  LEDGE
                </Logo>
                <p
                  className="text-[11px] text-zinc-400 mt-0.5 tracking-widest uppercase font-sans"
                  style={{ letterSpacing: '0.15em' }}
                >
                  Legislative Intelligence
                </p>
              </Link>
            </div>

            {/* Right: User Actions */}
            <div className="flex-1 flex justify-end items-center gap-2">
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 text-xs lg:text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span className="hidden lg:inline">Dashboard</span>
                  </Link>
                  <div className="flex items-center gap-2 text-xs lg:text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="hidden lg:inline">{user.email}</span>
                  </div>
                  <button
                    onClick={logout}
                    className="text-gray-500 hover:text-gray-900 transition-colors text-xs"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-gray-600 hover:text-gray-900 transition-colors text-xs lg:text-sm font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 lg:px-4 py-2 text-xs lg:text-sm font-bold uppercase tracking-wide transition-colors rounded ml-1 lg:ml-3"
                  >
                    Get Started
                  </Link>
                </>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors ml-2"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <div className="container mx-auto px-6 py-4 space-y-2">
            <Link
              href="/dashboard"
              className="block text-gray-700 hover:text-gray-900 text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/legislation-summary"
              className="block text-gray-700 hover:text-gray-900 text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              All Bills
            </Link>
            <Link
              href="/about"
              className="block text-gray-700 hover:text-gray-900 text-sm font-medium py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
