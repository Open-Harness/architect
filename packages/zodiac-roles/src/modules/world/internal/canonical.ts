import type { Address } from "@orthograph/chain-evm/device";
import { MODULE_PROXY_FACTORY, ROLES_MASTERCOPY } from "../../roles/types.ts";

/**
 * Where Zodiac's deployment puts each contract on every public chain, and so where `install` puts it on a world's Anvil.
 * The libraries are the ones the Roles 2.1.1 mastercopy is linked to; how the deployment reproduces is in ../README.md.
 */
export const canonical: Readonly<Record<"factory" | "mastercopy" | "integrity" | "packer", Address>> = {
  factory: MODULE_PROXY_FACTORY,
  mastercopy: ROLES_MASTERCOPY,
  integrity: "0x6a6Af4b16458Bc39817e4019fB02BD3b26d41049",
  packer: "0x869718C939652084BC491fBC5ce0D3C1d5B309F0",
};
