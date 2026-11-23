import type { Address } from "viem";
export type { Address };
export { mainnet } from "viem/chains";
export type Client = import("viem").PublicClient;
export const accounts = () => import("viem/accounts");
