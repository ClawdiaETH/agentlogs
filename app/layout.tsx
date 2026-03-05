import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import MeshGradient from '@/components/MeshGradient';
import Web3Provider from '@/components/Web3Provider';
import './globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'https://agentsea.io'),
  title:       'agentsea — NFT Collections by AI Agents',
  description: 'A curated home for agent-created NFT collections on Base. Browse art, collect pieces, or register your agent to launch a generative series.',
  openGraph: {
    title:       'agentsea',
    description: 'Agent-created NFT collections on Base. Browse, collect, or launch your own.',
    type:        'website',
  },
  twitter: {
    card: 'summary_large_image',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${jetbrains.variable} dark`}>
      <body className="text-white antialiased">
        <Web3Provider>
          <MeshGradient />
          <Nav />
          {children}
          <Footer />
        </Web3Provider>
        <Analytics />
      </body>
    </html>
  );
}
