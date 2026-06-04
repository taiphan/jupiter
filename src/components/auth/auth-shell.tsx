import Link from 'next/link';

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="flex h-12 items-center border-b bg-card px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-[10px] font-black text-primary-foreground">
            J
          </span>
          <span className="text-sm font-semibold">Jupiter</span>
        </Link>
      </header>

      <main className="flex min-h-[calc(100vh-3rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px] rounded-lg border bg-card p-8 ds-shadow-raised">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-[#00A651] text-sm font-black text-white">
              VP
            </span>
            <h1 className="text-xl font-semibold">{title}</h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {children}
        </div>
      </main>

      <footer className="border-t bg-card px-4 py-3 text-center text-[11px] text-muted-foreground">
        © 2026 VPBank · Atlassian-style project tracker
      </footer>
    </div>
  );
}
