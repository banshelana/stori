# Stori API — Backend Contract & Build Specification

**Target:** ASP.NET Core Web API on **.NET 9**, Dapper + SQL Server stored procedures, JWT auth.
**Consumer:** the Stori Next.js storefront + admin panel (this repository).
**Status of the frontend:** feature-complete against an in-memory mock layer. Every mock
repository was written as the API's specification — `src/lib/data/repository.ts` says so in
its header. This document turns that into a buildable backend spec.

---

## 0. How to use this document

Open a **new** Claude Code session **in the API project folder** and give it this prompt:

> Read `API-CONTRACT.md` in this folder — it is the complete specification for this API,
> derived from an existing Next.js storefront that will consume it. Build the project it
> describes: .NET 9 Web API, Dapper over SQL Server stored procedures, JWT auth with
> permission policies, request/response logging middleware, and soft-delete + enable/disable
> on every entity. Start with Milestone 1 (§12) and stop for review before Milestone 2.

Copy this file into the API project root first, so the new session can read it without
reaching across drives.

### Decisions already made (do not re-litigate)

| Decision | Choice |
|---|---|
| Primary keys | `INT IDENTITY` surrogate PK + a separate unique business `Code`/`Slug` column |
| Bilingual text | Two columns per field — `TitleEn` / `TitleFa` |
| Solution layout | Single Web API project, organised by folder |
| Schema delivery | Numbered `.sql` scripts in `/db`, run in order |
| ORM | Dapper only. **No EF Core.** |
| Data access | **Every** query and write goes through a stored procedure |
| Auth | JWT bearer, permission-based policies |

---

## 1. Conventions that apply everywhere

### 1.1 The list contract (the single most important thing to get right)

Every admin list screen is driven by one shared React hook, `useResourceList`, which calls
one shared repository method. That method's signature **is** the API's list contract. Get
this wrong and twelve screens break at once.

**Request** — `GET /api/v1/{resource}` with all parameters optional:

| Param | Type | Meaning |
|---|---|---|
| `q` | string | Free-text search. Each resource defines its own searchable columns (§5). |
| `filters` | see below | Exact-match filters, e.g. `status=pending` |
| `rangeField` | string | Column the date window applies to |
| `rangeFrom` | `YYYY-MM-DD` | Inclusive lower bound |
| `rangeTo` | `YYYY-MM-DD` | Inclusive upper bound |
| `sortKey` | string | Sortable column key (per-resource whitelist, §5) |
| `sortDir` | `asc` \| `desc` | Default `asc` |
| `page` | int | 1-based. Default 1. |
| `pageSize` | int | Default 10. **Cap at 500** — the CSV/PDF exports request `pageSize = total`. |

Filters arrive as flat query-string keys (`?status=pending&method=card`), not a nested object.

**Response** — always exactly this envelope:

```json
{ "rows": [ /* T[] */ ], "total": 240, "page": 1, "pageCount": 24 }
```

Rules the mock enforces and the API must match:
- An empty/absent filter value means **"all"**, not "match the empty string".
- `page` is clamped: if the caller asks for page 9 of a 3-page result, return page 3.
  (Deleting the last row of the final page would otherwise strand the client on an empty page.)
- `pageCount` is `max(1, ceil(total / pageSize))` — never 0, even for an empty result.
- Both ends of a date range are **inclusive**; one end alone means "since" / "until".

### 1.2 Dates — the part that will bite you

The frontend compares dates as **lexicographic `YYYY-MM-DD` strings**. It never parses them
into `Date` objects for filtering, precisely so timezones cannot corrupt a comparison.

- **Database:** store audit timestamps as `DATETIME2(3)` in **UTC** (`SYSUTCDATETIME()`).
- **DTOs:** business dates (`Order.createdAt`, `Payment.paidAt`, `Review.createdAt`,
  `Message.sentAt`, `Coupon.startsAt/endsAt`, `PriceAdjustment.startsAt/endsAt`,
  `User.createdAt`) serialise as **date-only `"2026-08-11"` strings**, not ISO datetimes.
- Audit columns (`dateCreated`, `dateUpdated`) may serialise as full ISO-8601 UTC — the
  frontend does not filter on them.
- Configure `System.Text.Json` with a converter that writes `DateOnly`/`DateTime` in
  `yyyy-MM-dd` for the business fields. Do **not** let the default serializer emit
  `2026-08-11T00:00:00Z` into those fields; the client's `<` comparison would still work but
  the date pickers and Jalali conversion would not.

The frontend renders Persian dates on the Solar Hijri calendar client-side. **The API always
speaks Gregorian.** Never send a Jalali date.

### 1.3 Money

All monetary values are **integers in minor units** (cents / ریال), never decimals.
`19900` means €199.00. Use `BIGINT` in SQL and `long` in C#. Currency is a separate
ISO-4217 string column (`"EUR"`). Never use `float`/`double`; `decimal` only if you convert
at the boundary, which is more risk than it's worth here.

### 1.4 Localized text

The frontend type is `LocalizedText { en: string; fa: string }`. Every such field becomes two
NOT NULL columns, `XxxEn` and `XxxFa`, and one DTO object:

```csharp
public sealed record LocalizedText(string En, string Fa);
```

Serialised as `{ "en": "...", "fa": "..." }`. Both are required — the frontend falls back to
`en` when `fa` is blank, but a blank `fa` renders as an empty product card in the Farsi UI.

### 1.5 Audit / lifecycle columns — on every business table

```sql
Id              INT            IDENTITY(1,1) NOT NULL,   -- clustered PK
Code            NVARCHAR(40)   NULL,                     -- business key where one exists
DateCreated     DATETIME2(3)   NOT NULL CONSTRAINT DF_x_DateCreated DEFAULT SYSUTCDATETIME(),
DateUpdated     DATETIME2(3)   NULL,
CreatedByUserId INT            NULL,
UpdatedByUserId INT            NULL,
IsDeleted       BIT            NOT NULL CONSTRAINT DF_x_IsDeleted DEFAULT 0,
DeletedDate     DATETIME2(3)   NULL,
DeletedByUserId INT            NULL,
IsEnabled       BIT            NOT NULL CONSTRAINT DF_x_IsEnabled DEFAULT 1,
RowVersion      ROWVERSION     NOT NULL                  -- optimistic concurrency
```

**`IsDeleted` and `IsEnabled` are different things and must stay independent:**

- `IsDeleted = 1` — gone. Excluded from *every* read, including admin lists. Only a restore
  endpoint or a direct query sees it. Deletes are always soft; no `DELETE` statement should
  appear in any procedure except the request-log purge job.
- `IsEnabled = 0` — present but switched off. **Still visible in the admin panel** with a
  "Disabled" badge, hidden from the storefront. This is the frontend's existing `active`
  flag on Products and Customers, and it already has UI. Applies to Customers, Products,
  Orders, Payments, Messages, Coupons, Categories, Brands, and the geo tables.

