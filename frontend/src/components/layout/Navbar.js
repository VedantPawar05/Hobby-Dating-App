'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../context/AuthContext.js';
import { Compass, User, LogOut, Menu, X, Sparkles } from 'lucide-react';
import Button from '../common/Button.js';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/events', label: 'Explore Activities', icon: Compass },
    ...(isAuthenticated
      ? [
          { href: '/dashboard', label: 'My Hub', icon: Sparkles },
          { href: '/profile', label: 'Profile', icon: User },
        ]
      : []),
  ];

  const isActive = (path) => pathname === path || pathname.startsWith(`${path}/`);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-surface-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:bg-brand-700 transition-colors">
              R
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-surface-900 group-hover:text-brand-700 transition-colors">
                Ricoz
              </span>
              <span className="text-[10px] font-medium tracking-wider uppercase text-brand-700 -mt-1">
                Run Club & Hobbies
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-50'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop User Account Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3 pl-3 border-l border-surface-200">
                <Link
                  href="/profile"
                  className="flex items-center space-x-2.5 text-sm font-medium text-surface-700 hover:text-surface-900"
                >
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs border border-brand-200">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.fullName}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-surface-500 hover:text-red-600"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="primary" size="sm">
                    Join Club
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-surface-600 hover:text-surface-900 hover:bg-surface-100"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-surface-200 bg-white px-4 pt-2 pb-5 space-y-2 animate-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-surface-700 hover:bg-surface-50'
                }`}
              >
                <Icon className="w-4 h-4 mr-3" />
                {link.label}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-surface-100">
            {isAuthenticated ? (
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center text-xs">
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-surface-900">{user?.fullName}</p>
                    <p className="text-xs text-surface-500">{user?.email}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Sign out
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="primary" size="sm" className="w-full">
                    Join Club
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
