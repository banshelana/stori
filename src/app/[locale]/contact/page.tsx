import { ContactForm } from "@/components/ContactForm";
import { SiteShell } from "@/components/SiteShell";
import { isLocale, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { translate } from "@/i18n/translate";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  const dict = await getDictionary((isLocale(raw) ? raw : "en") as Locale);
  return { title: translate(dict, "contact.title") };
}

export default function Page() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-xl px-4 py-12">
        <ContactForm />
      </main>
    </SiteShell>
  );
}
