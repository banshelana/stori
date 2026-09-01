/**
 * Decorative gradient backdrop.
 *
 * Three blurred colour blobs drifting on long, offset cycles, plus a
 * faint grid. Pure CSS — no canvas, no images, nothing fetched — and
 * `aria-hidden` throughout because it carries no meaning.
 */
export function Aurora({
  className = "",
  variant = "brand",
}: {
  className?: string;
  variant?: "brand" | "subtle";
}) {
  const blobs =
    variant === "brand"
      ? [
          "bg-indigo-500/60",
          "bg-fuchsia-500/50",
          "bg-sky-400/50",
        ]
      : ["bg-indigo-300/40", "bg-violet-300/35", "bg-sky-300/35"];

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className={`animate-drift absolute -start-24 -top-32 h-[28rem] w-[28rem] rounded-full blur-3xl ${blobs[0]}`}
      />
      <div
        className={`animate-drift absolute -end-24 top-10 h-[26rem] w-[26rem] rounded-full blur-3xl ${blobs[1]}`}
        style={{ animationDelay: "-6s" }}
      />
      <div
        className={`animate-drift absolute -bottom-20 start-1/3 h-[24rem] w-[24rem] rounded-full blur-3xl ${blobs[2]}`}
        style={{ animationDelay: "-12s" }}
      />

      {/* Grid overlay, faded out toward the edges. */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 40%, black, transparent)",
        }}
      />
    </div>
  );
}
