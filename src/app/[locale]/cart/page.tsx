import { CartView } from "@/components/CartView";
import { SiteShell } from "@/components/SiteShell";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { translate } from "@/i18n/translate";

export default async function CartPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const dict = await getDictionary((isLocale(raw) ? raw : "en") as Locale);

  return (
    <SiteShell>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-3xl font-bold text-slate-900">
          {translate(dict, "cart.title")}
        </h1>
        <CartView />
      </main>
    </SiteShell>
  );
}
