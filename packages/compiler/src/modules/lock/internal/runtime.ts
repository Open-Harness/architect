// The runtime's refusals in the lock: owned by `runtime`, declared in no file (M6-chain item 4).
import type { LockValue, Wanted } from "../types.ts";

const WHOLE: LockValue = { value: "uint", bits: 256 };

/** Each runtime refusal, its code and the fields it carries. AR-001 and AR-002 are Effect's; AR-003 to AR-006 are the chain's. */
const RUNTIME: ReadonlyArray<readonly [name: string, code: string, fields: Readonly<Record<string, LockValue>>]> = [
  ["NotAllowed", "AR-001", {}],
  ["IdempotencyConflict", "AR-002", {}],
  ["SignatureExpired", "AR-003", { deadline: WHOLE }],
  ["InvalidNonce", "AR-004", { expected: WHOLE, got: WHOLE }],
  ["BadSignature", "AR-005", {}],
  ["AlreadyExists", "AR-006", { id: { value: "text", max: 32 } }],
];

/** The runtime's refusals a project has: the chain's four only when it has a chain store. */
export const runtimeWanted = (chain: boolean): ReadonlyArray<Wanted> =>
  RUNTIME.filter(([, code]) => chain || code <= "AR-002").map(([name, code, fields]) => ({ name, owner: "runtime", fields, code, prefix: "AR" }));
