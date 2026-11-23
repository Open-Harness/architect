import { Names } from "orthograph/server";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import type { Judged, Ledger, Proof } from "../types.ts";

export const ledgerPath = (root: string) => join(root, Names.folder, "evidence/proven.json");

const record = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const judged = (x: unknown): x is Judged => record(x) && typeof x["inputs"] === "string" && typeof x["passed"] === "boolean";
const entries = (x: unknown, ok: (v: unknown) => boolean) => record(x) && Object.values(x).every(ok);

/** The `changed` section, or undefined when it is not one: a partial or old record is no record. */
const proofOf = (x: unknown): Proof | undefined =>
  record(x) && entries(x["files"], (v) => typeof v === "string") && entries(x["journeys"], judged) && entries(x["operations"], judged) ? (x as unknown as Proof) : undefined;

/** The ledger on disk; a file that is not JSON, or not a ledger, is as good as none. A `changed` section that is malformed is dropped. */
export const readLedger = (root: string): Ledger | undefined => {
  if (!existsSync(ledgerPath(root))) return undefined;
  const read = Effect.runSync(Effect.try(() => JSON.parse(readFileSync(ledgerPath(root), "utf8")) as unknown).pipe(Effect.orElseSucceed(() => undefined)));
  if (!record(read) || !record(read["model"]) || !record(read["proven"])) return undefined;
  const { changed, ...rest } = read;
  const proof = proofOf(changed);
  return { ...(rest as unknown as Ledger), ...(proof === undefined ? {} : { changed: proof }) };
};

export const writeLedger = (root: string, ledger: Ledger) => {
  mkdirSync(dirname(ledgerPath(root)), { recursive: true });
  writeFileSync(ledgerPath(root), JSON.stringify(ledger, null, 2) + "\n");
};
