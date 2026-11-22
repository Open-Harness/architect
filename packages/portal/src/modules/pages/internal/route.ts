import { Effect } from "effect";
import type { Route } from "../types.ts";

/** A name in a path: declared names are lowercase words with dots and dashes, so anything else cannot name one. */
const NAME = /^[a-z0-9][a-z0-9.-]*$/;
/** A trace id is hexadecimal. */
const TRACE = /^[0-9a-f]{8,64}$/;

const nameIn = (segment: string, pattern = NAME): string | undefined => {
  const decoded = Effect.runSync(Effect.try({ try: () => decodeURIComponent(segment), catch: () => "" }).pipe(Effect.catch(() => Effect.succeed(""))));
  return pattern.test(decoded) ? decoded : undefined;
};

export const TABS = ["contract", "metrics", "proof", "docs", "notes"] as const;
const REFERENCE = ["access", "refusals", "events", "values", "machines"] as const;
const ALONE: Readonly<Record<string, Route>> = {
  plugins: { page: "plugins" }, journeys: { page: "journeys" }, "starting-worlds": { page: "worlds" }, compare: { page: "compare" }, monitor: { page: "monitor" },
};

/** `/portal` and `/portal/` are home; the pages under it are the ones the portal draws, if the name in the path is a name. */
export const routeOf = (pathname: string, search = ""): Route => {
  const parts = pathname.replace(/\/+$/, "").split("/").slice(1);
  if (parts[0] !== "portal") return { page: "missing" };
  if (parts.length === 1) return { page: "home" };
  if (parts.length === 2) return ALONE[parts[1]!] ?? { page: "missing" };
  if (parts.length !== 3) return { page: "missing" };
  if (parts[1] === "monitor") return parts[2] === "alerts" ? { page: "alerts" } : parts[2] === "issues" ? { page: "issues" } : { page: "missing" };
  const name = nameIn(parts[2]!);
  if (parts[1] === "traces") { const id = nameIn(parts[2]!, TRACE); return id === undefined ? { page: "missing" } : { page: "trace", id }; }
  if (name === undefined) return { page: "missing" };
  if (parts[1] === "things") return { page: "thing", name };
  if (parts[1] === "environments") return { page: "environment", name };
  if (parts[1] === "reference") return (REFERENCE as ReadonlyArray<string>).includes(name) ? { page: "reference", kind: name as (typeof REFERENCE)[number] } : { page: "missing" };
  if (parts[1] === "operations") {
    const asked = new URLSearchParams(search).get("tab") ?? "contract";
    return { page: "operation", name, tab: (TABS as ReadonlyArray<string>).includes(asked) ? asked : "contract" };
  }
  return { page: "missing" };
};
