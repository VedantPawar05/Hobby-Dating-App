import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white border-t border-surface-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
                R
              </div>
              <span className="font-bold text-base tracking-tight text-surface-900">
                Ricoz Club
              </span>
            </div>
            <p className="text-sm text-surface-600 max-w-sm leading-relaxed">
              Discover real-world running clubs, hiking adventures, padel games, and hobby
              gatherings. Connect naturally through the sports and activities you love.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-900 mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-sm text-surface-600">
              <li>
                <Link href="/events?category=Running" className="hover:text-brand-700 transition-colors">
                  Run Clubs
                </Link>
              </li>
              <li>
                <Link href="/events?category=Hiking" className="hover:text-brand-700 transition-colors">
                  Hiking & Trails
                </Link>
              </li>
              <li>
                <Link href="/events?category=Padel" className="hover:text-brand-700 transition-colors">
                  Padel & Tennis
                </Link>
              </li>
              <li>
                <Link href="/events?category=Climbing" className="hover:text-brand-700 transition-colors">
                  Bouldering & Climbing
                </Link>
              </li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-surface-900 mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-sm text-surface-600">
              <li>
                <Link href="/events" className="hover:text-brand-700 transition-colors">
                  All Activities
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-brand-700 transition-colors">
                  Join the Community
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-700 transition-colors">
                  Member Login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-surface-100 flex flex-col sm:flex-row items-center justify-between text-xs text-surface-500">
          <p>© {new Date().getFullYear()} Ricoz Club. Activity-First Community & Dating.</p>
          <p className="mt-2 sm:mt-0">Real people. Real activities. Real connections.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
