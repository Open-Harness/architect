// How the lock follows the blueprint: a name keeps its code, a new name takes the next number, a name that left is retired.
import type { Lock, LockEntry, Wanted, Wire } from "../types.ts";

/** A declared error is numbered below this: 900 is every machine's refusal and 901 its not-found (M6-chain item 4). */
const GENERATED = 900;

const numberOf = (code: string) => Number(code.slice(code.indexOf("-") + 1));
const prefixOf = (code: string) => code.slice(0, code.indexOf("-"));
const codeOf = (prefix: string, n: number) => `${prefix}-${String(n).padStart(3, "0")}`;
const byCode = <V>(m: Readonly<Record<string, V>>): Record<string, V> => Object.fromEntries(Object.entries(m).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
const sameWire = (a: Wire, b: Wire) => JSON.stringify(a) === JSON.stringify(b);

/** The entry for a wanted refusal: what the blueprint says now, and every wire identity the code had before kept in `earlier`. */
const entryOf = (w: Wanted, was: LockEntry | undefined): LockEntry => {
  const wire: Wire = { effect: { tag: w.name }, ...(was?.wire.solidity ? { solidity: was.wire.solidity } : {}) };
  const left = was && !sameWire(was.wire, wire) && was.wire.effect?.tag !== w.name ? [was.wire] : [];
  const earlier = [...(was?.earlier ?? []), ...left.filter((l) => !(was?.earlier ?? []).some((e) => sameWire(e, l)))];
  return { name: w.name, owner: w.owner, ...(w.from === undefined ? {} : { from: w.from }), fields: w.fields, wire, earlier };
};

/** The lock after the blueprint, and the code each wanted refusal got (in the order asked: two that claim one code are both told it). */
export const assign = (before: Lock, wanted: ReadonlyArray<Wanted>): { readonly lock: Lock; readonly codes: ReadonlyArray<string> } => {
  const codes: Array<string> = [];
  const live: Record<string, LockEntry> = {};
  const retired: Record<string, LockEntry> = { ...before.retired };
  /** Every code the lock has ever held or this pass has given: a declared error's next number is above all of them. */
  const used = new Set([...Object.keys(before.refusals), ...Object.keys(before.retired)]);
  const taken = (code: string) => code in live;
  const find = (w: Wanted): { readonly code: string; readonly was: LockEntry | undefined } => {
    if (w.code !== undefined) return { code: w.code, was: before.refusals[w.code] ?? retired[w.code] };
    // By name, owner and number, not prefix: a code that shipped is a promise clients match on, so it outlives its thing's prefix.
    const holds = (e: LockEntry, code: string) => e.name === w.name && e.owner === w.owner && numberOf(code) < GENERATED;
    const there = Object.entries(before.refusals).find(([c, e]) => holds(e, c) && !taken(c)) ?? Object.entries(retired).find(([c, e]) => holds(e, c) && !taken(c));
    if (there) return { code: there[0], was: there[1] };
    const top = [...used].filter((c) => prefixOf(c) === w.prefix && numberOf(c) < GENERATED).reduce((m, c) => Math.max(m, numberOf(c)), 0);
    return { code: codeOf(w.prefix, top + 1), was: undefined };
  };
  for (const w of wanted) {
    const { code, was } = find(w);
    codes.push(code);
    used.add(code);
    delete retired[code];
    live[code] = entryOf(w, was);
  }
  // The runtime's refusals stay as they are; any other that no longer has a name in the blueprint is retired as it was.
  for (const [code, e] of Object.entries(before.refusals)) {
    if (code in live) continue;
    if (e.owner === "runtime") live[code] = e;
    else retired[code] = e;
  }
  return { lock: { refusals: byCode(live), retired: byCode(retired) }, codes };
};

export const evolve = (before: Lock, wanted: ReadonlyArray<Wanted>): Lock => assign(before, wanted).lock;
