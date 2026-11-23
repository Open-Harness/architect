import type { FollowerHealth } from "../types.ts";

/** What an error may say in a record anyone can read: no URL (it may hold credentials) and no 32-byte hex (it may be a key). */
export const scrub = (text: string): string => text.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "<url>").replace(/0x[0-9a-fA-F]{64}/g, "<hex>").slice(0, 300);

/** The tag of an error as the follower names it: Effect's `_tag`, with chain-evm's `kind` when it has one. */
export const tagOf = (error: unknown): string => {
  const e = error as { readonly _tag?: unknown; readonly kind?: unknown } | null;
  const tag = typeof e?._tag === "string" ? e._tag : error instanceof Error ? error.name : "Error";
  return typeof e?.kind === "string" ? `${tag}:${e.kind}` : tag;
};

export const failed = (before: FollowerHealth | undefined, error: unknown, at: number): FollowerHealth => ({
  failures: (before?.failures ?? 0) + 1,
  lastError: { tag: tagOf(error), message: scrub(error instanceof Error ? error.message : String(error)), at },
});

interface Source { readonly chainId: number; readonly contract: string; readonly address: string; readonly event: unknown; readonly fromBlock: string }
/** The same source means the same stream: a different one starts over (M6-chain item 12, the lead's decision). */
export const sameSource = (a: Source, b: Source): boolean =>
  a.chainId === b.chainId && a.contract === b.contract && a.address === b.address && a.fromBlock === b.fromBlock && JSON.stringify(a.event) === JSON.stringify(b.event);
