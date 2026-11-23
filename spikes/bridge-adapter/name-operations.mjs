// Bridge's description names none of its 144 operations, and `ortho new adapter` names calls from `operationId` only.
// This writes a copy with one per operation, `<tag>/<summary>`, so the rest of the generator can be tried.
// Usage: node name-operations.mjs <bridge.json> <out.json>
import { readFileSync, writeFileSync } from "node:fs";

const [from, to] = process.argv.slice(2);
const spec = JSON.parse(readFileSync(from, "utf8"));
const DROP = new Set(["a", "an", "the", "of", "for", "by", "to", "all"]);
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(" ").filter((w) => w !== "" && !DROP.has(w));
const seen = new Map();
for (const item of Object.values(spec.paths)) {
  for (const [method, op] of Object.entries(item)) {
    if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
    const id = `${words(op.tags?.[0] ?? "misc").join("-")}/${words(op.summary).join("-")}`;
    const n = (seen.get(id) ?? 0) + 1;
    seen.set(id, n);
    op.operationId = n === 1 ? id : `${id}-${n}`;
  }
}
writeFileSync(to, JSON.stringify(spec));
const repeats = [...seen].filter(([, n]) => n > 1);
console.log(`named ${[...seen.values()].reduce((a, b) => a + b, 0)} operations; ${repeats.length} summaries repeat: ${repeats.map(([k, n]) => `${k} x${n}`).join(", ") || "none"}`);
