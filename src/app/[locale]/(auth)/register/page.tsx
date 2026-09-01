import { RegisterForm } from "@/components/auth/RegisterForm";
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
  return { title: translate(dict, "nav.register") };
}

export default function RegisterPage() {
  return <RegisterForm />;
}