Every read procedure filters `IsDeleted = 0`. Public/storefront procedures additionally
filter `IsEnabled = 1`. Admin procedures do not — an operator must be able to see and
re-enable what they disabled.

Index every table with `CREATE INDEX IX_{Table}_Live ON {Table}(IsDeleted, IsEnabled) INCLUDE (...)`
or add `IsDeleted` as the leading column of the filtered indexes you need.

### 1.6 Naming

| Thing | Convention | Example |
|---|---|---|
| Table | PascalCase, plural | `ProductAdjustments` |
| Column | PascalCase | `PrimaryImageId` |
| Stored procedure | `usp_{Entity}_{Action}` | `usp_Product_List`, `usp_Order_SetStatus` |
| Route | kebab-case, plural, `/api/v1/` prefix | `/api/v1/order-queue` |
| JSON | camelCase (configure `JsonNamingPolicy.CamelCase`) | `primaryImageId` |

### 1.7 Error shape

Return RFC 7807 `ProblemDetails` with a stable `errorCode`:

```json
{
  "type": "https://stori.api/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "errorCode": "VALIDATION_FAILED",
  "traceId": "00-abc...",
  "errors": { "mobile": ["Mobile number is not valid"] }
}
```

The frontend's axios interceptor normalises errors and treats **401** as "session expired →
clear localStorage → redirect to login". Use 401 only for authentication failures and
**403** for permission failures, or the client will log people out for the wrong reason.

---

## 2. Domain model — table by table

Money = `BIGINT` minor units. Every table also carries the §1.5 audit block, omitted below
for brevity. `→` denotes a foreign key.

### 2.1 Identity

**Users** — one table for admins and customers; `Role` separates them.
```
Id, Code ('u-001' legacy id, unique)
FirstName        NVARCHAR(100)  NOT NULL
LastName         NVARCHAR(100)  NOT NULL
Mobile           NVARCHAR(20)   NOT NULL  UNIQUE   -- login identifier
PasswordHash     NVARCHAR(255)  NOT NULL           -- see §4.1
PasswordSalt     NVARCHAR(255)  NULL
Role             NVARCHAR(20)   NOT NULL           -- 'admin' | 'customer'
SubRole          NVARCHAR(30)   NOT NULL           -- see §4.2
Email            NVARCHAR(255)  NULL
Phone            NVARCHAR(30)   NULL
Age              INT            NULL
Sex              NVARCHAR(10)   NULL               -- 'male'|'female'|'other'
AvatarColor      NVARCHAR(9)    NULL               -- '#4f46e5'
AvatarPath       NVARCHAR(400)  NULL               -- see §7 (frontend currently holds a data URL)
LastLoginDate    DATETIME2(3)   NULL
FailedLoginCount INT            NOT NULL DEFAULT 0
LockoutUntil     DATETIME2(3)   NULL
```
> Registration is deliberately minimal — **first name, last name, mobile, password**. Everything
> else is filled in later from the profile page. Do not make `Email` required.
> `IsEnabled = 0` is the frontend's existing "disabled customer" state: the account keeps its
> data but cannot sign in.

**UserAddresses** → Users, Countries, Provinces, Cities
```
UserId → Users.Id
CountryId → Countries.Id, ProvinceId → Provinces.Id, CityId → Cities.Id
Street NVARCHAR(200) NOT NULL, Alley NVARCHAR(200) NULL, BuildingNo NVARCHAR(50) NULL,
Floor NVARCHAR(50) NULL, Unit NVARCHAR(50) NULL
PostalCode NVARCHAR(20) NOT NULL
Lat DECIMAL(9,6) NULL, Lon DECIMAL(9,6) NULL     -- optional map pin
IsDefault BIT NOT NULL DEFAULT 0
```
> Country/Province/City come from the database (dropdowns); the rest is free text.
> Enforce **one default per user** — a filtered unique index:
> `CREATE UNIQUE INDEX UX_UserAddresses_OneDefault ON UserAddresses(UserId) WHERE IsDefault = 1 AND IsDeleted = 0;`

**RefreshTokens** → Users
```
UserId, Token NVARCHAR(200) UNIQUE, ExpiresAt DATETIME2(3), RevokedAt DATETIME2(3) NULL,
ReplacedByToken NVARCHAR(200) NULL, CreatedByIp NVARCHAR(45)
```

### 2.2 Catalog

**Brands** — `Code`, `Name NVARCHAR(100)`, `Slug NVARCHAR(120) UNIQUE`
> Brand names are proper nouns and are **not** localized — deliberately single-column.

**Categories** — `Code`, `NameEn`, `NameFa`, `Slug UNIQUE`, `SortOrder INT`

**CategoryFilters** → Categories — the dynamic facet definitions
```
CategoryId, FilterKey NVARCHAR(60), Kind NVARCHAR(20),  -- 'select'|'multi'|'range'|'boolean'
LabelEn, LabelFa, MinValue INT NULL, MaxValue INT NULL, StepValue INT NULL,
Unit NVARCHAR(20) NULL, SortOrder INT
UNIQUE (CategoryId, FilterKey) WHERE IsDeleted = 0
```

**CategoryFilterOptions** → CategoryFilters — `OptionValue NVARCHAR(100)`, `LabelEn`, `LabelFa`, `SortOrder`
> Only for `select` / `multi` kinds.

**Products**
```
Code, Slug NVARCHAR(160) UNIQUE
TitleEn, TitleFa            NVARCHAR(300) NOT NULL
DescriptionEn, DescriptionFa NVARCHAR(MAX) NOT NULL
Price          BIGINT NOT NULL          -- minor units
CompareAtPrice BIGINT NULL              -- strike-through price
Currency       CHAR(3) NOT NULL DEFAULT 'EUR'
BrandId → Brands.Id NULL
CategoryId → Categories.Id NOT NULL
PrimaryImageId → ProductImages.Id NULL  -- add FK after ProductImages exists
Stock          INT NOT NULL DEFAULT 0
IsFeatured     BIT NOT NULL DEFAULT 0
```
> **There is no `Rating` column, and must not be one.** A product's stars are *derived* from
> its approved reviews. A stored average drifts from what customers actually said, and
> moderating a review would then change nothing on the page. Compute it in the read
> procedure: `AVG(CAST(r.Rating AS DECIMAL(3,2)))` over `Reviews WHERE IsApproved = 1`.
> Return `null` (not `0`) when there are no reviews — the UI shows "No reviews yet" for
> `null` and zero stars for `0`, and those are different statements.

**ProductImages** → Products — `Code`, `ProductId`, `FilePath NVARCHAR(400)`, `SortOrder INT`
> `PrimaryImageId` is held **by id, not index**, so deleting or reordering the gallery cannot
> silently promote a different image. Enforce that the primary belongs to the product.

