import { Effect } from "effect";
import { Signers } from "../../signer/service.ts";
import type { LabelBook } from "../../signer/types.ts";

const KEY = "orthograph.wallets.labels";

/** The part of the page's `localStorage` a wallet uses. */
export interface PageStorage {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
}

/** Labels in the page's storage when it has any, in memory when it has none (a private window, a test). */
export const labelsIn = (storage: PageStorage | undefined, memory: Map<string, string>): LabelBook =>
  storage === undefined
    ? Signers.labelsInMemory(memory)
    : {
      read: Effect.sync(() => {
        const text = storage.getItem(KEY);
        return text === null ? {} : (JSON.parse(text) as Record<string, string>);
      }).pipe(Effect.orElseSucceed(() => ({}))),
      write: (book) => Effect.sync(() => storage.setItem(KEY, JSON.stringify(book))).pipe(Effect.orElseSucceed(() => undefined)),
    };
