import type { Address } from "@orthograph/chain-evm/device";

/**
 * Where Zodiac's deployment puts each contract on every public chain, and so where `install` puts it on a world's Anvil.
 * The libraries are the ones the Roles 2.1.1 mastercopy is linked to; how the deployment reproduces is in ../README.md.
 */
export const canonical: Readonly<Record<"factory" | "mastercopy" | "integrity" | "packer", Address>> = {
  factory: "0x000000000000aDdB49795b0f9bA5BC298cDda236",
  mastercopy: "0xF2964CE6161ce0e75964Fe7927cE114cb0B283D5",
  integrity: "0x6a6Af4b16458Bc39817e4019fB02BD3b26d41049",
  packer: "0x869718C939652084BC491fBC5ce0D3C1d5B309F0",
};