**ProductTags** → Products — `ProductId`, `Tag NVARCHAR(60)` (or a `Tags` + `ProductTags` pair
if you want a controlled vocabulary; the frontend only ever reads a `string[]`).

**ProductAttributes** → Products — the category facet values
```
ProductId, AttributeKey NVARCHAR(60), AttributeValue NVARCHAR(200),
ValueType NVARCHAR(10) NOT NULL   -- 'string' | 'number' | 'bool'
```
> One row per value. A multi-valued facet (`connectivity: ["bluetooth","usb-c"]`) is several
> rows with the same `AttributeKey`. Serialise back into `Record<string, value | value[]>`:
> a key with one row becomes a scalar, a key with several becomes an array.
> `ValueType` exists because the client compares `40` and `true` as typed primitives.

**ProductAdjustments** → Products — per-product offset / discount / tax
```
ProductId, Kind NVARCHAR(10) NOT NULL,   -- 'offset' | 'discount' | 'tax'
Mode NVARCHAR(10) NOT NULL,              -- 'percent' | 'amount'
Value BIGINT NOT NULL,                   -- percent: 15 = 15%. amount: minor units.
Label NVARCHAR(120) NULL,                -- 'VAT', 'Autumn sale'
StartsAt DATE NULL, EndsAt DATE NULL,    -- NULL = unbounded that side
IsActive BIT NOT NULL DEFAULT 1
```
> **Pricing order is fixed and must be reproduced exactly** (`src/lib/pricing.ts`):
> 1. `offsets` — percent of the **base** price. May be negative.
> 2. `discounts` — percent of the **offset-adjusted** subtotal, each capped at what remains,
>    so stacked discounts cannot drive the price below zero or become a refund.
> 3. `tax` — percent of the **post-discount** amount.
>
> All intermediate results are `Math.Round` to whole minor units at each step, and every
> stage is floored at 0. An adjustment applies on date *d* when `IsActive = 1`,
> `(StartsAt IS NULL OR StartsAt <= d)` and `(EndsAt IS NULL OR EndsAt >= d)`.

### 2.3 Commerce

**Orders**
```
Code / Reference NVARCHAR(30) UNIQUE   -- 'ORD-2026006', shown to the customer
UserId → Users.Id
Status NVARCHAR(20) NOT NULL           -- 'created'|'pending'|'processing'|'done'|'canceled'
Total BIGINT NOT NULL, Currency CHAR(3) NOT NULL
ShippingAddressId → UserAddresses.Id NULL   -- see note
CouponId → Coupons.Id NULL, CouponCode NVARCHAR(40) NULL, DiscountTotal BIGINT NOT NULL DEFAULT 0
ShippingTotal BIGINT NOT NULL DEFAULT 0, TaxTotal BIGINT NOT NULL DEFAULT 0
```
> **Add `ShippingAddressId` — this is a gap in the current frontend, not a feature to copy.**
> The mock `Order` carries no address at all, so the admin order-detail page has to show the
> customer's *current default address* with an explicit warning that it is not necessarily
> where the order went. Fix it in the database: snapshot the address on the order.
> Best practice is to copy the address **fields** onto the order (not just the FK), so a
> customer editing their address later cannot rewrite delivery history. Either add
> `OrderAddresses` (a 1:1 snapshot table) or denormalised columns on `Orders`.

**OrderLines** → Orders, Products
```
OrderId, ProductId → Products.Id
TitleEn, TitleFa NVARCHAR(300) NOT NULL   -- snapshot, see note
Quantity INT NOT NULL, UnitPrice BIGINT NOT NULL
```
> The title is **snapshotted at order time in both languages** so an order's history does not
> rewrite itself when the catalog entry is renamed. Keep `ProductId` as a soft reference:
> a deleted product must leave the line intact and readable.

**Payments** → Orders, Users
```
Code / Reference NVARCHAR(30) UNIQUE   -- 'TRX-880004'
OrderId, UserId, Amount BIGINT, Currency CHAR(3)
Method NVARCHAR(20)  -- 'card'|'wallet'|'cod'|'transfer'
Status NVARCHAR(20)  -- 'paid'|'pending'|'failed'|'refunded'
PaidAt DATE NOT NULL
GatewayReference NVARCHAR(120) NULL
```
> Only `Status = 'paid'` counts toward an order's settled total. A pending or failed attempt
> has paid for nothing — the order-detail page computes a shortfall from this.

**Coupons** — cart-level discount codes
```
Code NVARCHAR(40) NOT NULL UNIQUE      -- stored UPPER, compared case-insensitively
Kind NVARCHAR(10) NOT NULL             -- 'percent' | 'amount'
Value BIGINT NOT NULL
MinSubtotal BIGINT NOT NULL DEFAULT 0  -- minimum cart subtotal before it applies
MaxDiscount BIGINT NOT NULL DEFAULT 0  -- caps a percentage discount; 0 = uncapped
StartsAt DATE NULL, EndsAt DATE NULL   -- NULL = permanent
UsageLimit INT NOT NULL DEFAULT 0      -- 0 = unlimited
UsedCount  INT NOT NULL DEFAULT 0
```
> Rejection reasons the client already renders — return these as `errorCode`:
> `notFound`, `inactive`, `notStarted`, `expired`, `usedUp`, `belowMinimum`
> (`belowMinimum` also returns a `shortfall` in minor units).
> `UsedCount` must be incremented **inside the order-creation transaction**, guarded against
> exceeding `UsageLimit`, or a race lets a limited coupon over-redeem.
> The admin coupon list filters by **date-window overlap**, not containment: a permanent
> coupon (`StartsAt`/`EndsAt` NULL) is valid during every window anyone can ask about.

**Reviews** → Products, Users
```
ProductId, UserId, Rating TINYINT NOT NULL,  -- 1..5, CHECK constraint
Body NVARCHAR(MAX) NOT NULL
IsApproved BIT NOT NULL DEFAULT 0
ApprovedByUserId INT NULL, ApprovedDate DATETIME2(3) NULL
UNIQUE (ProductId, UserId) WHERE IsDeleted = 0    -- one review per product per customer
```
> Eligibility rules the API must enforce on POST (the client checks them too, but the client
> is not the authority): the user must be signed in, must have **an order containing that
> product with status `done`** (not merely placed — received), and must not already have
> reviewed it. Return `errorCode` of `NOT_SIGNED_IN`, `NOT_PURCHASED`, `ALREADY_REVIEWED`.
> New reviews start `IsApproved = 0` and are invisible on the storefront until moderated.

**Favorites** → Users, Products — `UserId`, `ProductId`, `UNIQUE (UserId, ProductId)`
> Currently `localStorage` on the client. Moving it server-side is the point of having an API.

