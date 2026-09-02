import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { dirOf, isLocale, LOCALES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { I18nProvider } from "@/i18n/I18nProvider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { DataSourceProvider } from "@/lib/data/source-context";
import { CouponProvider } from "@/lib/coupon-context";
import { FavoritesProvider } from "@/lib/favorites-context";
import { SettingsProvider } from "@/lib/settings-context";
import { fontEn, fontFa } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Storefront", template: "%s · Storefront" },
  description: "A demo e-commerce storefront built with Next.js.",
};

/** Both locales are known at build time, so every shell prerenders. */
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const typedLocale = locale as Locale;
  const dict = await getDictionary(typedLocale);
  const dir = dirOf(typedLocale);

  return (
    <html
      lang={typedLocale}
      dir={dir}
      // Both font variables are always defined; globals.css picks the
      // right family off [lang], so switching locale needs no JS.
      className={`${fontEn.variable} ${fontFa.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {/* Scroll-reveal starts elements at opacity 0 and JavaScript
            brings them in. With scripting off that would hide the page,
            so neutralise it outright. */}
        <noscript>
          <style>{`.reveal-pending { opacity: 1 !important; }`}</style>
        </noscript>
        <I18nProvider locale={typedLocale} dict={dict}>
          <AuthProvider>
            <SettingsProvider>
              <DataSourceProvider>
                <CartProvider>
                  <FavoritesProvider>
                    <CouponProvider>{children}</CouponProvider>
                  </FavoritesProvider>
                </CartProvider>
              </DataSourceProvider>
            </SettingsProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
