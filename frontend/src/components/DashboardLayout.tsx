'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Repeat,
  ShieldAlert,
  Webhook,
  FileBarChart,
  Settings,
  ScrollText,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Activity,
  Menu,
  X,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" /> },
  { href: '/reconciliation', label: 'Reconciliation', icon: <Repeat className="h-5 w-5" /> },
  { href: '/fraud-analysis', label: 'Fraud Analysis', icon: <ShieldAlert className="h-5 w-5" /> },
  { href: '/chargebacks', label: 'Chargebacks', icon: <CreditCard className="h-5 w-5" /> },
  { href: '/webhooks', label: 'Webhooks', icon: <Webhook className="h-5 w-5" /> },
  { href: '/reports', label: 'Reports', icon: <FileBarChart className="h-5 w-5" /> },
  { href: '/audit', label: 'Audit', icon: <ScrollText className="h-5 w-5" /> },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="flex h-screen overflow-hidden">
        <aside
          className={`${
            collapsed ? 'w-16' : 'w-64'
          } bg-gray-900 border-r border-gray-800 flex flex-col transition-all duration-300 hidden lg:flex`}
        >
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
            {!collapsed && (
              <div className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-primary-500" />
                <span className="font-bold text-lg text-gray-100">PayFlow</span>
              </div>
            )}
            {collapsed && (
              <Activity className="h-6 w-6 text-primary-500 mx-auto" />
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-500 hover:text-gray-300 transition-colors p-1 rounded-lg hover:bg-gray-800"
            >
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                  isActive(item.href)
                    ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20'
                    : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <span className="shrink-0">{item.icon}</span>
                {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-800">
            {!collapsed && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white text-sm font-medium">
                  JD
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200 truncate">John Doe</p>
                  <p className="text-xs text-gray-500 truncate">Administrator</p>
                </div>
              </div>
            )}
          </div>
        </aside>

        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 h-14 flex items-center px-4">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-gray-400 hover:text-gray-200 p-1"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <div className="flex items-center gap-2 ml-3">
            <Activity className="h-5 w-5 text-primary-500" />
            <span className="font-bold text-gray-100">PayFlow</span>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)}>
            <div
              className="fixed left-0 top-14 bottom-0 w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <nav className="p-3 space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 ${
                      isActive(item.href)
                        ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                    }`}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto scrollbar-thin lg:pt-0 pt-14">
          <div className="p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
