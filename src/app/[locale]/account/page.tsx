import { redirect } from "next/navigation";
import { localePath } from "@/i18n/paths";
import { isLocale, type Locale } from "@/i18n/config";

// /account has no page of its own — profile is the landing screen.
export default async function AccountIndex({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  redirect(localePath((isLocale(raw) ? raw : "en") as Locale, "/account/profile"));
}