**Carts / CartLines** → Users, Products — *recommended addition*
```
Carts:     UserId → Users.Id NULL, AnonymousKey NVARCHAR(64) NULL, Status NVARCHAR(20)
CartLines: CartId, ProductId, Quantity INT, UnitPriceSnapshot BIGINT
```
> Also `localStorage` today. A server cart survives device changes and lets you see abandoned
> carts. Build it in Milestone 4 — it is the one place where the API should lead the frontend.

**StockAlerts** → Products, Users — back-in-stock waiting list
```
ProductId, Mobile NVARCHAR(20) NOT NULL, UserId → Users.Id NULL,
NotifiedDate DATETIME2(3) NULL     -- NULL until sent
```
> When a product's stock crosses from 0 to positive, every pending alert for it becomes a
> queued SMS and is stamped `NotifiedDate`, so a second restock does not message the same
> person twice. This must fire from **every** path that raises stock: the product edit
> endpoint, the bulk CSV import, and any stock adjustment endpoint.

### 2.4 Support & messaging

**Contacts** — support tickets (the contact form)
```
Code, Name NVARCHAR(150), Email NVARCHAR(255), Mobile NVARCHAR(20),
Subject NVARCHAR(300), Body NVARCHAR(MAX)
Status NVARCHAR(20) NOT NULL,        -- 'open' | 'pending' | 'resolved'
UserId → Users.Id NULL,              -- set when the sender was signed in
AssignedToUserId → Users.Id NULL
LastReplyDate DATETIME2(3) NULL      -- bumped on every reply, so the queue can sort by staleness
```

**TicketReplies** → Contacts
```
ContactId, Author NVARCHAR(10) NOT NULL,   -- 'customer' | 'staff'
AuthorName NVARCHAR(150) NOT NULL, Body NVARCHAR(MAX) NOT NULL,
NotifiedVia NVARCHAR(10) NULL              -- 'sms' | 'email' | NULL
```
> Status transitions on reply, and the rule is not symmetric: **a staff reply sets the ticket
> to `pending`** (waiting on the customer); **a customer reply on a `resolved` ticket reopens
> it to `open`**. Implement this in `usp_TicketReply_Create`, not in the controller.

**Messages** — the SMS/email outbox
```
Channel NVARCHAR(10) NOT NULL,     -- 'sms' | 'email'
Recipient NVARCHAR(255) NOT NULL,  -- mobile for SMS, address for email
Subject NVARCHAR(300) NULL,        -- email only; SMS has no subject
Body NVARCHAR(MAX) NOT NULL,
Status NVARCHAR(20) NOT NULL,      -- 'sent' | 'queued' | 'failed'
SentAt DATE NOT NULL,
ProviderMessageId NVARCHAR(120) NULL, ProviderError NVARCHAR(500) NULL,
SegmentCount INT NULL, Encoding NVARCHAR(10) NULL   -- 'GSM7' | 'UCS2'
```
> **SMS segmentation** (`src/lib/sms.ts`) — reproduce server-side for cost reporting:
> GSM-7 alphabet is 160 chars single / 153 per segment when concatenated; **one non-GSM-7
> character (any Persian letter) forces UCS-2**, which is 70 single / 67 concatenated.
> A `CHECK` constraint enforcing "Subject is non-null iff Channel = 'email'" is worth having.

**MessageTemplates** — `Channel`, `NameEn/NameFa`, `SubjectEn/SubjectFa` (nullable, email only),
`BodyEn/BodyFa`
> Templates carry `{placeholder}` tokens the admin substitutes when composing.

### 2.5 Geography

**Countries** — `Code`, `Iso2 CHAR(2) UNIQUE`, `DialCode NVARCHAR(6)`, `NameEn`, `NameFa`
**Provinces** → Countries — `Code`, `CountryId`, `NameEn`, `NameFa`
**Cities** → Provinces — `Code`, `ProvinceId`, `NameEn`, `NameFa`, `Lat DECIMAL(9,6) NULL`, `Lon DECIMAL(9,6) NULL`

> Strict hierarchy, foreign keys enforced: a province belongs to a country, a city to a
> province. The admin UI presents them as three tabs and the customer address form as three
> dependent dropdowns — **the province list must be filterable by `countryId` and the city
> list by `provinceId`**, or the dropdowns cannot cascade.
> City lat/lon centres the map picker on a chosen city.
> Deleting a country that has provinces must fail (`409`) rather than orphan them.

### 2.6 Platform

**StoreSettings** — a **single row** (`Id = 1`), not key/value. The client loads it as one
typed object and merges it key-by-key over defaults.
```
StoreNameEn, StoreNameFa NVARCHAR(150)
SupportEmail NVARCHAR(255), SupportPhone NVARCHAR(30)
ShippingFlatRate BIGINT NOT NULL DEFAULT 0
FreeShippingThreshold BIGINT NULL          -- NULL disables free shipping
TaxPercent DECIMAL(5,2) NOT NULL DEFAULT 0
LowStockThreshold INT NOT NULL DEFAULT 5
EnforceStock BIT NOT NULL DEFAULT 1        -- block checkout when a line exceeds stock
OverdueAfterDays INT NOT NULL DEFAULT 3    -- order-queue urgency line
SmsSenderName NVARCHAR(50)
```
> These were magic numbers scattered through the components. Collecting them lets an operator
> change policy without a deploy — so they must be *readable by the storefront*, not
> admin-only. `GET /api/v1/settings` is public; `PUT` requires `settings.manage`.

**RequestLogs** — the logging middleware sink (§6)
```
Id BIGINT IDENTITY, TraceId NVARCHAR(64), Method NVARCHAR(10), Path NVARCHAR(500),
QueryString NVARCHAR(2000) NULL, RequestBody NVARCHAR(MAX) NULL,
ResponseBody NVARCHAR(MAX) NULL, StatusCode INT, DurationMs INT,
UserId INT NULL, IpAddress NVARCHAR(45), UserAgent NVARCHAR(500) NULL,
ExceptionMessage NVARCHAR(MAX) NULL, DateCreated DATETIME2(3) NOT NULL DEFAULT SYSUTCDATETIME()
```
> This table is the **one exception** to soft delete: it needs a hard-delete retention job.

---

## 3. Stored procedures

### 3.1 Conventions

- One procedure per operation. Name `usp_{Entity}_{Action}`.
- `SET NOCOUNT ON;` first line of every procedure.
- Every parameter nullable with a `NULL` default so optional filters can be omitted.
- Writes that touch more than one table run in an explicit transaction with
  `SET XACT_ABORT ON;` and a `TRY/CATCH` that rolls back and rethrows.
- Return the affected row(s) with a trailing `SELECT` so Dapper can map the result back —
  the client needs the created/updated entity, not just an id.
- **Never** concatenate a sort column into dynamic SQL from user input. Whitelist with
  `CASE @SortKey WHEN 'price' THEN p.Price END` in the `ORDER BY`, or use `sp_executesql`
  with the sort key validated against a fixed list first.

