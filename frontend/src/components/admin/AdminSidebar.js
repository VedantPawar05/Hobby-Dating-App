'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Award,
  CalendarDays,
  Ticket,
  ShieldAlert,
  History,
  Settings,
  LogOut,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/organizers', label: 'Organizers', icon: Award },
  { href: '/admin/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/bookings', label: 'Bookings', icon: Ticket },
  { href: '/admin/reports', label: 'Reports & Moderation', icon: ShieldAlert },
  { href: '/admin/logs', label: 'Moderation Logs', icon: History },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0">
        <div className="bg-white border border-surface-200 rounded-2xl p-4 shadow-sm sticky top-24 space-y-4">
          <div className="px-3 py-2 border-b border-surface-100 flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-600 text-white flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900">Admin Console</p>
              <p className="text-[11px] text-slate-500">Ricoz Moderation</p>
            </div>
          </div>

          <nav className="space-y-1">
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-slate-600 hover:bg-surface-50 hover:text-surface-900'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-surface-100">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4 mr-2.5 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </nav>
        </div>
      </aside>

      {/* Mobile / Tablet Navigation Bar */}
      <div className="lg:hidden mb-6 overflow-x-auto pb-1">
        <nav className="flex items-center space-x-2 min-w-max">
          {ADMIN_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                  active
                    ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                    : 'bg-white text-slate-700 border-surface-200 hover:bg-surface-50'
                }`}
              >
                <Icon className="w-3.5 h-3.5 mr-1.5" />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold border bg-white text-red-600 border-red-200 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Logout
          </button>
        </nav>
      </div>
    </>
  );
}

export default AdminSidebar;
