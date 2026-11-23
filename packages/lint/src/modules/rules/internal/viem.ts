import { fileURLToPath } from "node:url";
import type { Rule } from "../types.ts";
import { everyImport } from "./imports.ts";

const CHAIN = fileURLToPath(new URL("../../../../../chain-evm/", import.meta.url));

export const noViemOutsideChain: Rule = {
  meta: { schema: [], docs: { description: "The EVM chain package owns all hand-written viem imports." } },
  create: (context) => {
    if (context.filename.startsWith(CHAIN)) return {};
    return everyImport((node, name) => {
      if (name === "viem" || name.startsWith("viem/")) {
        context.report({ node, message: "Import EVM functionality from @orthograph/chain-evm instead of viem" });
      }
    });
  },
};
