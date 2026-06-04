import Link from 'next/link';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0c0c0e] text-zinc-100">
      <main className="flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#161618] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
          <div className="px-8 pb-2 pt-8">
            <div className="mb-8 text-left">
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-white">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{subtitle}</p>
              ) : null}
            </div>
            {children}
          </div>
          {footer ? (
            <div className="border-t border-white/5 bg-[#121214] px-8 py-4 text-center text-sm text-zinc-500">
              {footer}
            </div>
          ) : null}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 hidden border-t border-white/5 bg-[#0c0c0e]/80 px-4 py-2 text-center text-[10px] text-zinc-600 sm:block">
        <Link href="/" className="hover:text-zinc-400">
          Jupiter
        </Link>
        <span className="mx-2">·</span>
        <span>VPBank project tracker</span>
      </footer>
    </div>
  );
}
