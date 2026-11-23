// The same hash the model gives things and operations (`model/internal/hash.ts`, which a module's neighbours may not import):
// sha256 over the entry as JSON with keys sorted at every level, so equal inputs give equal hashes whatever the file's formatting.
import { createHash } from "node:crypto";

const canonical = (x: unknown): string =>
  JSON.stringify(x, (_, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  );

export const hashOf = (entry: unknown): string => createHash("sha256").update(canonical(entry)).digest("hex").slice(0, 16);
