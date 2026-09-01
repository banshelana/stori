export function Rating({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="flex items-center gap-1.5">
      <div className="relative h-4 w-20">
        {/* stars background */}
        <div className="absolute inset-0 text-sm text-slate-300" aria-hidden>
          ★★★★★
        </div>
        {/* filled */}
        <div
          className="absolute inset-0 overflow-hidden text-sm text-amber-400"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          ★★★★★
        </div>
      </div>
      <span className="text-xs text-slate-500">{value.toFixed(1)}</span>
    </div>
  );
}
