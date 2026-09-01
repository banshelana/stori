import { CartView } from "@/components/CartView";

export const metadata = {
  title: "Cart",
};

export default function CartPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">Your cart</h1>
      <CartView />
    </main>
  );
}
