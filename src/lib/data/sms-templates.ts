import type { LocalizedText } from "@/i18n/localized";

// ---------------------------------------------------------------
// Reusable message bodies. Both the name and the body are per-locale,
// like every other piece of content in the app: an Iranian store
// sends Persian, but the panel is bilingual and the same template
// needs to exist in whichever language the operator is working in.
//
// Bodies may contain {firstName}, {lastName}, {fullName} and
// {mobile}; see src/lib/sms.ts for how they resolve.
// ---------------------------------------------------------------

export interface SmsTemplate {
  id: string;
  name: LocalizedText;
  body: LocalizedText;
  createdAt: string;
}

export const MOCK_SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: "tpl-001",
    name: { en: "Order shipped", fa: "ارسال سفارش" },
    body: {
      en: "Hi {firstName}, your order has shipped and should arrive within 48 hours. Thanks for shopping with us.",
      fa: "{firstName} عزیز، سفارش شما ارسال شد و ظرف ۴۸ ساعت به دستتان می‌رسد. از خرید شما سپاسگزاریم.",
    },
    createdAt: "2026-02-10",
  },
  {
    id: "tpl-002",
    name: { en: "Payment received", fa: "دریافت وجه" },
    body: {
      en: "Hi {firstName}, we have received your payment. Your order is now being prepared.",
      fa: "{firstName} عزیز، پرداخت شما دریافت شد. سفارشتان در حال آماده‌سازی است.",
    },
    createdAt: "2026-02-10",
  },
  {
    id: "tpl-003",
    name: { en: "Back in stock", fa: "موجود شد" },
    body: {
      en: "Good news {firstName} — an item on your wishlist is back in stock.",
      fa: "خبر خوب {firstName}! کالای مورد علاقه شما دوباره موجود شد.",
    },
    createdAt: "2026-03-02",
  },
  {
    id: "tpl-004",
    name: { en: "Seasonal offer", fa: "پیشنهاد فصلی" },
    body: {
      en: "Our seasonal sale is live: up to 30% off selected items this week only.",
      fa: "حراج فصلی ما آغاز شد: تا ۳۰٪ تخفیف روی کالاهای منتخب، فقط همین هفته.",
    },
    createdAt: "2026-04-18",
  },
];

function delay(ms = 150) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function mockTemplates(): Promise<SmsTemplate[]> {
  await delay();
  return MOCK_SMS_TEMPLATES;
}
