import Link from "next/link";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { Icon } from "@/components/panel/Icon";
import { Aurora } from "@/components/visual/Aurora";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/paths";
import { translate } from "@/i18n/translate";

/**
 * Split layout: a branded panel on the reading side, the form on the
 * other. The panel collapses away below `lg`, where a phone has no room
 * for decoration and the form is the only thing that matters.
 */
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
  const t = (path: string) => translate(dict, path);

  const perks = [
    { icon: "cart", label: t("auth.perkOrders") },
    { icon: "pin", label: t("auth.perkAddresses") },
    { icon: "sparkles", label: t("auth.perkBilingual") },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* -------------------------------------------- brand panel */}
      <aside className="relative isolate hidden w-[44%] flex-col justify-between overflow-hidden bg-slate-950 p-12 text-white lg:flex">
        <Aurora />

        <Link
          href={localePath(locale, "/")}
          className="relative flex items-center gap-2.5 text-lg font-bold"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
            &#8962;
          </span>
          {t("common.appName")}
        </Link>

        <div className="relative animate-fade-up">
          <h2 className="max-w-sm text-3xl font-extrabold leading-tight tracking-tight">
            {t("auth.brandPitch")}
          </h2>
          <p className="mt-4 max-w-sm leading-relaxed text-indigo-100/70">
            {t("auth.brandBody")}
          </p>

          <ul className="mt-10 space-y-4">
            {perks.map((perk, i) => (
              <li
                key={perk.label}
                className="animate-slide-in flex items-center gap-3 text-sm text-indigo-50/90"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <span className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
                  <Icon name={perk.icon} className="h-4 w-4" />
                </span>
                {perk.label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-200/50">
          Next.js &middot; App Router &middot; Tailwind CSS
        </p>
      </aside>

      {/* --------------------------------------------- form side */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <Link
            href={localePath(locale, "/")}
            className="flex items-center gap-2 font-bold text-slate-900 lg:invisible"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              &#8962;
            </span>
            {t("common.appName")}
          </Link>
          <LocaleSwitcher compact />
        </header>

        <div className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="animate-fade-up w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
