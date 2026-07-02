import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import './global.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: {
    default: 'PermitGraph Docs',
    template: '%s | PermitGraph Docs',
  },
  description:
    'Developer documentation for Agent Permit Office, a permit gate for AI agents, MCP servers, CI workflows, and repository access.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${dmSans.variable} flex min-h-screen flex-col`}>
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
