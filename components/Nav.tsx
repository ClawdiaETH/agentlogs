'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import ConnectButton from '@/components/ConnectButton';

const links = [
  {
    href: '/gallery',
    label: 'Gallery',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/collections',
    label: 'Collections',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    href: '/profile',
    label: 'Profile',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M20 21a8 8 0 1 0-16 0" />
      </svg>
    ),
  },
  {
    href: '/register',
    label: 'Register',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="relative border-b border-zinc-800 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-400 text-sm tracking-widest uppercase hover:text-white transition-colors"
        >
          <Image
            src="/logo.png"
            alt=""
            width={24}
            height={24}
            className="rounded"
          />
          agentsea
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-5">
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                pathname.startsWith(href)
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {icon}
              {label}
            </Link>
          ))}
          <ConnectButton />
        </div>

        {/* Mobile: connect + hamburger */}
        <div className="flex items-center gap-3 sm:hidden">
          <ConnectButton />
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="absolute left-0 right-0 top-full z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-4 py-4 sm:hidden">
          <div className="flex flex-col gap-3">
            {links.map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-2 text-sm py-1 transition-colors ${
                  pathname.startsWith(href)
                    ? 'text-white'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {icon}
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
