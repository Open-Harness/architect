import type { Match, Params, RouteTable, Router as RouterType } from "./types.ts";
import { fill, fit, literals, parse, segmentsOf } from "./internal/pattern.ts";

/** The router over a route table. `home` is the page every breadcrumb starts from. */
const make = (table: RouteTable, home: string): RouterType => {
  const compiled = table.routes
    .map((row) => ({ row, pattern: parse(row.path) }))
    // A stable sort: the more literal segments a pattern has, the sooner it is tried.
    .sort((a, b) => literals(b.pattern) - literals(a.pattern));
  const byPage = new Map(compiled.map((c) => [c.row.page, c]));

  const match = (pathname: string): Match | undefined => {
    const address = segmentsOf(pathname);
    for (const { row, pattern } of compiled) {
      const params = fit(pattern, address);
      if (params !== undefined) return { page: row.page, params };
    }
    return undefined;
  };
  const href = (page: string, params: Params): string | undefined => {
    const entry = byPage.get(page);
    return entry === undefined ? undefined : fill(entry.pattern, params);
  };
  const chain = (page: string): ReadonlyArray<string> => {
    const seen = new Set<string>();
    const up: string[] = [];
    for (let at: string | undefined = page; at !== undefined && !seen.has(at); at = byPage.get(at)?.row.parent) {
      seen.add(at);
      up.unshift(at);
    }
    return up[0] === home || !byPage.has(home) ? up : [home, ...up];
  };
  return { match, href, chain };
};

export const Router = { make } as const;
