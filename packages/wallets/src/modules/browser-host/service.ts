import { ConfigProvider, Effect } from "effect";
import { Chain } from "../chain/service.ts";
import { Signers } from "../signer/service.ts";
import type { Eip1193 } from "../signer/types.ts";
import type { BrowserHostApi } from "./types.ts";
import { labelsIn, type PageStorage } from "./internal/labels.ts";

interface Page {
  readonly ethereum?: Eip1193;
  readonly ORTHOGRAPH_WALLET?: Record<string, string | undefined>;
  readonly localStorage?: PageStorage;
}

/** What a page without storage keeps for as long as the page lives. */
const memory = new Map<string, string>();

export const BrowserHost: BrowserHostApi = {
  signer: (name) =>
    Effect.gen(function* () {
      const page = globalThis as Page;
      const chain = yield* Chain.fromHost.pipe(Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnvRecord(page.ORTHOGRAPH_WALLET ?? {}))));
      if (name !== "browser") return Signers.absent(name, chain, name === "node" ? "its keys are a file on a person's machine" : name === "keystore" ? "its keys live on a server" : "it exists only in a world");
      if (page.ethereum === undefined) return Signers.absent(name, chain, "the page has no wallet (window.ethereum)");
      return Signers.provided(name, chain, page.ethereum, labelsIn(page.localStorage, memory));
    }),
};
