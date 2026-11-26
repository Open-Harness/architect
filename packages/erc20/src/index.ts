// Scaffolded from abi/. Yours from now on.
import { Blueprint } from "orthograph";
import { calls, standIn } from "./generated/index.ts";

export default Blueprint.adapter({
  description: "erc20: an ERC-20's calls, events and ERC-6093 reverts, typed; its stand-in is a 6-decimal test token, like USDC.",
  calls,
  standIn,
});

export * from "./generated/index.ts";
