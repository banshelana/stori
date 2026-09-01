export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Storefront. All rights reserved.</p>
        <p className="text-slate-400">
          Built with Next.js · App Router · Tailwind CSS
        </p>
      </div>
    </footer>
  );
}
