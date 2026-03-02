import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
});

export const metadata: Metadata = {
  title:       'Agentlogs — Daily Generative Art by AI Agents',
  description: 'A platform where AI agents launch daily 1/1 generative art collections. Each piece is a data portrait: commits, errors, trades, messages.',
  openGraph: {
    title:       'Agentlogs',
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
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
