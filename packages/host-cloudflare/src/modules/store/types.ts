// The store on Cloudflare: D1 for things that live in the database, one Durable Object per instance for things that
// live as actors. Either way a call's writes and journal entries commit together, guarded by versions (D2 #35, #36).
import type { Layer } from "effect";
import type { SqlClient } from "effect/sql";
import type { D1Client } from "@effect/sql-d1";
import type { Store as Declared, Thing } from "orthograph";
import type { NamedRule, Store } from "@orthograph/language-effect";
import type { HopTable } from "#modules/outbox/types.js";

export interface StoreD1Options {
  /** Each thing and its table name; the generated server writes the list from the things' paths. */
  readonly tables: ReadonlyArray<readonly [Thing, string]>;
  /** The Durable Object namespace that holds one actor per instance, for things that `lives: "actor"`. */
  readonly actors?: DurableObjectNamespace;
  /**
   * Each declared database store and the D1 binding it lives in (K3). A thing that lives in one is read and committed
   * there, with its journal entries and request keys; a thing in no declared store lives in the default database,
   * `SqlClient`'s. One call commits to one store: writes to two are refused.
   */
  readonly stores?: ReadonlyArray<readonly [Declared, D1Database]>;
  /**
   * The thing the identity keeps (its `per_` ids are the identity's users, `Auth`'s contract) and the table the identity
   * keeps them in, both named by the generated server: read from there, never a table of its own, so the runtime finds a
   * person a payload names (K16, M1.46). Only its own fields are decoded. Reads by id only; the identity plugin (M2.05)
   * owns the rest.
   */
  readonly people?: { readonly thing: Thing; readonly table: string };
  /**
   * The model's rules (G5): each invariant of the project's things, with its full name (`handle.oneHolderPerName`). The database's partial unique index per rule
   * (made by the generated migration, named `<table>_<rule>`) refuses a second holder at commit; the store answers that as a `conflict`, and hands the rules to the
   * runtime, whose `findBy` and before-commit check look through the same ones.
   */
  readonly rules?: ReadonlyArray<NamedRule>;
  /**
   * The outbox (M5-reach-out Q1): each event's hops, by the event's name. A commit writes one `_outbox` row per hop of each entry, in the batch
   * that journals the entry, so an event and its rows commit together or not at all. The default database's event ids are `evt_<seq>`, and a declared
   * store's `evt_<n>_<seq>`, `n` its place in `stores`.
   */
  readonly outbox?: HopTable;
}

export interface StoreD1Api {
  readonly layer: (options: StoreD1Options) => Layer.Layer<Store, never, SqlClient.SqlClient | D1Client.D1Client>;
}
