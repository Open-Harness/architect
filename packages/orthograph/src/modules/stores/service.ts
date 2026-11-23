import type { Store, StoresApi } from "./types.ts";

const of = <const K extends string>(kind: K): Store<K> => Object.freeze({ kind: "store", of: kind });

export const Stores: StoresApi = {
  store: Object.freeze({ database: () => of("database"), actor: () => of("actor"), kind: of }),
};
