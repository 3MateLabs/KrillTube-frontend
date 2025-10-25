'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navigationItems = [
    {
      label: 'Home',
      href: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      label: 'Library',
      href: '/library',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
    {
      label: 'Upload',
      href: '/upload',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
    },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-walrus-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-[60px] left-0 bottom-0 z-40 w-64
          bg-background/95 backdrop-blur-xl border-r border-walrus-mint
          transition-all duration-300 ease-in-out
          lg:translate-x-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-transparent pointer-events-none" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern-subtle opacity-20 pointer-events-none" />

        <div className="relative h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <div className="px-3 pb-3 pt-6 space-y-6">
            {/* Main Navigation */}
            <nav className="space-y-1">
              {navigationItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`
                      group relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                      transition-all duration-200 font-medium text-base
                      ${active
                        ? 'bg-walrus-mint text-walrus-black shadow-lg shadow-mint-900/20'
                        : 'hover:bg-background-elevated text-foreground/80 hover:text-foreground active:scale-95'
                      }
                    `}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-walrus-black rounded-r-full" />
                    )}

                    {/* Icon with animation */}
                    <div className={`
                      transition-transform duration-200
                      ${active ? 'scale-110' : 'group-hover:scale-110'}
                    `}>
                      {item.icon}
                    </div>

                    {/* Label */}
                    <span className="flex-1">{item.label}</span>

                    {/* Hover effect glow */}
                    {!active && (
                      <div className="absolute inset-0 bg-walrus-mint/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Bottom spacing */}
            <div className="h-4" />
          </div>
        </div>
      </aside>
    </>
  );
}
