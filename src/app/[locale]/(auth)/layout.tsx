import Link from "next/link";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/paths";
import { translate } from "@/i18n/translate";

/** Minimal chrome for the auth screens — no store nav, no cart. */
export default async function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const locale = (isLocale(raw) ? raw : "en") as Locale;
  const dict = await getDictionary(locale);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between px-6 py-4">
        <Link
          href={localePath(locale, "/")}
          className="flex items-center gap-2 text-lg font-bold text-slate-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
            &#8962;
          </span>
          {translate(dict, "common.appName")}
        </Link>
        <LocaleSwitcher compact />
      </header>

      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        {children}
      </div>
    </div>
  );
}
