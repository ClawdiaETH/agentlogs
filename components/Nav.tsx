'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/gallery', label: 'Gallery' },
  { href: '/register', label: 'Register' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
      <Link
        href="/"
        className="text-zinc-400 text-sm tracking-widest uppercase hover:text-white transition-colors"
      >
        agentsea
      </Link>
      <div className="flex items-center gap-4">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-xs transition-colors ${
              pathname.startsWith(href)
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
