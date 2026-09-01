import { CheckoutView } from "@/components/CheckoutView";

export const metadata = {
  title: "Checkout",
};

export default function CheckoutPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Checkout</h1>
      <CheckoutView />
    </main>
  );
}
