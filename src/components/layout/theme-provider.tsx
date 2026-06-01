'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;

    if (mode === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = (matches: boolean) => root.classList.toggle('dark', matches);
      apply(mql.matches);
      const listener = (e: MediaQueryListEvent) => apply(e.matches);
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }
    root.classList.toggle('dark', mode === 'dark');
  }, [mode]);

  return <>{children}</>;
}
