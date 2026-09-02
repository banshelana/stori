# Storefront Template

A bilingual (English / Farsi), role-based e-commerce template built with **Next.js 15 (App Router)**, **React 19**, **TypeScript** and **Tailwind CSS 4**.

Everything loads from disk — no CDN, no Google Fonts, no external request at build time or runtime.

```bash
npm install
npm run dev
```

Open http://localhost:3000 — you'll be redirected to `/en` or `/fa` depending on your browser's language.

---

## Demo accounts

Sign in at `/en/login` (the login screen lists these; click one to fill the form).

| Mobile | Password | Role | Sub-role |
| --- | --- | --- | --- |
| 09120000001 | `admin123` | Admin | Super admin |
| 09120000002 | `manager123` | Admin | Manager |
| 09120000003 | `support123` | Admin | Support |
| 09120000004 | `customer123` | Customer | Regular |
| 09120000005 | `vip123` | Customer | VIP |

Everyone lands on the storefront home after signing in. Your own area — the admin panel for admins, the account pages for customers — is one click away in the user menu at the top right.

---

## Internationalisation

Locale is a **route segment** — `/en/products`, `/fa/products`. `src/middleware.ts` redirects any un-prefixed path using, in order: the `locale` cookie, `Accept-Language`, then the default.

`app/[locale]/layout.tsx` resolves the dictionary on the server and sets `lang` and `dir` on `<html>`, so the correct direction and font are in the first byte of HTML — no flash, no JavaScript required.

| File | Purpose |
| --- | --- |
| `src/i18n/config.ts` | Locales, direction, digit system, BCP-47 tags |
| `src/i18n/dictionaries/{en,fa}.json` | UI strings |
| `src/i18n/dictionaries.ts` | Server-side loader; `en.json` types the shape |
| `src/i18n/translate.ts` | Dot-path lookup with `{placeholder}` interpolation |
| `src/i18n/I18nProvider.tsx` | `useI18n()` / `useT()` for client components |
| `src/i18n/paths.ts` | Pure path helpers (safe to call from the server) |
| `src/i18n/navigation.ts` | `useLocaleHref()`, `useLocaleSwitcher()` |
| `src/i18n/localized.ts` | `LocalizedText` for catalog content |

### Adding a string

Add the key to **both** `en.json` and `fa.json`, then `t("your.key")`. `Dictionary` is typed from `en.json`, so a key missing from Farsi is a build error rather than a blank in production.

### Adding a locale

Add it to `LOCALES`, `LOCALE_DIR`, `LOCALE_LABEL`, `LOCALE_NUMBERING` and `LOCALE_TAG` in `config.ts`, add a dictionary file and a loader entry, and extend `LocalizedText` fixtures. Routing, middleware and the switcher pick it up automatically.

### Two kinds of translated text

- **UI chrome** — buttons, labels, errors. Lives in the dictionaries.
- **Content** — product titles, category names, place names. Typed as `LocalizedText` (`{ en, fa }`) and resolved with `localized(value, locale)`. A real backend returns content already resolved for the requested language; the axios client sends `Accept-Language` for exactly that. The mock source has no server, so it carries every translation.

### Direction

Use Tailwind's **logical** utilities (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`, `text-start`/`text-end`, `border-s`/`border-e`) and RTL works for free. `globals.css` covers the two cases that can't flip automatically:

- `.rtl-flip` — mirrors directional glyphs (arrows, the cart icon).
- `.force-ltr` — keeps phone numbers, postal codes, emails and references left-to-right inside an RTL page.

Persian also gets Eastern Arabic numerals and the Solar Hijri calendar. Never call `Intl` directly — use the helpers in `src/lib/format.ts` (`formatPrice`, `formatNumber`, `formatPercent`, `formatDate`, `formatDateTime`), which all take a `Locale`.

---

## Fonts

`public/fonts/Vazirmatn-Variable.woff2` — one variable file (111 KB) covering both Latin and Persian, loaded via `next/font/local` in `src/lib/fonts.ts`. Licensed under the SIL OFL (`public/fonts/Vazirmatn-OFL.txt`).