### 3.2 The list pattern — worked example

Every `_List` procedure follows this shape. Getting the total in the same round trip via
`COUNT(*) OVER()` avoids a second query and a second scan.

```sql
CREATE OR ALTER PROCEDURE dbo.usp_Order_List
    @Q            NVARCHAR(200) = NULL,
    @Status       NVARCHAR(20)  = NULL,
    @UserId       INT           = NULL,
    @RangeFrom    DATE          = NULL,
    @RangeTo      DATE          = NULL,
    @SortKey      NVARCHAR(30)  = 'createdAt',
    @SortDir      NVARCHAR(4)   = 'desc',
    @Page         INT           = 1,
    @PageSize     INT           = 10,
    @IncludeDisabled BIT        = 1        -- admin lists pass 1, storefront passes 0
AS
BEGIN
    SET NOCOUNT ON;

    IF @PageSize IS NULL OR @PageSize < 1  SET @PageSize = 10;
    IF @PageSize > 500 SET @PageSize = 500;
    IF @Page IS NULL OR @Page < 1 SET @Page = 1;

    ;WITH Filtered AS (
        SELECT o.*, u.FirstName, u.LastName
        FROM dbo.Orders o
        JOIN dbo.Users u ON u.Id = o.UserId
        WHERE o.IsDeleted = 0
          AND (@IncludeDisabled = 1 OR o.IsEnabled = 1)
          AND (@Status    IS NULL OR o.Status = @Status)
          AND (@UserId    IS NULL OR o.UserId = @UserId)
          AND (@RangeFrom IS NULL OR CAST(o.DateCreated AS DATE) >= @RangeFrom)
          AND (@RangeTo   IS NULL OR CAST(o.DateCreated AS DATE) <= @RangeTo)
          AND (@Q IS NULL OR @Q = '' OR
               o.Reference LIKE '%' + @Q + '%' OR
               u.FirstName LIKE '%' + @Q + '%' OR
               u.LastName  LIKE '%' + @Q + '%')
    )
    SELECT *, COUNT(*) OVER() AS TotalCount
    FROM Filtered
    ORDER BY
        CASE WHEN @SortDir = 'asc'  THEN
             CASE @SortKey WHEN 'reference' THEN Reference
                           WHEN 'status'    THEN Status END END ASC,
        CASE WHEN @SortDir = 'asc'  THEN
             CASE @SortKey WHEN 'total'     THEN Total
                           WHEN 'createdAt' THEN DATEDIFF(SECOND,'2000-01-01',DateCreated) END END ASC,
        CASE WHEN @SortDir = 'desc' THEN
             CASE @SortKey WHEN 'reference' THEN Reference
                           WHEN 'status'    THEN Status END END DESC,
        CASE WHEN @SortDir = 'desc' THEN
             CASE @SortKey WHEN 'total'     THEN Total
                           WHEN 'createdAt' THEN DATEDIFF(SECOND,'2000-01-01',DateCreated) END END DESC,
        Id DESC                                  -- stable tiebreak; without it paging repeats rows
    OFFSET (@Page - 1) * @PageSize ROWS
    FETCH NEXT @PageSize ROWS ONLY;
END
```

> The final `Id DESC` tiebreak is not optional. `OFFSET/FETCH` over a non-unique sort key
> gives no stable order between pages, and rows genuinely duplicate and vanish across pages.

The C# side clamps and shapes the envelope:

```csharp
var rows = (await conn.QueryAsync<OrderRow>("usp_Order_List", p,
                commandType: CommandType.StoredProcedure)).ToList();
var total = rows.Count > 0 ? rows[0].TotalCount : 0;
var pageCount = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
var page = Math.Min(Math.Max(1, requestedPage), pageCount);   // clamp, per §1.1
```

### 3.3 Procedure inventory

Per entity, unless noted: `_List`, `_GetById`, `_Create`, `_Update`, `_Delete` (soft),
`_Restore`, `_SetEnabled`.

| Entity | Extra procedures |
|---|---|
| User | `_GetByMobile` (login), `_UpdatePassword`, `_UpdateProfile`, `_RecordLogin`, `_ListAddresses`, `_UpsertAddress`, `_SetDefaultAddress`, `_DeleteAddress` |
| Product | `_GetBySlug`, `_ListFeatured`, `_Search` (facet-aware, §5.2), `_AdjustStock`, `_ListLowStock`, `_UpsertImage`, `_SetPrimaryImage`, `_DeleteImage`, `_ReplaceAttributes`, `_ReplaceTags`, `_ListAdjustments`, `_UpsertAdjustment`, `_DeleteAdjustment`, `_BulkUpsert` (CSV import, §5.3) |
| Category | `_ListWithFilters` (categories + their facet specs + options, one call) |
| Order | `_SetStatus`, `_ListQueue` (status IN 'created','pending'), `_GetDetail` (§5.4), `_CreateFromCart` (transactional, §5.5), `_ListByUser` |
| Payment | `_ListByOrder`, `_ListByUser`, `_SumSettledForOrder` |
| Review | `_ListByProduct` (approved only for public), `_SetApproved`, `_RatingSummary`, `_CheckEligibility` |
| Coupon | `_GetByCode`, `_Validate` (returns rejection reason + shortfall), `_IncrementUsage` |
| Contact | `_ListReplies`, `_AddReply` (applies the status transition, §2.4), `_Assign`, `_SetStatus` |
| Message | `_Queue`, `_MarkSent`, `_MarkFailed`, `_ListTemplates`, `_UpsertTemplate` |
| StockAlert | `_Subscribe`, `_ListPendingForProduct`, `_MarkNotified` |
| Geo | `_ListProvincesByCountry`, `_ListCitiesByProvince` |
| Favorite | `_ListByUser`, `_Toggle` |
| Settings | `_Get`, `_Update` |
| Dashboard | `_GetStats` (§5.6) |
| RequestLog | `_Insert`, `_List`, `_Purge` (hard delete older than N days) |

---

## 4. Authentication & authorization

### 4.1 Authentication

- **JWT bearer.** The frontend already stores `{ user, token, issuedAt }` in `localStorage`
  and its axios instance sends `Authorization: Bearer {token}` plus an `Accept-Language`
  header. Do not switch to cookies without changing the client.
- Login is **mobile + password** (not email).
- Hash with **ASP.NET Core `PasswordHasher<T>`** (PBKDF2) or BCrypt. The mock data has
  plaintext passwords like `admin123` — those are seed fixtures, hash them at seed time and
  never store plaintext.
- Access token ~30 min; refresh token ~14 days, rotated on use, stored in `RefreshTokens`.
- Lock the account after N failed attempts using `FailedLoginCount` / `LockoutUntil`.
- `IsEnabled = 0` or `IsDeleted = 1` → login fails with the same generic message as a wrong
  password. Do not reveal which.

