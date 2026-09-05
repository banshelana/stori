// ---------------------------------------------------------------
// Customer product reviews.
//
// Separate from commerce.ts so the catalog can derive ratings from
// these without a circular import: commerce.ts imports products,
// and products now need reviews.
// ---------------------------------------------------------------

export interface Review {
  id: string;
  productId: string;
  userId: string;
  rating: number;
  body: string;
  approved: boolean;
  createdAt: string;
}

export const MOCK_REVIEWS: Review[] = [
  {
    id: "r-001",
    productId: "p-001",
    userId: "u-004",
    rating: 5,
    body: "Excellent noise cancelling, battery lasts all week.",
    approved: true,
    createdAt: "2026-06-10",
  },
  {
    id: "r-002",
    productId: "p-001",
    userId: "u-005",
    rating: 4,
    body: "Great sound, though the case is bulkier than I expected.",
    approved: true,
    createdAt: "2026-06-22",
  },
  {
    id: "r-003",
    productId: "p-003",
    userId: "u-005",
    rating: 4,
    body: "Great screen, but the strap could be softer.",
    approved: true,
    createdAt: "2026-05-02",
  },
  {
    id: "r-004",
    productId: "p-003",
    userId: "u-004",
    rating: 5,
    body: "Battery genuinely lasts the week they claim.",
    approved: true,
    createdAt: "2026-07-14",
  },
  {
    id: "r-005",
    productId: "p-002",
    userId: "u-004",
    rating: 3,
    body: "Fine for the price, transparency mode is hit and miss.",
    approved: false,
    createdAt: "2026-08-14",
  },
  {
    id: "r-006",
    productId: "p-002",
    userId: "u-005",
    rating: 4,
    body: "Comfortable for long calls and they pair instantly.",
    approved: true,
    createdAt: "2026-07-30",
  },
  {
    id: "r-007",
    productId: "p-005",
    userId: "u-005",
    rating: 5,
    body: "The switches feel superb and the build is solid metal.",
    approved: true,
    createdAt: "2026-06-05",
  },
  {
    id: "r-008",
    productId: "p-005",
    userId: "u-004",
    rating: 4,
    body: "Lovely to type on, though it is louder than I hoped.",
    approved: true,
    createdAt: "2026-08-02",
  },
  {
    id: "r-009",
    productId: "p-007",
    userId: "u-004",
    rating: 5,
    body: "Warm light and the dimmer goes properly low for evenings.",
    approved: true,
    createdAt: "2026-07-19",
  },
  {
    id: "r-010",
    productId: "p-008",
    userId: "u-005",
    rating: 2,
    body: "Handsome mug but the handle gets hot with boiling water.",
    approved: true,
    createdAt: "2026-08-09",
  },
  {
    id: "r-011",
    productId: "p-008",
    userId: "u-004",
    rating: 3,
    body: "Good size, glaze chipped after a month in the dishwasher.",
    approved: true,
    createdAt: "2026-08-21",
  },
  {
    id: "r-012",
    productId: "p-007",
    userId: "u-005",
    rating: 4,
    // Deliberately unapproved: this is the state the customer cannot
    // otherwise see, since a pending review is absent from the product
    // page. Their orders page is the only place it surfaces.
    body: "Lovely warm light, though the touch dimmer takes a moment to respond.",
    approved: false,
    createdAt: "2026-08-28",
  },
];
