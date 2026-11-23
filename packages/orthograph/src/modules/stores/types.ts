// Stores: where a thing lives (K3). One file per store in `blueprint/stores/`, named by its path.
/**
 * A place a thing can live: Orthograph owns its schema and every write goes through Orthograph's commit. The kind
 * says which host supplies it (`database` and `actor` on Cloudflare); it is open, so a host or a language adds one
 * without a change here. The declaration has no name: the file's name is the store's.
 */
export interface Store<K extends string = string> {
  readonly kind: "store";
  readonly of: K;
}

export interface StoresApi {
  readonly store: {
    /** A database with a version column: D1 on Cloudflare. */
    readonly database: () => Store<"database">;
    /** A Durable Object per instance, with its own SQLite. */
    readonly actor: () => Store<"actor">;
    /** A kind some host or language supplies, such as `chain`: the compiler refuses a kind the project's host doesn't supply. */
    readonly kind: <const K extends string>(of: K) => Store<K>;
  };
}
