import type { FollowerHealth } from "../types.ts";

const SENTENCES: Readonly<Record<string, string>> = {
  "FollowerFault:unconfigured": "the follower is not configured",
  "FollowerFault:sink-refused": "the sink refused a change",
  "FollowerFault:sink-answer": "the sink answered something other than accepted or seen",
  "FollowerFault:sink-timeout": "the sink did not answer in time",
  "ChainFault:transport": "the RPC could not be reached",
  "ChainFault:timeout": "the RPC did not answer in time",
  "ChainFault:reorg": "the chain changed during the read, or reorganised deeper than the checkpoint's window",
  "ChainFault:configuration": "the chain settings are not valid",
  "ChainFault:event": "an event of the contract could not be decoded",
  "ChainFault": "the chain could not be read",
  "FollowerFault": "the follower could not take a step",
};
const KINDS = new Set(["transport", "timeout", "reorg", "configuration", "event", "unsupported", "resource", "rejected", "unsimulated", "unconfigured", "sink-refused", "sink-answer", "sink-timeout"]);

/** The fault as an allow-list: a known tag, a known kind, and the sentence that goes with them. Nothing the error said is kept. */
export const classify = (error: unknown): { readonly tag: string; readonly kind?: string; readonly message: string } => {
  const e = error as { readonly _tag?: unknown; readonly kind?: unknown } | null;
  const tag = e?._tag === "ChainFault" || e?._tag === "FollowerFault" ? e._tag : "Unknown";
  const kind = typeof e?.kind === "string" && KINDS.has(e.kind) ? e.kind : undefined;
  return { tag, ...(kind === undefined ? {} : { kind }), message: SENTENCES[`${tag}:${kind}`] ?? SENTENCES[tag] ?? "the follower met an error it does not name" };
};

export const failed = (before: FollowerHealth | undefined, error: unknown, at: number): FollowerHealth => ({
  failures: (before?.failures ?? 0) + 1,
  lastError: { ...classify(error), at },
});

interface Source { readonly chainId: number; readonly contract: string; readonly address: string; readonly event: unknown; readonly fromBlock: string }
/** The same source means the same stream: a different one starts over (M6-chain item 12, the lead's decision). */
export const sameSource = (a: Source, b: Source): boolean =>
  a.chainId === b.chainId && a.contract === b.contract && a.address === b.address && a.fromBlock === b.fromBlock && JSON.stringify(a.event) === JSON.stringify(b.event);
