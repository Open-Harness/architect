// @orthograph/erc20: an ERC-20's `transfer`, `balanceOf` and `Transfer` event, typed, and a test token for worlds (#1162,
// CX-safe unit A2). Hand-written to the shape `ortho new adapter --from-abi` (#1164) will generate; regenerated when it lands.
export { Erc20 } from "./modules/erc20/service.ts";
export {
  ERC20InsufficientBalance, ERC20InvalidReceiver,
  type Erc20Api, type Erc20Refusal, type Erc20Token, type TransferArgs, type TransferEvent,
} from "./modules/erc20/types.ts";
export { TestToken } from "./modules/test-token/service.ts";
export type { TestTokenApi, TestTokenOptions } from "./modules/test-token/types.ts";
