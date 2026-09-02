/**
 * Route-level suspense fallback.
 *
 * Mirrors the page shell rather than showing a spinner, so the layout
 * does not jump when the real content arrives.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="skeleton h-9 w-48 rounded-lg" aria-hidden />
      <div className="mt-3 skeleton h-1 w-16 rounded-full" aria-hidden />

      <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="skeleton h-72 rounded-2xl" aria-hidden />
        <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-64 rounded-2xl" aria-hidden />
          ))}
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
