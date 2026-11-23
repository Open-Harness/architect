// What the relayer keeps in its own SQLite so a restart forgets nothing: its configuration, and one row per submission with the signed
// bytes of its transaction (public: the key is not in them). The key itself is never written. A row's hash never changes: the relayer
// sends the same bytes again, it does not replace them.
import type { Hex } from "@orthograph/chain-evm/device";
import type { RelayerConfig } from "../types.ts";

/**
 * `submitting` is written before the send, so a crash cannot orphan a transaction: the alarm finds out whether the node has it.
 * `lost` is a submission whose nonce another call took: nothing can send it again, and it answers as `dropped`.
 */
export type Kept = "submitting" | "submitted" | "included" | "reverted" | "dropped" | "lost";

export interface Row {
  readonly id: string;
  readonly nonce: number;
  readonly state: Kept;
  readonly hash: Hex;
  /** The signed bytes, or `0x` for a row that holds its nonce for a fill and has no transaction yet. */
  readonly serialized: Hex;
  readonly fromBlock: bigint;
  /** The call could not be sent: this row holds its nonce, and its transaction is a zero-value transfer from the relayer to itself. */
  readonly fill: boolean;
  /** Why the last attempt to send this again failed, or empty. */
  readonly note: string;
  /** When the row was written, in epoch milliseconds on the Clock: how long it has been pending is read from this. */
  readonly createdAt: number;
}

interface Raw extends Record<string, SqlStorageValue> {
  id: string; nonce: number; state: Kept; hash: string; serialized: string; from_block: string; fill: number; note: string; created_at: number;
}

const SCHEMA = [
  "CREATE TABLE IF NOT EXISTS config (one INTEGER PRIMARY KEY CHECK (one = 1), json TEXT NOT NULL)",
  `CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY, nonce INTEGER NOT NULL, state TEXT NOT NULL, hash TEXT NOT NULL, serialized TEXT NOT NULL,
    from_block TEXT NOT NULL, fill INTEGER NOT NULL DEFAULT 0, note TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL DEFAULT 0)`,
  "CREATE INDEX IF NOT EXISTS submissions_open ON submissions (state, nonce)",
];

const OPEN = "state IN ('submitting', 'submitted', 'dropped')";
const rowOf = (raw: Raw): Row => ({
  id: raw.id, nonce: raw.nonce, state: raw.state, hash: raw.hash as Hex, serialized: raw.serialized as Hex,
  fromBlock: BigInt(raw.from_block), fill: raw.fill === 1, note: raw.note, createdAt: raw.created_at,
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
      sql.exec("INSERT INTO submissions (id, nonce, state, hash, serialized, from_block, fill, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        row.id, row.nonce, row.state, row.hash, row.serialized, row.fromBlock.toString(), row.fill ? 1 : 0, row.note, row.createdAt);
    },
    setState: (id: string, state: Kept) => { sql.exec("UPDATE submissions SET state = ? WHERE id = ?", state, id); },
    /** The node accepted it: it is `submitted`, from this block. */
    sent: (id: string, fromBlock: bigint) => { sql.exec("UPDATE submissions SET state = 'submitted', from_block = ?, note = '' WHERE id = ?", fromBlock.toString(), id); },
    /** The call was signed: its bytes join the row that has held its nonce since `prepare`. */
    bytes: (id: string, hash: Hex, serialized: Hex) => { sql.exec("UPDATE submissions SET hash = ?, serialized = ? WHERE id = ?", hash, serialized, id); },
    /** The call can no longer be sent: the row keeps its nonce, without bytes, for the alarm to fill. */
    toFill: (id: string, note: string) => { sql.exec("UPDATE submissions SET fill = 1, state = 'submitting', serialized = '0x', note = ? WHERE id = ?", note, id); },
    /** The fill was signed and sent (or may have been): it is the row's transaction now. */
    filled: (id: string, hash: Hex, serialized: Hex, fromBlock: bigint) => {
      sql.exec("UPDATE submissions SET state = 'submitted', fill = 1, hash = ?, serialized = ?, from_block = ?, note = '' WHERE id = ?", hash, serialized, fromBlock.toString(), id);
    },
    note: (id: string, note: string) => { sql.exec("UPDATE submissions SET note = ? WHERE id = ?", note, id); },
  };
};

export type Store = ReturnType<typeof makeStore>;
