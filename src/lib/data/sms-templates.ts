import type { LocalizedText } from "@/i18n/localized";
import type { MessageChannel } from "@/lib/data/commerce";

// ---------------------------------------------------------------
// Reusable message bodies, shared by both channels.
//
// Name and body are per-locale like every other piece of content in
// the app. Only email carries a subject; an SMS template leaves it
// undefined rather than storing an empty string, so the field is
// absent rather than blank.
//
// Bodies may contain {firstName}, {lastName}, {fullName} and
// {mobile}; see src/lib/sms.ts for how they resolve.
// ---------------------------------------------------------------

export interface MessageTemplate {
  id: string;
  channel: MessageChannel;
  name: LocalizedText;
  /** Email only — SMS has no subject line. */
  subject?: LocalizedText;
  body: LocalizedText;
  createdAt: string;
}

export const MOCK_TEMPLATES: MessageTemplate[] = [
  {
    id: "tpl-001",
    channel: "sms",
    name: { en: "Order shipped", fa: "ارسال سفارش" },
    body: {
      en: "Hi {firstName}, your order has shipped and should arrive within 48 hours. Thanks for shopping with us.",
      fa: "{firstName} عزیز، سفارش شما ارسال شد و ظرف ۴۸ ساعت به دستتان می‌رسد. از خرید شما سپاسگزاریم.",
    },
    createdAt: "2026-02-10",
  },
  {
    id: "tpl-002",
    channel: "sms",
    name: { en: "Payment received", fa: "دریافت وجه" },
    body: {
      en: "Hi {firstName}, we have received your payment. Your order is now being prepared.",
      fa: "{firstName} عزیز، پرداخت شما دریافت شد. سفارشتان در حال آماده‌سازی است.",
    },
    createdAt: "2026-02-10",
  },
  {
    id: "tpl-003",
    channel: "sms",
    name: { en: "Back in stock", fa: "موجود شد" },
    body: {
      en: "Good news {firstName} — an item on your wishlist is back in stock.",
      fa: "خبر خوب {firstName}! کالای مورد علاقه شما دوباره موجود شد.",
    },
    createdAt: "2026-03-02",
  },
  {
    id: "tpl-004",
    channel: "sms",
    name: { en: "Seasonal offer", fa: "پیشنهاد فصلی" },
    body: {
      en: "Our seasonal sale is live: up to 30% off selected items this week only.",
      fa: "حراج فصلی ما آغاز شد: تا ۳۰٪ تخفیف روی کالاهای منتخب، فقط همین هفته.",
    },
    createdAt: "2026-04-18",
  },
  {
    id: "tpl-005",
    channel: "email",
    name: { en: "Order receipt", fa: "رسید سفارش" },
    subject: {
      en: "Your receipt — order confirmed",
      fa: "رسید سفارش شما — تأیید شد",
    },
    body: {
      en: "Hi {firstName},\n\nThank you for your order. Your receipt is below and your items are on their way.\n\nIf anything is wrong, just reply to this email.",
      fa: "{firstName} عزیز،\n\nاز خرید شما سپاسگزاریم. رسید سفارش در ادامه آمده و کالاها در راه هستند.\n\nاگر مشکلی بود کافی است به همین ایمیل پاسخ دهید.",
    },
    createdAt: "2026-05-02",
  },
  {
    id: "tpl-006",
    channel: "email",
    name: { en: "Welcome", fa: "خوش‌آمدگویی" },
    subject: {
      en: "Welcome to the store, {firstName}",
      fa: "{firstName} عزیز، به فروشگاه خوش آمدید",
    },
    body: {
      en: "Hi {firstName},\n\nThanks for creating an account. You can track orders, save addresses and keep your details in one place.\n\nHappy browsing.",
      fa: "{firstName} عزیز،\n\nاز ساخت حساب کاربری شما سپاسگزاریم. می‌توانید سفارش‌ها را دنبال کنید، آدرس ذخیره کنید و اطلاعاتتان را یک‌جا نگه دارید.\n\nخریدی خوش داشته باشید.",
    },
    createdAt: "2026-05-20",
  },
];

function delay(ms = 150) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export async function mockTemplates(): Promise<MessageTemplate[]> {
  await delay();
  return MOCK_TEMPLATES;
}
