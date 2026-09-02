"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/panel/Icon";
import { useI18n } from "@/i18n/I18nProvider";
import { customersRepo } from "@/lib/data/repositories";
import type { MockUser } from "@/lib/data/users";
import type { MessageChannel } from "@/lib/data/commerce";
import {
  isValidRecipient,
  normalizeRecipient,
  parseEmails,
  recipientFieldFor,
} from "@/lib/messaging";
import { parseNumbers } from "@/lib/sms";

export interface Recipient {
  mobile: string;
  /** Present when the recipient came from the customer list. */
  customer?: MockUser;
}

type Mode = "customers" | "manual";

/**
 * Builds the recipient list for a broadcast, either by picking customers
 * or by pasting numbers.
 *
 * The two routes converge on one list keyed by normalised mobile, so a
 * customer picked from the list and the same number typed by hand cannot
 * both end up in the send — the recipient with customer data wins, since
 * that is the one whose placeholders can be resolved.
 */
export function RecipientPicker({
  channel,
  recipients,
  onChange,
}: {
  channel: MessageChannel;
  recipients: Recipient[];
  onChange: (next: Recipient[]) => void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("customers");
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState("");
  const [invalid, setInvalid] = useState<string[]>([]);

  // Only customers reachable on this channel. The two sets differ —
  // plenty of accounts have a mobile but no email — so switching
  // channel genuinely changes who can be picked.
  const field = recipientFieldFor(channel);
  const customers = useMemo(
    () =>
      customersRepo
        .all()
        .filter((u) => u.role === "customer" && u.active && Boolean(u[field])),
    [field]
  );

  const unreachable = useMemo(
    () =>
      customersRepo
        .all()
        .filter((u) => u.role === "customer" && u.active && !u[field]).length,
    [field]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return customers;
    return customers.filter((c) =>
      [c.firstName, c.lastName, c.mobile, c.email ?? ""].some((value) =>
        value.toLowerCase().includes(needle)
      )
    );
  }, [customers, query]);

  const selected = new Set(recipients.map((r) => r.mobile));

  function add(next: Recipient[]) {
    const merged = new Map(recipients.map((r) => [r.mobile, r]));
    for (const entry of next) {
      const existing = merged.get(entry.mobile);
      // Never downgrade a known customer to a bare number.
      if (existing?.customer && !entry.customer) continue;
      merged.set(entry.mobile, entry);
    }
    onChange([...merged.values()]);
  }

  function toggleCustomer(customer: MockUser) {
    const mobile = normalizeRecipient(channel, customer[field] ?? "");
    if (selected.has(mobile)) {
      onChange(recipients.filter((r) => r.mobile !== mobile));
    } else {
      add([{ mobile, customer }]);
    }
  }

  function addManual() {
    const { valid, invalid: bad } =
      channel === "sms" ? parseNumbers(manual) : parseEmails(manual);
    setInvalid(bad);
    if (valid.length > 0) {
      add(valid.map((mobile) => ({ mobile })));
      // Keep only what failed, so the operator can fix it in place.
      setManual(bad.join(", "));
    }
  }

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((c) =>
      selected.has(normalizeRecipient(channel, c[field] ?? ""))
    );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("sms.recipients")}
        </span>
        <span className="text-xs font-medium text-slate-600">
          {t("sms.recipientCount", { count: recipients.length })}
        </span>
      </div>

      {/* Mode switch */}
      <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
        {(["customers", "manual"] as Mode[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            aria-pressed={mode === value}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === value
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {value === "customers" ? t("sms.fromCustomers") : t("sms.enterNumbers")}
          </button>
        ))}
      </div>

      {mode === "customers" ? (
        <div className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-slate-400">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("admin.searchCustomers")}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pe-3 ps-9 text-sm outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-1.5">
            <span className="text-xs text-slate-500">
              {t("sms.matching", { count: filtered.length })}
            </span>
            <button
              type="button"
              onClick={() =>
                allFilteredSelected
                  ? onChange(
                      recipients.filter(
                        (r) =>
                          !filtered.some(
                            (c) =>
                              normalizeRecipient(channel, c[field] ?? "") ===
                              r.mobile
                          )
                      )
                    )
                  : add(
                      filtered.map((c) => ({
                        mobile: normalizeRecipient(channel, c[field] ?? ""),
                        customer: c,
                      }))
                    )
              }
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              {allFilteredSelected ? t("sms.deselectAll") : t("sms.selectAll")}
            </button>
          </div>

          <ul className="max-h-56 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                {t("common.noResults")}
              </li>
            )}
            {filtered.map((customer) => {
              const mobile = normalizeRecipient(channel, customer[field] ?? "");
              const checked = selected.has(mobile);
              return (
                <li key={customer.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCustomer(customer)}
                      className="h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <Avatar
                      firstName={customer.firstName}
                      lastName={customer.lastName}
                      avatarUrl={customer.avatarUrl}
                      avatarColor={customer.avatarColor}
                      size="sm"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {customer.firstName} {customer.lastName}
                      </span>
                      <span className="force-ltr block text-xs text-slate-500">
                        {customer[field]}
                      </span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div>
          <textarea
            rows={3}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            dir="ltr"
            placeholder={
              channel === "sms"
                ? "09120000001, 09120000002"
                : "someone@example.com, other@example.com"
            }
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:bg-white"
          />
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              {channel === "sms" ? t("sms.numbersHint") : t("sms.emailsHint")}
            </p>
            <button
              type="button"
              onClick={addManual}
              disabled={!manual.trim()}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {channel === "sms" ? t("sms.addNumbers") : t("sms.addEmails")}
            </button>
          </div>
          {invalid.length > 0 && (
            <p className="mt-1 text-xs text-rose-600">
              {t(
                channel === "sms"
                  ? "sms.invalidNumbers"
                  : "sms.invalidEmails",
                { list: invalid.join(", ") }
              )}
            </p>
          )}
        </div>
      )}

      {unreachable > 0 && (
        <p className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800">
          {t("sms.unreachable", { count: unreachable })}
        </p>
      )}

      {/* The combined list, whichever route each entry came from. */}
      {recipients.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-2">
          {recipients.map((r) => (
            <span
              key={r.mobile}
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm"
            >
              {r.customer ? (
                <>
                  <Icon name="user" className="h-3 w-3 text-indigo-500" />
                  {r.customer.firstName} {r.customer.lastName}
                </>
              ) : (
                <>
                  <Icon name="chat" className="h-3 w-3 text-slate-400" />
                  <span className="force-ltr">{r.mobile}</span>
                </>
              )}
              <button
                type="button"
                onClick={() =>
                  onChange(recipients.filter((x) => x.mobile !== r.mobile))
                }
                aria-label={t("common.delete")}
                className="text-slate-400 hover:text-rose-600"
              >
                <Icon name="close" className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => onChange([])}
            className="ms-auto text-xs font-semibold text-rose-600 hover:text-rose-700"
          >
            {t("sms.clearRecipients")}
          </button>
        </div>
      )}
    </div>
  );
}

export { isValidRecipient };
