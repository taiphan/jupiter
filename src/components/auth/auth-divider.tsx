export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <span className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center text-xs">
        <span className="bg-[#161618] px-3 text-zinc-500">{label}</span>
      </div>
    </div>
  );
}
