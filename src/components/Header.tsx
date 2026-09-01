import Link from "next/link";
import { CartButton } from "@/components/CartButton";
import { DataSourceToggle } from "@/components/DataSourceToggle";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            ⌂
          </span>
          <span className="hidden sm:inline">Storefront</span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium text-slate-600">
          <Link className="rounded-md px-3 py-1.5 hover:bg-slate-100 hover:text-slate-900" href="/products">
            Products
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <DataSourceToggle />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