`globals.css` selects the family off `html[lang]`, so switching language switches font with no JavaScript.

### Swapping in IRANYekan

IRANYekan is a commercial Fontiran typeface and is not redistributable, so it isn't bundled here. If you hold a web licence:

1. Drop your `.woff2` files into `public/fonts/`.
2. Replace the `src` array of `fontFa` in `src/lib/fonts.ts`.

The CSS variable name (`--font-fa`) stays the same, so nothing else changes.

---

## Roles and permissions

Two roles, each with sub-roles. **Guards and menus check permissions, never role names**, so adding a sub-role is one row in `src/lib/auth/permissions.ts` plus a label in both dictionaries.

| Role | Sub-role | Sees |
| --- | --- | --- |
| Admin | `super-admin` | Everything |
| Admin | `manager` | Everything except platform settings |
| Admin | `support` | Customers, products, reviews, contacts, SMS — no sales or payments |
| Customer | `regular` | Profile, orders, payments, addresses |
| Customer | `vip` | Same as regular (a hook for perks) |

### User menu

`src/components/UserMenu.tsx` is mounted in **both** chromes — the storefront header and the admin/account panel header — so profile and sign-out are reachable from every page. Its entries are permission-gated like everything else: an admin sees *Admin panel*, a customer sees *Profile / My orders / My payments / Addresses*. Pass `showRole` in the panel chrome to show the sub-role beside the avatar.

`panelPathFor(role)` names a user's own area. It is what the menu links to and what the "no access" screen falls back to — **not** the post-login landing page, which is always the storefront home.

```
src/lib/auth/types.ts        Role, SubRole, Permission, User, Session
src/lib/auth/permissions.ts  ROLE_PERMISSIONS — the single source of truth
src/lib/auth/auth-context.tsx  useAuth(): user, ready, signIn/signUp/signOut, can()
src/lib/auth/Guard.tsx       <Guard permission="…"> and <Can permission="…">
src/components/UserMenu.tsx  Permission-gated menu, mounted in both chromes
src/lib/nav.ts               ADMIN_NAV / ACCOUNT_NAV, each item carrying a permission
```

Guard both the layout and the page: the admin layout requires `dashboard.view`, and each section adds its own (`payments.view`, etc.) so a direct URL is refused, not just hidden from the menu.

> **The guard protects the UI, not the data.** With the session in `localStorage` there is no server-side check. Your backend must enforce the same permissions on every endpoint. The axios 401 interceptor is the backstop, not the defence.

---

## Data layer

The template ships two interchangeable sources, switched from the header toggle at runtime and persisted to `localStorage`.

```
src/lib/data/index.ts   listProducts / getProductBySlug / getProductById / getCategories / getFeatured
src/lib/data/mock.ts    In-memory catalog with simulated latency
src/lib/data/api.ts     REST client
src/lib/data/geo.ts     Country → Province → City reference data
src/lib/data/users.ts   Mock users + login/register/profile operations
src/lib/data/commerce.ts  Orders, payments, reviews, contacts, SMS, dashboard stats
```

Selecting **API** without `NEXT_PUBLIC_API_URL` falls back to mock data, and the toggle shows a warning badge so the label never lies.

### Axios

`src/lib/api/client.ts` — one instance with:
- `Authorization: Bearer <token>` from the stored session (falling back to `NEXT_PUBLIC_API_TOKEN`)
- `Accept-Language` from the active locale
- errors normalised to `ApiError { status, code, message }`
- a 401 handler that clears the dead session and fires `auth:unauthorized`

`src/lib/api/endpoints.ts` names every route in one place.

> `NEXT_PUBLIC_API_TOKEN` ships in the client bundle by construction. It is only safe for a public, CORS-scoped key — never a secret.

