import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

/** Storefront chrome. Admin and account areas supply their own shells. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}
