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

Admins land on `/admin`, customers on `/account/profile`.

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

```
src/lib/auth/types.ts        Role, SubRole, Permission, User, Session
src/lib/auth/permissions.ts  ROLE_PERMISSIONS — the single source of truth
src/lib/auth/auth-context.tsx  useAuth(): user, ready, signIn/signUp/signOut, can()
src/lib/auth/Guard.tsx       <Guard permission="…"> and <Can permission="…">
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

## Enable / disable

Products and customers both carry an `active` flag that admins toggle from the row actions (the power icon), with a status column and a status filter in each table.

- **Inactive product** — hidden from the storefront catalog, search, featured list and product page. `getProductById` deliberately still resolves it, so a cart line for a just-deactivated product can still be priced and shown rather than vanishing.
- **Disabled customer** — keeps all their data but is refused at sign-in with a distinct message, not the generic "wrong credentials".

`active` is not self-editable: `mockUpdateProfile` strips `role`, `subRole`, `id` and `active` from any patch coming out of the profile form.

---

## Current status

**Working:** everything above — i18n and RTL, local fonts, auth with localStorage persistence, the permission model, the axios layer, the storefront, login/register, the admin dashboard, all seven admin CRUD sections, all four customer account pages, product image galleries with a selectable default, profile photo upload, and enable/disable for products and customers.

**Next phase:** swap the mock repositories for the axios client. `src/lib/api/endpoints.ts` already names every route, and the `Repository<T>` interface is the contract the API has to satisfy — `list` maps onto `GET /resource?q=&sort=&page=`, and `create` / `update` / `remove` onto POST / PATCH / DELETE.
