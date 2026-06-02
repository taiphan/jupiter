import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ThemeProvider } from '@/components/layout/theme-provider';
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FE CREDIT — Jira',
  description: 'Plan, track, and ship work across the FE CREDIT engineering teams.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground">
        <ThemeProvider>
          <TooltipProvider>
            <AuthenticatedLayout>{children}</AuthenticatedLayout>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
