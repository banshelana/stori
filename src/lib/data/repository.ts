// ---------------------------------------------------------------
// Generic in-memory repository backing the admin CRUD screens.
//
// Mutations write to the module-level array, so edits survive
// client-side navigation but reset on reload — which is what a mock
// source should do. Phase 3 swaps `createRepository` calls for the
// axios client; the method signatures are what the API must satisfy.
// ---------------------------------------------------------------

export interface Identifiable {
  id: string;
}

export interface ListQuery {
  /** Free-text search across whatever `searchable` returns. */
  q?: string;
  /** Exact-match filters, e.g. { status: "pending" }. */
  filters?: Record<string, string | undefined>;
  sortKey?: string;
  sortDir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ListResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageCount: number;
}

export interface Repository<T extends Identifiable> {
  list: (query?: ListQuery) => Promise<ListResult<T>>;
  get: (id: string) => Promise<T | undefined>;
  create: (input: Omit<T, "id">) => Promise<T>;
  update: (id: string, patch: Partial<T>) => Promise<T>;
  remove: (id: string) => Promise<void>;
  /** Direct access for cross-entity lookups; not part of the API contract. */
  all: () => T[];
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function createRepository<T extends Identifiable>({
  data,
  idPrefix,
  searchable,
  sorters = {},
  latency = 250,
}: {
  data: T[];
  idPrefix: string;
  /** Every string a free-text query should match against. */
  searchable: (row: T) => string[];
  /** Comparable value per sortable column key. */
  sorters?: Record<string, (row: T) => string | number>;
  latency?: number;
}): Repository<T> {
  let sequence = data.length;

  function nextId(): string {
    sequence += 1;
    return `${idPrefix}-${String(sequence).padStart(3, "0")}`;
  }

  return {
    all: () => data,

    async list(query = {}) {
      await delay(latency);

      const {
        q,
        filters = {},
        sortKey,
        sortDir = "asc",
        page = 1,
        pageSize = 10,
      } = query;

      let rows = [...data];

      const needle = q?.trim().toLowerCase();
      if (needle) {
        rows = rows.filter((row) =>
          searchable(row).some((value) =>
            value.toLowerCase().includes(needle)
          )
        );
      }

      for (const [key, value] of Object.entries(filters)) {
        // An empty filter means "all", not "match the empty string".
        if (!value) continue;
        rows = rows.filter(
          (row) => String((row as Record<string, unknown>)[key]) === value
        );
      }

      const sorter = sortKey ? sorters[sortKey] : undefined;
      if (sorter) {
        rows.sort((a, b) => {
          const av = sorter(a);
          const bv = sorter(b);
          const cmp =
            typeof av === "number" && typeof bv === "number"
              ? av - bv
              : String(av).localeCompare(String(bv));
          return sortDir === "asc" ? cmp : -cmp;
        });
      }

      const total = rows.length;
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      // Deleting the last row of the final page would otherwise strand
      // the caller on an empty page.
      const safePage = Math.min(Math.max(1, page), pageCount);
      const start = (safePage - 1) * pageSize;

      return {
        rows: rows.slice(start, start + pageSize),
        total,
        page: safePage,
        pageCount,
      };
    },

    async get(id) {
      await delay(120);
      return data.find((row) => row.id === id);
    },

    async create(input) {
      await delay(latency);
      const created = { ...input, id: nextId() } as T;
      data.unshift(created);
      return created;
    },

    async update(id, patch) {
      await delay(latency);
      const index = data.findIndex((row) => row.id === id);
      if (index === -1) throw new Error("NOT_FOUND");
      // id is never patchable — it's the identity the caller looked up by.
      const { id: _ignored, ...safe } = patch as Partial<T> & { id?: string };
      data[index] = { ...data[index], ...safe };
      return data[index];
    },

    async remove(id) {
      await delay(latency);
      const index = data.findIndex((row) => row.id === id);
      if (index === -1) throw new Error("NOT_FOUND");
      data.splice(index, 1);
    },
  };
}
