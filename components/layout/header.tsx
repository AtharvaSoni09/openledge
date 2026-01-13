'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Menu, X, User } from 'lucide-react';
import { categories } from '@/lib/utils/categories';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  isHomepage?: boolean;
}

export function Header({ isHomepage = false }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logout } = useAuth();

  const Logo = isHomepage ? 'h1' : 'div';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Debug: Log user state changes
  useEffect(() => {
    console.log('=== HEADER USER STATE UPDATE ===');
    console.log('Current user:', user);
    console.log('User email:', user?.email);
    console.log('User authenticated:', user?.isAuthenticated);
  }, [user]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SiteNavigationElement",
            "name": "Main Navigation",
            "url": "https://thedailylaw.org",
            "hasPart": [
              {
                "@type": "WebPage",
                "name": "Congress",
                "url": "https://thedailylaw.org/topics/congress"
              },
              {
                "@type": "WebPage", 
                "name": "About",
                "url": "https://thedailylaw.org/about"
              },
              {
                "@type": "WebPage",
                "name": "How We Report", 
                "url": "https://thedailylaw.org/about/editorial-process"
              },
              {
                "@type": "WebPage",
                "name": "Sources",
                "url": "https://thedailylaw.org/about/sources"
              },
              ...categories.map(cat => ({
                "@type": "WebPage",
                "name": cat.name,
                "url": `https://thedailylaw.org/topics/${cat.id}`
              }))
            ]
          })
        }}
      />
      
      <header className="bg-white border-b border-gray-200">
        {/* Main Masthead Row - Balanced Split */}
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center py-4 lg:py-6" style={{ alignItems: 'center', minHeight: '60px' }}>
            {/* Left: Search Box Only */}
            <div className="flex-1 flex justify-start">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="search"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-32 lg:w-48 bg-white text-black pl-9 pr-3 py-2 rounded border border-gray-200 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-semibold"
                  style={{ borderRadius: '4px', borderWidth: '1px', borderColor: '#f0f0f0' }}
                  aria-label="Search site"
                />
              </form>
            </div>

            {/* Center: Logo */}
            <div className="flex-1 flex justify-center">
              <Link 
                href="/legislation-summary" 
                className="flex flex-col items-center hover:opacity-80 transition-opacity"
                aria-label="The Daily Law - Legal Analysis and Policy News"
              >
                <Logo className="text-2xl lg:text-3xl font-serif font-black tracking-tight m-0 leading-tight">
                  THE DAILY LAW
                </Logo>
                <div className="w-px h-px bg-gray-300 my-2"></div>
                <p className="text-xs font-serif text-gray-500 tracking-widest uppercase leading-relaxed">
                  E S T . 2 0 2 6 | L E G A L A N A L Y S I S
                </p>
              </Link>
            </div>

            {/* Right: User Actions */}
            <div className="flex-1 flex justify-end items-center">
              {user ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <button
                    onClick={() => {
                      console.log('=== SIGN OUT BUTTON CLICKED ===');
                      logout();
                    }}
                    className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <>
                  <Link 
                    href="/sign-in" 
                    className="text-gray-600 hover:text-gray-900 transition-colors text-sm"
                  >
                    Sign In
                  </Link>
                  
                  <Link 
                    href="#newsletter" 
                    className="border border-gray-900 text-gray-900 hover:border-gray-700 hover:text-gray-800 px-4 py-2 text-sm font-medium transition-colors rounded-md"
                  >
                    Subscribe
                  </Link>
                </>
              )}
              
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="border-t border-gray-100"></div>
      </header>

      {/* Topics Navigation - Sticky */}
      <nav 
        className="border-t border-gray-100 border-b border-gray-100 bg-white sticky top-0 z-50" 
        role="navigation" 
        aria-label="Main Navigation" 
        style={{ borderTopColor: '#f0f0f0', borderBottomColor: '#f0f0f0' }}
      >
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-center py-3">
            <div className="hidden lg:flex items-center gap-6">
              {categories.filter(cat => cat.id !== 'miscellaneous').map((category, index) => (
                <React.Fragment key={category.id}>
                  <Link
                    href={`/topics/${category.id}`}
                    className="text-gray-600 hover:text-gray-900 transition-colors text-xs font-bold uppercase tracking-wider whitespace-nowrap hover:underline underline-offset-4 decoration-2 decoration-blue-500"
                    style={{ letterSpacing: '0.1em' }}
                  >
                    {category.name.replace(' Law', '')}
                  </Link>
                  {index < categories.filter(cat => cat.id !== 'miscellaneous').length - 1 && (
                    <span className="text-gray-400 font-light">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Mobile Topics Preview */}
            <div className="lg:hidden flex items-center gap-3 overflow-x-auto">
              {categories.filter(cat => cat.id !== 'miscellaneous').slice(0, 3).map((category) => (
                <Link
                  key={category.id}
                  href={`/topics/${category.id}`}
                  className="text-gray-600 hover:text-gray-900 transition-colors text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                  style={{ letterSpacing: '0.1em' }}
                >
                  {category.name.replace(' Law', '')}
                </Link>
              ))}
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="text-gray-500 hover:text-gray-700 transition-colors text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                style={{ letterSpacing: '0.1em' }}
              >
                More...
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      <div className="lg:hidden border-t border-gray-200">
        <div className="container mx-auto px-6">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center justify-center py-4 text-gray-600 w-full"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          {mobileMenuOpen && (
            <div className="pb-4">
              <div className="grid grid-cols-2 gap-4">
                {categories.filter(cat => cat.id !== 'miscellaneous').map((category) => (
                  <Link
                    key={category.id}
                    href={`/topics/${category.id}`}
                    className="text-gray-700 hover:text-gray-900 transition-colors font-sans font-bold text-sm uppercase tracking-wider py-2 block"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {category.name.replace(' Law', '')}
                  </Link>
                ))}
              </div>
              <div className="border-t border-gray-200 mt-4 pt-4 space-y-2">
                <Link href="/about" className="text-gray-600 hover:text-gray-900 transition-colors text-sm block py-2">About</Link>
                <Link href="/about/editorial-process" className="text-gray-600 hover:text-gray-900 transition-colors text-sm block py-2">How We Report</Link>
                <Link href="/about/sources" className="text-gray-600 hover:text-gray-900 transition-colors text-sm block py-2">Sources</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