**Claims to issue:** `sub` (user id), `mobile`, `role`, `subRole`, `given_name`,
`family_name`, and one `permission` claim per granted permission.

### 4.2 Authorization — permissions, not roles

The frontend guards every surface by **permission**, never by role name, so that adding a
sub-role later is one row of data and no code. Mirror that server-side with a policy per
permission.

**Roles → sub-roles:**
- `admin` → `super-admin`, `manager`, `support`
- `customer` → `regular`, `vip`

**Permissions** (exact strings — the client already uses them):

```
dashboard.view   customers.view   customers.write
sales.view       sales.write      products.view     products.write
payments.view    payments.write   reviews.view      reviews.write
contacts.view    contacts.write   messages.view     messages.send
geo.view         geo.manage       settings.manage
account.view     account.orders   account.payments
```

**Grants:**

| Sub-role | Permissions |
|---|---|
| `super-admin` | all admin permissions |
| `manager` | all admin permissions **except** `settings.manage` |
| `support` | `dashboard.view`, `customers.view`, `products.view`, `reviews.view`, `reviews.write`, `contacts.view`, `contacts.write`, `messages.view`, `messages.send` |
| `regular`, `vip` | `account.view`, `account.orders`, `account.payments` |

> Support deliberately has **no** `sales.*` or `payments.*`: financial reporting is out of
> scope for them, and those sections disappear from their menu rather than merely refusing
> on click.

Store this as a table (`Permissions`, `SubRolePermissions`) seeded from the list above, so it
is data rather than a `switch`. Load it once at startup into memory.

**Your requirement — "delete and edit only for admin" — is already satisfied by this map:**
every `.write` permission belongs exclusively to admin sub-roles; no customer sub-role has
one. Keep the fine-grained policies rather than collapsing to `[Authorize(Roles="admin")]`,
because they also express the *support cannot see money* rule, which a role check cannot.

```csharp
[Authorize(Policy = "products.write")]
[HttpDelete("{id:int}")]
public Task<IActionResult> Delete(int id) => ...
```

**Ownership checks (do not skip these).** A customer calling `GET /api/v1/orders/{id}` must
only see their own order. Permission alone is not enough — compare `sub` against the row's
`UserId` and return **404** (not 403) when it does not match, so the endpoint does not
confirm that someone else's order exists.

---

## 5. Behaviour the API must reproduce

These are rules the frontend already implements and unit-tests. The API is the authority, so
it must enforce them too — the client's copy is for responsiveness, not for correctness.

### 5.1 Order queue urgency
Actionable statuses are **`created` and `pending`** only. "Waiting days" is
`today - createdAt`. Urgency is `overdue` when waiting days > `Settings.OverdueAfterDays`
(default 3), `warning` when equal, `normal` below.

### 5.2 Product search & facets
- Free text matches title and description **in both languages** plus slug and tags, so an
  English query finds a product last edited in Farsi.
- Within one facet, selected values are **OR**-ed; different facets are **AND**-ed.
- An **unchecked boolean facet must not exclude anything** — it means "don't care", not "false".
- `minRating` excludes unrated products (their derived average is `null`, not `0`).
- Sorts: `featured`, `newest`, `price-asc`, `price-desc`, `name-asc`, `rating-desc`.
  For `rating-desc`, unrated products sort last (treat `null` as `-1`).

### 5.3 Bulk product import (CSV)
The admin panel has a CSV import/export. Mirror it as `POST /api/v1/products/bulk` with a
`?dryRun=true` preview mode returning per-row `create|update|error` plus messages.
- Match on `Code`/`Id` first, then `Slug`. An id that matches nothing is an **error**, not a
  silent create.
- **A column absent from the payload means "leave that field alone"; a column present but
  empty means "clear it".** Without the distinction, a three-column price correction strips
  the tags, brand and price rules off every product it touches.
- **Images are never imported.** A created product starts with an empty gallery; an updated
  one keeps the gallery it has. Exports *do* include image paths.

### 5.4 Order detail (`usp_Order_GetDetail`)
One call returning: the order, its lines each joined to the product **and to that customer's
review of that product**, its payments, the customer, the shipping address, and the
customer's history (order count, lifetime value excluding cancelled orders, first order date,
their other orders). Match a review on **both** `UserId` and `ProductId` — matching on
product alone shows another customer's review.

### 5.5 Checkout (`usp_Order_CreateFromCart`) — one transaction
1. Re-price every line **server-side** from current `Products.Price` + adjustments. Never
   trust a client-supplied price.
2. If `Settings.EnforceStock`, verify each line against `Stock`, **combining repeated lines
   for the same product** before comparing. Fail the whole order with the shortages listed.
3. Validate and apply the coupon; increment `UsedCount` guarded against `UsageLimit`.
4. Apply shipping (`ShippingFlatRate`, waived above `FreeShippingThreshold`) and tax.
5. Decrement stock, **never below zero**.
6. Snapshot the shipping address and the line titles in both languages.
7. Insert the order, its lines, and a `pending` payment row.
8. Commit. Then queue notifications (outside the transaction).

### 5.6 Dashboard (`usp_Dashboard_GetStats`)
Returns revenue (excluding cancelled orders), order count, customer count, average order
value, period-over-period change for revenue and orders, the 5 most recent orders, top
products by units sold, and the order count per status.

---

## 6. Middleware & configuration

### 6.1 Pipeline order

```
UseExceptionHandler (ProblemDetails)
UseSerilogRequestLogging          (optional, console/file)
UseHttpsRedirection
UseCors                           ("Frontend" policy — the Next.js origin, credentials off)
UseAuthentication
UseAuthorization
RequestResponseLoggingMiddleware  (after auth, so it can record the user id)
MapControllers
```

### 6.2 Request/response logging middleware

Writes to `RequestLogs` via `usp_RequestLog_Insert`. Requirements:

- **Buffer carefully.** Call `context.Request.EnableBuffering()` and rewind the stream after
  reading, or the model binder gets an empty body. Swap the response body for a
  `MemoryStream`, then copy it back to the original stream in a `finally`.
- **Never log secrets.** Redact `password`, `passwordHash`, `token`, `refreshToken`,
  `Authorization` from both bodies and headers before writing.
- **Cap body size** (e.g. 32 KB) and skip binary content types — an image upload must not go
  into the log table.
- **Log failures too**, including unhandled exceptions, with the status code and duration.
- Fire-and-forget the insert (or use a bounded `Channel<T>` + background writer) so logging
  never adds latency to the response, and **never let a logging failure fail the request**.
- Honour the config switches below.

### 6.3 `appsettings.json`

