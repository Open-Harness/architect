// What a change to the model means for the version (D3 #1): an added operation or read is minor; a changed payload, answer
// or error set (or a removed operation) is major; anything else, a budget or the docs, is a patch.
import { canonical } from "#modules/model/service.js";
import type { Model } from "#modules/model/types.js";
import type { Bump, Change, Release, Versioned } from "../types.ts";
import { assetBumps } from "./assets.ts";
import { thingBumps } from "./chain.ts";
import { diff } from "./diff.ts";

const RANK: Readonly<Record<Bump, number>> = { patch: 0, minor: 1, major: 2 };

/** The parts of an operation that callers depend on: what goes in, what comes out, and what it can refuse with. */
const BREAKING = new Set(["payload", "answer", "errors", "refusals"]);
/** Parts that move with the file or the hash, saying nothing of what the operation is. */
const QUIET = new Set(["file", "identifier"]);

const keysOf = (x: unknown): ReadonlyArray<string> => (Array.isArray(x) ? x.map(String) : typeof x === "object" && x !== null ? Object.keys(x) : []);

/** `memo removed, to added`: how a payload, an answer or an error list differs, by name. */
const detailOf = (part: string, before: unknown, after: unknown): string | undefined => {
  if (part === "budget") {
    const ms = (b: unknown) => (typeof b === "object" && b !== null ? `${(b as { p95Ms: number }).p95Ms}ms` : "none");
    return `${ms(before)} to ${ms(after)}`;
  }
  if (!BREAKING.has(part)) return undefined;
  const a = keysOf(before);
  const b = keysOf(after);
  const said = [
    ...a.filter((k) => !b.includes(k)).map((k) => `${k} removed`),
    ...b.filter((k) => !a.includes(k)).map((k) => `${k} added`),
    ...b.filter((k) => a.includes(k) && canonical((before as Record<string, unknown>)[k]) !== canonical((after as Record<string, unknown>)[k])).map((k) => `${k} changed`),
  ];
  return said.length > 0 ? said.join(", ") : "changed";
};

const entriesOf = (change: Change, before: Model, after: Model): ReadonlyArray<Versioned> => {
  if (change.kind !== "operation") {
    // A thing or a value moves nothing a caller sees by itself: what an operation takes or gives shows in its own entry.
    // On a chain it does: a row's states and amounts are what it means for good (M6-chain item 2).
    const quiet: Versioned = { kind: change.change, what: `${change.kind === "thing" ? "thing:" : "value:"}${change.name}`, bump: "patch" };
    return change.kind === "thing" && change.change === "changed" ? [quiet, ...thingBumps(change.name, before, after)] : [quiet];
  }
  if (change.change === "added") return [{ kind: "added", what: change.name, bump: "minor" }];
  if (change.change === "removed") return [{ kind: "removed", what: change.name, bump: "major" }];
  const was = before.operations[change.name] as unknown as Record<string, unknown>;
  const now = after.operations[change.name] as unknown as Record<string, unknown>;
  return change.parts.filter((p) => !QUIET.has(p)).map((part): Versioned => {
    const detail = detailOf(part, was[part], now[part]);
    return { kind: "changed", what: `${change.name}.${part}`, ...(detail ? { detail } : {}), bump: BREAKING.has(part) ? "major" : "patch" };
  });
};

/**
 * A refusal code that shipped is a promise (L2.P): clients match on `[AL-002]`. One that changed, or went away with its
 * refusal, is major. A new refusal's code is new, and moves nothing.
 */
const movedCodes = (before: Model, after: Model): ReadonlyArray<Versioned> =>
  Object.entries(before.refusals ?? {}).flatMap(([name, code]): ReadonlyArray<Versioned> => {
    const now = after.refusals?.[name];
    return now === code ? [] : [{ kind: now === undefined ? "removed" : "changed", what: `refusal:${name}`, detail: now === undefined ? `${code} removed` : `${code} to ${now}`, bump: "major" }];
  });

/**
 * Everything that differs between two models, each with what it does to the version, and the largest of them.
 * Nothing different still makes a release (a rebuilt revision, never an identical version), so it is a patch.
 */
export const release = (before: Model, after: Model): Release => {
  const changes = [...diff(before, after).flatMap((c) => entriesOf(c, before, after)), ...movedCodes(before, after), ...assetBumps(before, after)];
  const bump = changes.reduce<Bump>((top, c) => (RANK[c.bump] > RANK[top] ? c.bump : top), "patch");
  return { bump, changes };
};

const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

/** The version after `last` for `bump`: `1.0.0` when there is no release yet; undefined when `last` is not a plain `x.y.z`. */
export const next = (last: string | undefined, bump: Bump): string | undefined => {
  if (last === undefined) return "1.0.0";
  const m = SEMVER.exec(last);
  if (!m) return undefined;
  const [major, minor, patch] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return bump === "major" ? `${major + 1}.0.0` : bump === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
};