### Environment

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_DATA_SOURCE` | `mock` (default) or `api` |
| `NEXT_PUBLIC_API_URL` | Base URL of your backend |
| `NEXT_PUBLIC_API_TOKEN` | Optional public key sent as a bearer token |

---

## Routes

```
/[locale]                       Storefront home
/[locale]/products              Catalog — filters driven by the query string
/[locale]/products/[slug]       Product detail (SSG per locale)
/[locale]/cart                  Cart
/[locale]/checkout              Checkout (demo — no payment provider attached)
/[locale]/login                 Sign in
/[locale]/register              Sign up — name, family, mobile only

/[locale]/admin                 Dashboard                    dashboard.view
/[locale]/admin/customers       Customers                    customers.view
/[locale]/admin/sales           Sales                        sales.view
/[locale]/admin/products        Products                     products.view
/[locale]/admin/payments        Payments                     payments.view
/[locale]/admin/reviews         Reviews                      reviews.view
/[locale]/admin/contacts        Contacts                     contacts.view
/[locale]/admin/messages        SMS panel                    messages.view

/[locale]/account/profile       Basic + additional details   account.view
/[locale]/account/orders        Orders, tabbed by status     account.orders
/[locale]/account/payments      Payment history              account.payments
/[locale]/account/addresses     Address book                 account.view
```

### Registration and the profile

Registration asks only for **name, family and mobile**. Email, phone, age, gender and addresses are filled in later from `/account/profile`, which shows a completion meter.

Addresses use a strict **Country → Province → City** cascade from `geo.ts`: choosing a country clears province and city, choosing a province clears city, and `isValidGeoSelection` rejects any stale combination on submit. Street, alley, building no., floor, unit and postal code are free text. Persian numerals entered in numeric fields are folded to ASCII before validation (`src/lib/validation.ts`).

---

## Admin CRUD

All seven admin sections have working create / edit / delete / filter screens built on four shared pieces, so adding an eighth section is roughly 150 lines:

| Piece | Role |
| --- | --- |
| `src/lib/data/repository.ts` | `createRepository<T>()` — search, exact-match filters, sort, paging, and CRUD over an in-memory array |
| `src/lib/data/repositories.ts` | One repository per section, declaring what free-text search matches and which columns sort |
| `src/lib/useResourceList.ts` | Owns search / filter / sort / page state, debounces typing, resets the page when the result set narrows, refetches after a mutation |
| `src/components/panel/DataTable.tsx` | The table, sort headers, row actions, pagination |

Forms use the shared primitives in `src/components/form/Field.tsx` (`TextField`, `TextAreaField`, `SelectField`, `CheckboxField`, `ReadOnlyField`) — each wires `aria-invalid` and `aria-describedby` itself — inside `Modal` / `ConfirmDialog` from `src/components/panel/Modal.tsx`, which handle Escape, focus trapping and focus restore. `src/lib/useFormErrors.ts` clears a field's error the moment it is edited.

| Section | Operations | Write permission |
| --- | --- | --- |
| Customers | Create, edit, delete; filter by sub-role | `customers.write` |
| Products | Create, edit, delete; filter by category; bilingual title/description with auto-slug | `products.write` |
| Sales | Edit status, delete; filter by status; read-only order lines | `sales.write` |
| Payments | Edit status and method, delete; filter by status and method | `payments.write` |
| Reviews | Approve/unapprove, edit, delete; filter by approval | `reviews.write` |
| Contacts | View, mark handled/unhandled, delete; filter by state | `contacts.write` |
| SMS panel | Send, delete; filter by delivery status | `messages.send` |

Read and write permissions are separate: a sub-role holding `payments.view` but not `payments.write` gets the table without the New button or the row actions. Sales falls back to a read-only view dialog rather than hiding the row action entirely.

Mock mutations write to the module-level arrays, so edits survive client-side navigation and reset on a full reload.

## Images

There is no upload endpoint yet, so a picked file is decoded, **downscaled on a canvas in the browser**, and kept as a data URL. Downscaling is not cosmetic — the avatar is persisted into the localStorage session, and a raw phone photo would exhaust the origin quota by itself. A 2.2 MB PNG comes out as a 256x256 WebP of about 2 KB.

| File | Role |
| --- | --- |
| `src/lib/image.ts` | `processImage(file, options)` — type/size validation, downscale, re-encode until it fits a byte budget |
| `src/components/form/ImageUpload.tsx` | `AvatarUpload` (single, round) and `GalleryUpload` (multi, with primary selection and drag-and-drop) |
| `src/lib/product.ts` | `primaryImage`, `primaryImageSrc`, `orderedImages` |
| `src/components/Avatar.tsx` | Photo when present, coloured initials otherwise |

Accepted: JPEG, PNG, WebP, GIF, up to 8 MB in. SVG is excluded — it cannot be meaningfully rasterised on a canvas. Output is WebP where the browser encodes it, PNG otherwise.

### Product gallery

A product holds `images: ProductImage[]` plus `primaryImageId`. **The primary is held by id, not index**, so deleting or reordering the gallery can never silently promote a different image; if the primary is deleted, the helpers fall back to the first remaining image, and `orderedImages` puts the primary first on the product page.

The storefront shows the primary in listings, the cart and the admin table. The product page shows the full gallery with thumbnails. Products with no images at all fall back to `/images/placeholder.svg`.

Up to 6 images per product. Change `max` on `GalleryUpload` to adjust.

### Profile photo

`/account/profile` has an avatar picker; the photo counts toward the profile-completion meter and appears in the header, the sidebar and the admin customers table.

> Profile edits write to both the mock user array and the localStorage session. On a full reload the array resets but the session does not, so a customer keeps seeing their own photo while the admin table shows initials again. That split disappears once a real API owns the data.

### Swapping in a real upload

`processImage` stays as-is — it is the client-side resize you want regardless. Only the storage changes: instead of keeping the data URL, `POST` the canvas output as a Blob and store the returned URL in `ProductImage.src` / `User.avatarUrl`.

---

## Order queue

`/admin/queue` — the work list, deliberately separate from Sales.

Sales is the full history in every state. The queue holds only **created** and **pending** orders: things waiting on the store, not on the customer or the courier. Card layout rather than a table, because each entry is a task to act on, not a row to scan.

### Cards

Each card carries the reference, order date, status, customer with a click-to-call number, the line items, the total, and a waiting-time badge. The border colour escalates with age — under a day, one to three days, then overdue past three. Those thresholds are a starting point, not a policy; a store with next-day dispatch will want them lower.

One-click transitions move an order to pending, processing or cancelled, which is the whole point of a work queue. Advancing an order removes it from the list, since it is no longer waiting.

### Filters

Customer (name, mobile or order reference), product name, order-date range, and order-total range — plus a status narrowing within the queue. Text fields debounce; dates and selects apply at once. Price is entered in major units and converted internally.

### Notification

A count badge on the sidebar entry and a bell in the admin header, with a dropdown listing the newest unacknowledged orders.

**This is polling, not push** — the interval is 20 seconds, and the tab catches up immediately on regaining focus. A mock source has no way to notify us, and neither would a plain REST backend; production should replace the interval with a WebSocket or SSE stream, and the shape `useOrderQueue` returns would not change.

"Seen" is tracked per browser rather than on the order, because *have I looked at this* is a property of the person, not the order — two operators should not clear each other's badge. A real backend would store it per user. Opening the queue acknowledges what is on screen.

The sidebar badge, the header bell and the queue page each call `useOrderQueue`. They share state through a module-level subscription; without it, advancing an order on the page would leave the badge showing a stale count until its own poll came round.

### Checkout now creates orders

Previously checkout showed a confirmation and cleared the cart without recording anything, which made "notify on new orders" untestable — there was no source of new orders. A signed-in customer's checkout now writes a real order with status `created`, so it lands in the queue.

Line items snapshot the product title and the **effective** (discounted) price at order time, so renaming or repricing a product later does not rewrite what the customer bought. Guest checkout still shows the demo confirmation only: an order needs an account to belong to, and minting a customer is the API's job.

> Verified end to end in one browser session: customer adds to cart, checks out, and the admin's badge goes from 4 to 5 with the new order at the bottom of the queue.

### A caveat about mock data

Mock records live in module memory in the browser bundle. Client-side navigation preserves them; a **full page reload re-imports the module and resets everything to seed**. That is fine for a template and it is why the verification above had to stay within one page load — but it will surprise you if you expect an order created in one tab to exist in another.

---

## SMS panel

`/admin/messages`, behind `messages.view` / `messages.send`, with two tabs.

### Sent messages

History of everything sent, searchable and filterable by status. A broadcast writes **one row per recipient**, not one row per send, so the history reflects what was actually delivered.

### Composing

Recipients come from either route, and the two converge on one list keyed by normalised mobile:

- **Choose customers** — searchable, checkbox list of active customers, with select-all on the current filter.
- **Enter numbers** — paste a blob; invalid entries are reported rather than silently dropped.

A number picked as a customer and the same number typed by hand cannot both end up in the send; the customer entry wins, because that is the one whose placeholders can resolve.

### Templates

Managed in the second tab, full CRUD, bodies stored per-locale like every other piece of content. **Save this as a template** in the composer seeds a new template with the current body.

Bodies may contain `{firstName}`, `{lastName}`, `{fullName}` and `{mobile}`, resolved per recipient at send time. An unresolvable token is **left visible rather than blanked**, and the composer warns before sending which recipients cannot fill which fields — typically bare numbers under a template that greets by name.

### Segment counting

This is the part worth getting right, because it is what a message costs.

| Encoding | Single | Concatenated |
| --- | --- | --- |
| GSM-7 | 160 | 153 |
| UCS-2 | 70 | 67 |

A single character outside the GSM 03.38 alphabet forces the **whole** message to UCS-2. In practice that means one Persian letter takes a 160-character message from one segment to three — and so does a typographic em dash in an otherwise-Latin message. The composer shows the live encoding, character count against the active limit, segments, and the total across all recipients.

`src/lib/sms.ts` holds this logic free of React so it can be tested directly; `src/lib/sms.test.ts` covers encoding detection, the extended-GSM characters that cost two slots, the concatenation boundaries, placeholder resolution, and number parsing.

One parsing subtlety worth noting: a space is ambiguous. It separates two numbers in `0912… 0913…` but groups digits within one in `0912 111 2233`. Each comma/newline chunk is therefore tried whole first, and only split on whitespace if it is not a valid number by itself.

---

## Locations (admin)

`/admin/locations` manages the reference geography the address form depends on, as three tabs behind the `geo.view` / `geo.manage` permissions.

| Tab | Foreign key | Notes |
| --- | --- | --- |
| Countries | — | Independent. ISO-2 code and dial code. |
| Provinces | `countryId` → country | Country select is required; the table shows the parent and a city count. |
| Cities | `provinceId` → province | Country narrows the province list but is *not* stored — a city's only foreign key is its province. Optional lat/lon. |

Names are per-locale (`GeoName`), so every record has one field per language.

### Referential integrity

The mock source has no database to enforce foreign keys, so deletes are guarded in the UI:

- Deleting a **country** that still has provinces is refused, naming the counts ("still has 6 provinces and 15 cities").
- Deleting a **province** that still has cities is refused the same way.
- A row whose parent has vanished renders a red **Missing parent** badge rather than a blank cell, so orphans are visible instead of silent.

**Your backend must enforce the same constraints.** This is a UI courtesy, not the guarantee — `src/lib/data/geo.test.ts` asserts the invariants hold in the seed data, including that a country/province/city triple from mismatched parents is rejected.

The tab strip follows the WAI-ARIA tabs pattern: arrow keys move between tabs, Home/End jump to the ends, and only the active tab is in the tab order.

---

## Map location picker

Customers can pin their exact location when adding an address; `UserAddress` gained optional `lat`/`lon`.

### This is the one part of the app that uses the network

Everything else — fonts, styles, assets — is local. Leaflet itself is a bundled dependency, but **map tiles are fetched from a remote server at runtime**. Two environment variables control it:

| Variable | Default |
| --- | --- |
| `NEXT_PUBLIC_MAP_TILE_URL` | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` |
| `NEXT_PUBLIC_MAP_ATTRIBUTION` | OpenStreetMap contributors |

