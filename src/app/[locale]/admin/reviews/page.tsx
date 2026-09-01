import { ReviewsSection } from "@/components/admin/ReviewsSection";
import { Guard } from "@/lib/auth/Guard";

export default function Page() {
  return (
    <Guard permission="reviews.view">
      <ReviewsSection />
    </Guard>
  );
}
