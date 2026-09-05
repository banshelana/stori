import type { Order } from "@/lib/data/commerce";

// ---------------------------------------------------------------
// PDF export, by way of the browser's own print pipeline.
//
// Why not a JS PDF library: jsPDF, pdfmake and friends draw glyphs
// one at a time and do no Arabic contextual shaping and no bidi. A
// Persian order sheet comes out of them as disconnected letters in the
// wrong order — unreadable, and worse than useless on an invoice. The
// browser already shapes Persian correctly with the Vazirmatn face this
// project vendors, and prints it as selectable vector text with no
// dependency and nothing fetched from a network.
//
// So the export is a print stylesheet plus "Save as PDF", and the parts
// worth testing are the ones below.
// ---------------------------------------------------------------

/**
 * Browsers name the saved PDF after `document.title`, so setting the
 * title is how a print gets a sensible filename instead of the page's.
 *
 * Anything a filesystem would reject — or that a shell would treat as a
 * path — is folded into dashes. Persian is left alone: the characters
 * are legal in a filename, and an operator naming a file in Persian
 * should get a Persian filename.
 */
export function printFilename(parts: (string | number | null | undefined)[]) {
  const name = parts
    .filter((p) => p !== null && p !== undefined && String(p).trim() !== "")
    .map((p) =>
      String(p)
        .trim()
        // Reserved on Windows, or a path separator anywhere.
        .replace(/[\\/:*?"<>|]+/g, "-")
        .replace(/\s+/g, "-")
    )
    .join("-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");

  return name || "document";
}

export interface CurrencyTotal {
  currency: string;
  count: number;
  total: number;
}

/**
 * Totals for the footer of a printed list.
 *
 * Grouped by currency rather than summed into one number: orders in EUR
 * and IRR added together would be a figure that means nothing, and a
 * printed sheet is exactly where nobody can check it.
 */
export function totalsByCurrency(orders: Order[]): CurrencyTotal[] {
  const byCurrency = new Map<string, CurrencyTotal>();

  for (const order of orders) {
    const row = byCurrency.get(order.currency) ?? {
      currency: order.currency,
      count: 0,
      total: 0,
    };
    row.count += 1;
    // Cancelled orders are listed but not counted as revenue.
    if (order.status !== "canceled") row.total += order.total;
    byCurrency.set(order.currency, row);
  }

  return [...byCurrency.values()].sort((a, b) =>
    a.currency.localeCompare(b.currency)
  );
}

/**
 * The active search and filters, as a line under the title, so a printed
 * sheet says what it is a list of. A sheet showing 12 of 240 orders with
 * no explanation is a sheet that will be misread.
 */
export function describeFilters(
  entries: { label: string; value: string | undefined }[],
  separator = " · "
): string {
  return entries
    .filter((e) => e.value !== undefined && e.value.trim() !== "")
    .map((e) => `${e.label}: ${e.value}`)
    .join(separator);
}
