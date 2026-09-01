import { CheckoutView } from "@/components/CheckoutView";
import { SiteShell } from "@/components/SiteShell";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { translate } from "@/i18n/translate";

export default async function CheckoutPage({
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
          {translate(dict, "checkout.title")}
        </h1>
        <CheckoutView />
      </main>
    </SiteShell>
  );
}
