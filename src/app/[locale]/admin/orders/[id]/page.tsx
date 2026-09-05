import { OrderDetailSection } from "@/components/admin/OrderDetailSection";
import { Guard } from "@/lib/auth/Guard";

/**
 * One order, in full. Reached from Sales and from the order queue.
 *
 * Not statically generated: order ids come from the database and the page
 * exists to show live state, so pre-rendering a snapshot would be worse
 * than useless.
 */
export const dynamicParams = true;

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Guard permission="sales.view">
      <OrderDetailSection orderId={id} />
    </Guard>
  );
}
