// What the relayer keeps in its own SQLite so a restart forgets nothing: its configuration, and one row per submission with the
// signed bytes of its current transaction (public: the key is not in them). The key itself is never written.
import type { Hex } from "@orthograph/chain-evm/device";
import type { RelayerConfig } from "../types.ts";

/**
 * `submitting` is written before the send, so a crash cannot orphan a transaction: the alarm finds out whether the node has it.
 * `lost` is a submission whose nonce another call took, or whose bytes can no longer be read: nothing can send it again, and it
 * answers as `dropped`.
 */
export type Kept = "submitting" | "submitted" | "included" | "reverted" | "dropped" | "lost";

export interface Row {
  readonly id: string;
  readonly nonce: number;
  readonly state: Kept;
  readonly hash: Hex;
  readonly serialized: Hex;
  readonly replaces: ReadonlyArray<Hex>;
  readonly fromBlock: bigint;
  /** The most a replacement may pay per gas, fixed when the call was first sent. */
  readonly cap: bigint;
  /** The call failed for good, so this row holds its nonce and the alarm fills it with a zero-value transfer to the relayer itself. */
  readonly fill: boolean;
  /** Why the last attempt to send this again failed, or empty. */
  readonly note: string;
}

interface Raw extends Record<string, SqlStorageValue> {
  id: string; nonce: number; state: Kept; hash: string; serialized: string; replaces: string; from_block: string; cap: string; fill: number; note: string;
}

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS config (one INTEGER PRIMARY KEY CHECK (one = 1), json TEXT NOT NULL)",
  `CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY, nonce INTEGER NOT NULL, state TEXT NOT NULL, hash TEXT NOT NULL, serialized TEXT NOT NULL,
    replaces TEXT NOT NULL, from_block TEXT NOT NULL, cap TEXT NOT NULL, fill INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '')`,
  "CREATE INDEX IF NOT EXISTS submissions_open ON submissions (state, nonce)",
];

const OPEN = "state IN ('submitting', 'submitted', 'dropped')";
const rowOf = (raw: Raw): Row => ({
  id: raw.id, nonce: raw.nonce, state: raw.state, hash: raw.hash as Hex, serialized: raw.serialized as Hex,
  replaces: JSON.parse(raw.replaces) as Hex[], fromBlock: BigInt(raw.from_block), cap: BigInt(raw.cap), fill: raw.fill === 1, note: raw.note,
});

export const makeStore = (sql: SqlStorage) => {
  for (const statement of SCHEMA) sql.exec(statement);
  const all = (query: string, ...bindings: ReadonlyArray<SqlStorageValue>) => sql.exec<Raw>(query, ...bindings).toArray().map(rowOf);
  return {
    config: (): RelayerConfig | undefined => {
      const kept = sql.exec<{ json: string }>("SELECT json FROM config").toArray()[0];
      return kept === undefined ? undefined : (JSON.parse(kept.json) as RelayerConfig);
    },
    keep: (config: RelayerConfig) => { sql.exec("INSERT OR REPLACE INTO config (one, json) VALUES (1, ?)", JSON.stringify(config)); },
    find: (id: string) => all("SELECT * FROM submissions WHERE id = ?", id)[0],
    /** The submissions that may still change, lowest nonce first. */
    open: () => all(`SELECT * FROM submissions WHERE ${OPEN} ORDER BY nonce`),
    add: (row: Row) => {
      sql.exec("INSERT INTO submissions (id, nonce, state, hash, serialized, replaces, from_block, cap, fill, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        row.id, row.nonce, row.state, row.hash, row.serialized, JSON.stringify(row.replaces), row.fromBlock.toString(), row.cap.toString(), row.fill ? 1 : 0, row.note);
    },
    setState: (id: string, state: Kept) => { sql.exec("UPDATE submissions SET state = ? WHERE id = ?", state, id); },
    /** The node accepted it: it is `submitted`, from this block. */
    sent: (id: string, fromBlock: bigint) => { sql.exec("UPDATE submissions SET state = 'submitted', from_block = ?, note = '' WHERE id = ?", fromBlock.toString(), id); },
    /** The call failed for good: the row keeps its nonce to be filled. */
    fillIt: (id: string) => { sql.exec("UPDATE submissions SET fill = 1 WHERE id = ?", id); },
    note: (id: string, note: string) => { sql.exec("UPDATE submissions SET note = ? WHERE id = ?", note, id); },
    /** A new current transaction for the submission: the old hash joins `replaces`. */
    replace: (row: Row, hash: Hex, serialized: Hex, fromBlock: bigint) => {
      sql.exec("UPDATE submissions SET state = 'submitted', note = '', hash = ?, serialized = ?, replaces = ?, from_block = ? WHERE id = ?",
        hash, serialized, JSON.stringify([...row.replaces, row.hash]), fromBlock.toString(), row.id);
    },
  };
};

export type Store = ReturnType<typeof makeStore>;
