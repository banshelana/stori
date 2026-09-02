"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Order } from "@/lib/data/commerce";
import { customersRepo, ordersRepo } from "@/lib/data/repositories";
import {
  isActionable,
  sortByNewest,
  sortByOldest,
  summarise,
  type CustomerLookup,
  type QueueSummary,
} from "@/lib/orderQueue";

const SEEN_KEY = "store.admin.queueSeen";
const POLL_MS = 20_000;

/**
 * Ids the operator has already looked at.
 *
 * Kept per-browser rather than on the order: "have I seen this" is a
 * property of the person, not of the order, and two operators should not
 * clear each other's badge. A real backend would store this per user.
 */
function readSeen(): string[] {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSeen(ids: string[]) {
  try {
    // Cap the list so it cannot grow without bound as orders accumulate.
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-500)));
  } catch {
    /* ignore — private mode or storage disabled */
  }
}

/**
 * Several components use this hook at once — the sidebar badge, the
 * header bell and the queue page itself. Each would otherwise hold an
 * independent copy of the data, so advancing an order on the page would
 * leave the badge showing a stale count until its own poll came round.
 *
 * A module-level subscription keeps every live instance in step.
 */
const listeners = new Set<() => void>();

function notifyAll() {
  for (const listener of listeners) listener();
}

export interface OrderQueue {
  /** Actionable orders, oldest first. */
  orders: Order[];
  /** Actionable orders the operator has not acknowledged, newest first. */
  unseen: Order[];
  summary: QueueSummary;
  loading: boolean;
  lookupCustomer: CustomerLookup;
  isUnseen: (order: Order) => boolean;
  markSeen: (ids?: string[]) => void;
  reload: () => void;
}

/**
 * Polls the order source for work that needs attention.
 *
 * This is polling, not push: the mock source has no way to notify us, and
 * neither would a plain REST backend. A production build should replace
 * the interval with a WebSocket or SSE stream — the shape returned here
 * would not change.
 */
export function useOrderQueue({ poll = true }: { poll?: boolean } = {}): OrderQueue {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [seen, setSeen] = useState<string[]>([]);
  const [token, setToken] = useState(0);
  const hydrated = useRef(false);

  useEffect(() => {
    setSeen(readSeen());
    hydrated.current = true;
  }, []);

  const load = useCallback(() => {
    // The repository paginates; the queue wants the whole actionable set,
    // which is small by definition.
    setOrders(sortByOldest(ordersRepo.all().filter(isActionable)));
    setSeen(readSeen());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load, token]);

  // Stay in step with the other instances of this hook.
  useEffect(() => {
    listeners.add(load);
    return () => {
      listeners.delete(load);
    };
  }, [load]);

  useEffect(() => {
    if (!poll) return;
    const id = window.setInterval(load, POLL_MS);
    // Catch up immediately when the tab comes back rather than waiting
    // out the rest of the interval.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll, load]);

  const lookupCustomer = useCallback<CustomerLookup>((userId) => {
    const user = customersRepo.all().find((u) => u.id === userId);
    if (!user) return undefined;
    return { name: `${user.firstName} ${user.lastName}`, mobile: user.mobile };
  }, []);

  const isUnseen = useCallback(
    (order: Order) => hydrated.current && !seen.includes(order.id),
    [seen]
  );

  const markSeen = useCallback(
    (ids?: string[]) => {
      const target = ids ?? orders.map((o) => o.id);
      // Storage is the source of truth so every instance agrees, including
      // ones mounted in a different part of the shell.
      const next = [...new Set([...readSeen(), ...target])];
      writeSeen(next);
      setSeen(next);
      notifyAll();
    },
    [orders]
  );

  const unseen = useMemo(
    () => sortByNewest(orders.filter((o) => !seen.includes(o.id))),
    [orders, seen]
  );

  const summary = useMemo(() => summarise(orders), [orders]);

  return {
    orders,
    unseen,
    summary,
    loading,
    lookupCustomer,
    isUnseen,
    markSeen,
    reload: () => {
      setToken((n) => n + 1);
      notifyAll();
    },
  };
}