```jsonc
{
  "ConnectionStrings": {
    "StoriDb": "Server=.;Database=StoriDb;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "DataSource": {
    "Provider": "SqlServer",           // future-proofing hook
    "CommandTimeoutSeconds": 30
  },
  "Logging": {
    "RequestResponse": {
      "Enabled": true,                  // master switch — your LoggingEnable
      "LogRequestBody": true,
      "LogResponseBody": true,
      "MaxBodyBytes": 32768,
      "ExcludePaths": [ "/health", "/swagger" ],
      "ExcludeMethods": [ "OPTIONS" ],
      "OnlyOnError": false,             // true = log 4xx/5xx only
      "RetentionDays": 30,
      "RedactKeys": [ "password", "token", "refreshToken", "authorization" ]
    }
  },
  "Jwt": {
    "Issuer": "stori-api",
    "Audience": "stori-web",
    "SecretKey": "",                    // user-secrets / env var — never commit
    "AccessTokenMinutes": 30,
    "RefreshTokenDays": 14
  },
  "Sms": {
    "Enabled": true,
    "Provider": "Kavenegar",            // Kavenegar | Ghasedak | SmsIr | Console
    "ApiKey": "",                       // user-secrets / env var
    "BaseUrl": "https://api.kavenegar.com/v1",
    "SenderNumber": "10008663",
    "SenderName": "Storefront",
    "TimeoutSeconds": 15,
    "RetryCount": 2,
    "SendInBackground": true
  },
  "Email": {
    "Enabled": true,
    "SmtpHost": "", "SmtpPort": 587, "UseSsl": true,
    "FromAddress": "support@storefront.test", "FromName": "Storefront",
    "Username": "", "Password": ""
  },
  "Storage": {
    "ImageRootPath": "wwwroot/uploads",
    "PublicBaseUrl": "/uploads",
    "MaxImageBytes": 2097152,
    "AllowedExtensions": [ ".jpg", ".jpeg", ".png", ".webp", ".svg" ]
  },
  "Cors": { "AllowedOrigins": [ "http://localhost:3000" ] }
}
```

Bind each section to a strongly-typed options class with `IOptions<T>` and validate on start
(`ValidateOnStart()`). **Secrets go in user-secrets or environment variables**, never in the
committed file — leave `SecretKey`, `ApiKey` and `Password` empty in source control.

`Sms:Provider = "Console"` should write to the log instead of calling a provider, so the
whole system works offline in development. Put every provider behind one `ISmsSender`
interface so swapping providers is a config change.

---

## 7. File storage (product & avatar images)

The frontend currently holds uploaded images as **data URLs** — a phase-1 mock artifact. The
API owns them properly:

- `POST /api/v1/products/{id}/images` — `multipart/form-data`, returns the created
  `ProductImage` with its public path.
- Validate the **content**, not just the extension — check magic bytes; reject anything that
  isn't a real image. Never trust the client filename; generate `{guid}{ext}`.
- Store under `Storage:ImageRootPath`, serve from `Storage:PublicBaseUrl`.
- The DB holds the **relative path** (`/uploads/products/ab12….webp`), never the bytes.
- Deleting a product image soft-deletes the row; sweep orphaned files with a background job
  rather than deleting inline, so a failed transaction cannot lose a file that is still
  referenced.

---

## 8. Endpoints

`[A]` = admin permission required · `[C]` = authenticated customer (ownership-checked) ·
`[P]` = public. `v1` prefix omitted.

### Auth
```
POST   /auth/register              [P]  { firstName, lastName, mobile, password }
POST   /auth/login                 [P]  { mobile, password } -> { user, token, refreshToken, issuedAt }
POST   /auth/refresh               [P]  { refreshToken }
POST   /auth/logout                [C]
GET    /auth/me                    [C]
POST   /auth/change-password       [C]
POST   /auth/forgot-password       [P]  * not in the frontend yet — build it
POST   /auth/reset-password        [P]  *
```

### Catalog (public reads)
```
GET    /products                   [P]  full list contract + facet params
GET    /products/featured          [P]  ?limit=4
GET    /products/slug/{slug}       [P]
GET    /products/{id}              [P]
GET    /products/{id}/price        [P]  * full adjustment breakdown, for the PDP
GET    /categories                 [P]  includes each category's filter specs + options
GET    /categories/{id}/filters    [P]
GET    /brands                     [P]
```

### Catalog (admin writes)
```
POST   /products                   [A products.write]
PUT    /products/{id}              [A products.write]
DELETE /products/{id}              [A products.write]   soft
POST   /products/{id}/restore      [A products.write]   *
PATCH  /products/{id}/enabled      [A products.write]   { isEnabled }
PATCH  /products/{id}/stock        [A products.write]   * { delta | absolute }
POST   /products/{id}/images       [A products.write]   multipart
DELETE /products/{id}/images/{img} [A products.write]
PUT    /products/{id}/primary-image[A products.write]
GET    /products/low-stock         [A products.view]    * dashboard card
POST   /products/bulk              [A products.write]   CSV import, ?dryRun=true
GET    /products/export            [A products.view]    CSV export
CRUD   /categories, /brands        [A products.write]
```

### Orders
```
GET    /orders                     [A sales.view]       full list contract
GET    /orders/{id}                [A sales.view] / [C] own only
GET    /orders/{id}/detail         [A sales.view]       the full dashboard payload (§5.4)
GET    /orders/queue               [A sales.view]       created + pending
GET    /orders/queue/count         [A sales.view]       * for the notification bell badge
POST   /orders                     [C]                  checkout (§5.5)
PATCH  /orders/{id}/status         [A sales.write]
DELETE /orders/{id}                [A sales.write]      soft
PATCH  /orders/{id}/enabled        [A sales.write]
GET    /account/orders             [C account.orders]   own, tabbed by status
POST   /orders/{id}/cancel         [C]                  * customer-initiated, only while created/pending
```

### Payments
```
GET    /payments                   [A payments.view]
GET    /payments/{id}              [A payments.view]
GET    /account/payments           [C account.payments]
POST   /payments                   [A payments.write]
PATCH  /payments/{id}/status       [A payments.write]
DELETE /payments/{id}              [A payments.write]
POST   /payments/{id}/refund       [A payments.write]   *
```

### Reviews
```
GET    /products/{id}/reviews      [P]                  approved only
GET    /reviews                    [A reviews.view]     all, incl. pending
POST   /products/{id}/reviews      [C]                  eligibility enforced (§2.3)
GET    /products/{id}/reviews/eligibility [C]           * pre-flight for the UI
PATCH  /reviews/{id}/approved      [A reviews.write]
DELETE /reviews/{id}               [A reviews.write]
GET    /account/reviews            [C]                  * "have I reviewed this?"
```

### Cart & coupons
```
GET    /cart                       [C]  *
PUT    /cart/lines                 [C]  *
DELETE /cart/lines/{productId}     [C]  *
POST   /coupons/validate           [C]  { code, subtotal } -> { ok, discount } | { reason, shortfall }
CRUD   /coupons                    [A sales.write]
```

