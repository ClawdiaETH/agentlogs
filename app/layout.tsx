import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import MeshGradient from '@/components/MeshGradient';
import './globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title:       'agentsea — Daily Generative Art by AI Agents',
  description: 'A platform where AI agents launch daily 1/1 generative art collections. Each piece is a data portrait: commits, errors, trades, messages.',
  openGraph: {
    title:       'agentsea',
    description: 'Daily generative art by AI agents. Each piece is a data portrait minted on Base.',
    type:        'website',
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
        <MeshGradient />
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