Point them at your own tile server to make the app fully offline again. If you stay on OpenStreetMap, their [tile usage policy](https://operations.osmfoundation.org/policies/tiles/) applies: the attribution must stay visible, and heavy or automated use is not permitted on the public endpoint. The attribution renders twice on purpose — Leaflet's own in-map control, plus a copy below the map that survives the map failing to load.

### Behaviour

- Opens centred on the **selected city**, using the coordinates in the reference data, so the shopper starts where they live rather than in the middle of the country.
- Click to drop a pin, drag to adjust, or **Use my location** via the browser geolocation API.
- Panning is bounded to the region around Iran rather than the whole globe.
- Scroll-wheel zoom is off until the map is clicked, so a wheel over an embedded map still scrolls the page.
- Coordinates round to six decimals (~11 cm), which is far more than an address needs.
- The pin is optional — an address saves fine without one.

### Viewing a customer's location (admin)

The Customers table has a **View location on map** row action that opens a modal with the customer's pinned addresses.

- The action appears **only when the customer has at least one address carrying valid coordinates** — no dead button on rows with nothing to show.
- It needs only `customers.view`, not `customers.write`: a support agent can locate a customer without being able to change them.
- With several pinned addresses the map fits to all of them; clicking an entry in the list below pans to that one and opens its tooltip.

`MapPicker` (editable) and `MapView` (read-only, multi-marker) share their setup through `useLeafletMap`, which owns the dynamic import, the tile layer, bounds and the `invalidateSize` dance. They stay separate components because the behaviour genuinely differs — nothing in the viewer is editable, and it fits to an extent rather than to a single point.

### Implementation notes

Leaflet touches `window` on import, so it is pulled in with a dynamic `import()` inside an effect; a top-level import would break the server render of any page holding the component. The marker is a `divIcon` rather than Leaflet's default image marker, whose PNG is resolved by relative URL and breaks under a bundler.

---

## Catalog filters

The products page carries two tiers of filter.

**Global** — search, category, brand, price range, minimum rating, in-stock. These apply everywhere and live in the filter bar itself.

**Per-category** — each category declares its own facets, and they appear only while that category is selected.

### Filters are data, not code

`Category.filters` is a `FilterSpec[]`, and a `FilterSpec` is plain serialisable data:

```ts
{ key: "connectivity", kind: "multi", label: { en: "Connectivity", fa: "اتصال" },
  options: [{ value: "bluetooth", label: { en: "Bluetooth", fa: "بلوتوث" } }] }
```

`kind` is one of `select | multi | range | boolean`, and `key` addresses `Product.attributes[key]`.

Nothing in a spec references a component or a function, so the whole list moves to the database unchanged — a `filters` JSON column on `categories`, or a joined `filters` table. When categories load from the API, their facets travel with them and the storefront renders whatever arrives. **Adding a facet to a category is a data edit, not a deploy.**

`FilterBar` has exactly one `switch` on `kind`; everything else is generic.

### URL encoding

Every filter is a query parameter, so any filtered view is shareable and survives a reload:

```
/en/products?category=audio&brand=b-aurora&maxPrice=20000&f_form=over-ear&f_connectivity=bluetooth
```

Category facets are namespaced with `f_`. Categories come from the database, so their keys are not known at build time — the prefix is the only thing guaranteeing a facet named `sort` or `q` can never collide with a reserved parameter. Multi-select repeats the parameter (`?f_material=metal&f_material=glass`).

Within a facet, values are ORed; facets are ANDed with each other.

### Two behaviours worth knowing

- **Switching category clears the previous category's facets.** They address attributes the new category does not declare, so leaving them in the URL would silently return nothing.
- **Price filters on what the shopper pays**, not the list price — bounds run against `effectivePrice`, so a discounted product appears under the price it actually sells at. Slider bounds are derived from the catalog rather than hardcoded, so they stay correct as products are added or repriced.

### The price slider

Two native `<input type="range">` elements stacked on one track, rather than a custom pointer widget. Each thumb is then a real slider — keyboard operable and announced by screen readers for free. The inputs are transparent with `pointer-events: none`; only their thumbs take pointer events, which is what makes both handles independently draggable. Dragging is local state, committed through a 350 ms debounce so the URL updates once the shopper settles.

### Testing

`src/lib/attributes.test.ts` covers the matching rules — OR within a facet, AND across facets, range bounds, and the case that bites: an unchecked boolean must not exclude anything.

`src/lib/data/catalog.test.ts` guards the contract between the two halves. A facet a category declares is useless if no product carries it, and an attribute no category declares can never be filtered — so it asserts every product's attribute keys match its category's declared keys exactly, that facet values are valid options, and that brand references resolve. This caught a real bug: a desktop speaker sitting in "Desk & Office" while carrying audio facets, so none of its attributes were reachable.

Node's test runner cannot resolve the `@/` alias on its own, so `scripts/alias-loader.mjs` provides a resolve hook, registered via `--import`. Without it, tests would be limited to leaf modules with no internal imports.

### Not yet wired

The admin product form does not edit brand or attributes — products created there start with `brandId: null` and `attributes: {}`, so they will not match any category facet until those are set. The natural next step is to render the attribute inputs from the selected category's own `FilterSpec[]`, which is the same data the storefront already reads.

---

## Look and motion

The visual layer is CSS-first: tokens and keyframes in `src/app/globals.css`, two small components in `src/components/visual/`, and no animation library.

### Tokens

`@theme` holds the brand ramp, two easing curves (`--ease-out-soft`, `--ease-spring`) and two shadows (`--shadow-lift`, `--shadow-glow`). `--slide-from` carries the horizontal entrance offset and **flips under `[dir="rtl"]`**, so motion always travels with the reading direction.

### Utilities

| Class | Use |
| --- | --- |
| `animate-fade-up` / `-fade-in` / `-scale-in` / `-slide-in` | Entrances. All use `both` fill, so staggered children never flash at full opacity first |
| `animate-float` / `animate-drift` | Slow ambient motion for decoration |
| `skeleton` | Travelling sheen, replaces the flat opacity pulse on every loading state |
| `card-lift`, `btn-glow`, `link-underline` | Hover affordances |
| `text-gradient`, `glass` | Brand text fill, frosted panel |

Every animation is opacity/transform only, so nothing forces layout while it plays.

### Components

`<Aurora />` — three blurred colour blobs on long offset drift cycles plus a masked grid. Pure CSS, `aria-hidden`, nothing fetched. Positioned with logical properties, so it mirrors in RTL.

`<Reveal motion delay>` — plays an entrance when the element scrolls into view.

### Reduced motion

`globals.css` ends with a `prefers-reduced-motion: reduce` block that collapses every animation and transition to ~0s, disables smooth scrolling, and removes the hover lifts. Nothing here conveys state, so switching it all off costs no information.

### Why `Reveal` has four ways to become visible

Scroll-reveal that starts at `opacity: 0` has an ugly failure mode: if the trigger never fires, the content is invisible forever. That is strictly worse than appearing without an animation, so `Reveal` has four independent paths to visible:

1. already in the viewport at mount — show immediately;
2. the IntersectionObserver fires — the normal path;
3. a passive scroll/resize check — backstop if the observer stays silent;
4. a 2.5 s failsafe timer — if nothing above fired, the page is not rendering normally (hidden tab, throttled renderer, bfcache restore); reveal unconditionally and drop the effect.

With JavaScript off entirely, a `<noscript>` rule in the locale layout neutralises the `reveal-pending` class, so the page still renders in full.

> This was found the hard way: the first version used the observer alone, and content stayed permanently at `opacity: 0` in a tab that was not painting.

---

## Price adjustments

Products carry a list of rules — **offsets, discounts and tax** — each either a **percent of price** or a **fixed amount**, and each either bounded by a date range or permanent until an admin disables or deletes it. Admins manage them inline in the product form, with a live breakdown underneath.

### Order of operations

This is the part that has to be right, and it is enforced in one place, [`src/lib/pricing.ts`](src/lib/pricing.ts):

```
  base price
+ offsets       signed — a surcharge, or a correction down
- discounts     capped, so the running total never goes negative
+ tax           computed on the POST-discount amount
= total
```

**Tax is charged on what the customer actually pays, not on the list price.** A €199 product with a 15% sale and 9% VAT costs €184.37 — the tax is €15.22 on the discounted €169.15, not €17.91 on the list price.

**Percents stack additively within a stage, not compounding.** Two 10% discounts take 20% off, not 19%. Compounding surprises people who stack a sale on a coupon.

**Rounding** happens per adjustment in integer minor units, so the breakdown lines always sum to the total exactly. Discounts are capped at the running subtotal, so no combination can produce a negative price.

**Declaration order does not matter** — rules are sorted into offset → discount → tax before pricing, so the array order in the form has no effect on the result.

### Date windows

`startsAt` and `endsAt` are `YYYY-MM-DD` strings, **inclusive on both ends**. A null bound is unbounded, so a rule with neither date runs permanently. Dates are compared as strings against the local calendar date, which sorts correctly and sidesteps timezone arithmetic — an adjustment ending "today" stays live through the merchant's working day rather than expiring at UTC midnight.

`active` is a separate manual switch: a disabled rule is kept but stops applying regardless of its dates.

### What reads the effective price

`effectivePrice(product)` is the single source of truth, used by the storefront `Price` component, the catalog's price sorting, the cart, checkout, and the admin table. `strikeThroughPrice(product)` returns the figure to show struck through — it prefers a live reduction from adjustments over the static `compareAtPrice`, so a current sale is never hidden behind a stale marketing number.

The storefront deliberately shows **one number**, not a tax line — the breakdown stays admin-facing.

Order lines keep a `unitPrice` snapshot taken at purchase time, so changing a rule never rewrites the price on a past order.

### Tests

The pricing engine is pure and covered by [`src/lib/pricing.test.ts`](src/lib/pricing.test.ts) — 20 cases over the order of operations, additive stacking, zero-clamping, rounding, and the date-window edges. It uses Node's built-in test runner with no dependencies:

```bash
npm test
```

> **Known gap:** the date fields use the native `<input type="date">`, which renders a Gregorian picker in every locale. Persian admins will want a Jalali picker; that is a separate component and is not built here.

---

## Enable / disable

Products and customers both carry an `active` flag that admins toggle from the row actions (the power icon), with a status column and a status filter in each table.

- **Inactive product** — hidden from the storefront catalog, search, featured list and product page. `getProductById` deliberately still resolves it, so a cart line for a just-deactivated product can still be priced and shown rather than vanishing.
- **Disabled customer** — keeps all their data but is refused at sign-in with a distinct message, not the generic "wrong credentials".

`active` is not self-editable: `mockUpdateProfile` strips `role`, `subRole`, `id` and `active` from any patch coming out of the profile form.

---

## Current status

**Working:** everything above — i18n and RTL, local fonts, auth with localStorage persistence, the permission model, the axios layer, the storefront, login/register, the admin dashboard, all seven admin CRUD sections, all four customer account pages, product image galleries with a selectable default, profile photo upload, enable/disable for products and customers, price adjustments with a tested pricing engine, and the visual layer described above.

**Next phase:** swap the mock repositories for the axios client. `src/lib/api/endpoints.ts` already names every route, and the `Repository<T>` interface is the contract the API has to satisfy — `list` maps onto `GET /resource?q=&sort=&page=`, and `create` / `update` / `remove` onto POST / PATCH / DELETE.