### Customers
```
GET    /customers                  [A customers.view]
GET    /customers/{id}             [A customers.view]
POST   /customers                  [A customers.write]
PUT    /customers/{id}             [A customers.write]
DELETE /customers/{id}             [A customers.write]
PATCH  /customers/{id}/enabled     [A customers.write]
GET    /customers/{id}/addresses   [A customers.view]   drives the location modal
GET    /customers/export           [A customers.view]   * CSV, mirroring the PDF export
GET    /account/profile            [C account.view]
PUT    /account/profile            [C account.view]
POST   /account/avatar             [C account.view]     multipart
GET    /account/addresses          [C]
POST   /account/addresses          [C]
PUT    /account/addresses/{id}     [C]
DELETE /account/addresses/{id}     [C]
PUT    /account/addresses/{id}/default [C]
```

### Favorites & stock alerts
```
GET    /account/favorites          [C]
POST   /account/favorites/{pid}    [C]
DELETE /account/favorites/{pid}    [C]
POST   /products/{id}/stock-alert  [P]  { mobile }
GET    /stock-alerts               [A products.view]  *
```

### Support & messaging
```
POST   /contacts                   [P]  the public contact form
GET    /contacts                   [A contacts.view]
GET    /contacts/{id}              [A contacts.view] / [C] own thread
GET    /contacts/{id}/replies      [A contacts.view] / [C] own
POST   /contacts/{id}/replies      [A contacts.write] / [C] own
PATCH  /contacts/{id}/status       [A contacts.write]
PATCH  /contacts/{id}/assign       [A contacts.write]  *
GET    /messages                   [A messages.view]
POST   /messages/send              [A messages.send]   to selected customers or raw numbers
POST   /messages/{id}/resend       [A messages.send]   *
CRUD   /message-templates          [A messages.send]
POST   /messages/estimate          [A messages.send]   * segment/cost preview before sending
```

### Geography
```
GET    /countries                  [P]
GET    /countries/{id}/provinces   [P]
GET    /provinces/{id}/cities      [P]
CRUD   /countries|/provinces|/cities  [A geo.manage]
```

### Platform
```
GET    /settings                   [P]  storefront needs shipping/tax/store name
PUT    /settings                   [A settings.manage]
GET    /dashboard/stats            [A dashboard.view]
GET    /logs                       [A settings.manage]  * request log viewer
GET    /health                     [P]  * DB connectivity probe
```

`*` marks endpoints the frontend does not call yet but that the domain clearly needs — build
them, they are cheap now and awkward to retrofit.

---

## 9. Seed data

`03_seed.sql` should reproduce the mock fixtures so the frontend can be pointed at the API
and behave identically. Current volumes:

| Data | Count | Source file |
|---|---|---|
| Users | **5** — 3 admin (one per sub-role), 2 customer | `src/lib/data/users.ts` |
| Products | **8** | `src/lib/data/mock.ts` |
| Categories | **4**, carrying **13** facet specs between them | `src/lib/data/mock.ts` |
| Brands | **8** | `src/lib/data/brands.ts` |
| Orders / order lines | **10** / **13** | `src/lib/data/commerce.ts` |
| Payments | **8** | `src/lib/data/commerce.ts` |
| Reviews | **12** | `src/lib/data/reviews-data.ts` |
| Contacts / ticket replies | **2** / **2** | `src/lib/data/commerce.ts` |
| Messages | **3** | `src/lib/data/commerce.ts` |
| Message templates | **6** | `src/lib/data/sms-templates.ts` |
| Coupons | **3** | `src/lib/data/coupons.ts` |
| Stock alerts | **2** | `src/lib/data/stockAlerts.ts` |
| Countries / provinces / cities | **3** / **11** / **22** | `src/lib/data/geo.ts` |
| Store settings | 1 row | `src/lib/settings.ts` |

> Counts verified against the source on 2026-09-05 by evaluating the arrays, not by reading
> them. Orders are partly generated by a helper, so a visual count of that file is wrong.

Seed passwords must be **hashed at seed time**. The fixtures use `admin123` etc. in
plaintext; those are for local sign-in convenience only.

Make the seed script idempotent — `IF NOT EXISTS (SELECT 1 FROM … WHERE Code = 'p-001')` —
so it can be re-run without duplicating.

**Data integrity the seed must respect:** a product's attributes must only use facet keys its
category actually declares. An earlier bug put an audio product in the wrong category, which
made its facets unreachable and its filters silently return nothing. Add a validation query
to the seed script that asserts this.

---

## 10. Testing

- **Unit-test the pricing engine first** (§2.2) — offset → discount → tax, the per-discount
  cap, the zero floor, date-window boundaries. It is the highest-risk logic in the system and
  the frontend has 40+ tests for it you can port as cases.
- Also unit-test: coupon validation and its six rejection reasons; SMS segmentation
  (GSM-7 vs UCS-2 boundaries at 160/153 and 70/67); stock shortage detection with repeated
  lines; ticket status transitions.
- Integration-test the list contract against a real LocalDB: paging clamp, `pageCount` never
  0, stable order across pages, inclusive date bounds.
- Test that a customer **cannot** read another customer's order, and that the response is
  404 rather than 403.

---

## 11. Frontend cut-over

`src/lib/data/config.ts` and `source-context.tsx` already switch the app between `mock` and
`api` sources — `DataSource = "mock" | "api"`. The cut-over is:

1. Point `API_BASE_URL` at the API.
2. Replace each `createRepository` call in `src/lib/data/repositories.ts` with an axios-backed
   implementation of the same `Repository<T>` interface.
3. Nothing else changes — that interface is why this document exists.

Enable CORS for `http://localhost:3000` and honour the `Accept-Language` header the client
sends (`en` / `fa`) for any server-generated message text.

---

## 12. Suggested build order

**Milestone 1 — foundation.** Project skeleton with the folder layout, `appsettings` +
options classes, `SqlConnection` factory, `/db/01_schema.sql` for Users + audit columns,
JWT auth, permission policies, `ProblemDetails` handler, request/response logging middleware,
`/health`, Swagger. Deliverable: register, log in, call an authorised endpoint.

**Milestone 2 — catalog.** Brands, categories + filter specs, products with images,
attributes, tags and adjustments. The pricing engine and its tests. Public product list with
the full facet/search/sort/paging contract.

**Milestone 3 — commerce.** Orders, order lines, payments, checkout transaction, order queue,
order detail. Stock decrement and shortage handling.

**Milestone 4 — engagement.** Reviews with moderation, coupons, favorites, server-side cart,
stock alerts.

**Milestone 5 — support & ops.** Contacts + ticket replies, messages + templates + the SMS
provider abstraction, store settings, dashboard stats, geo CRUD, CSV import/export, the log
viewer, and the retention job.

Stop for review at the end of each milestone.
