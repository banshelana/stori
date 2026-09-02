import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// ---------------------------------------------------------------
// Resolves the "@/..." path alias for Node's test runner.
//
// tsconfig maps "@/*" to "./src/*", which Next understands at build
// time but `node --test` does not. Without this, any test importing a
// module that itself uses the alias fails to load — so tests would be
// limited to leaf modules with no internal imports.
// ---------------------------------------------------------------

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

// Order matters: a directory import should prefer index over a sibling.
const CANDIDATES = ["", ".ts", ".tsx", ".js", "/index.ts", "/index.tsx"];

export function resolve(specifier, context, nextResolve) {
  if (!specifier.startsWith("@/")) {
    return nextResolve(specifier, context);
  }

  const base = path.join(SRC, specifier.slice(2));

  for (const suffix of CANDIDATES) {
    const candidate = base + suffix;
    if (existsSync(candidate)) {
      return nextResolve(pathToFileURL(candidate).href, context);
    }
  }

  // Fall through so Node reports the missing module against the real
  // path rather than the alias, which is far easier to read.
  return nextResolve(pathToFileURL(base + ".ts").href, context);
}
