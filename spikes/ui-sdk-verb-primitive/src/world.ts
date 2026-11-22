// A stand-in for the generated SDK and its server, NOT the real thing: it keeps claimed names in memory and refuses
// as handle.claim's declared errors do. The spike's question is about the page, so the server half is out of scope.
import type { Outcome } from "./runtime.ts";

export type Call = { readonly verb: string; readonly payload: unknown; readonly via: string };

export const makeWorld = () => {
  const claimed = new Map<string, string>();
  const calls: Call[] = [];
  return {
    calls,
    claimed,
    handleClaim: (payload: { name: string }, meta: { via: string }): Promise<Outcome<{ handle: string }>> => {
      calls.push({ verb: "handle.claim", payload, via: meta.via });
      if (claimed.has(payload.name)) {
        return Promise.resolve({ ok: false, refusal: { name: "HandleTaken", code: "HN-001" } });
      }
      const handle = `hdl_${(claimed.size + 1).toString(36)}`;
      claimed.set(payload.name, handle);
      return Promise.resolve({ ok: true, answer: { handle } });
    },
  };
};
