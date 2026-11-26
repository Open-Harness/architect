// `@orthograph/safe`: the Safe adapter (CX-safe, unit A3, #1161), laid out as `ortho new adapter --from-abi` (A1, #1164) makes one:
// `abi/<Contract>.json` and `src/generated/` (the Safe's calls, reads and events) are the generator's, and what lies beyond the
// ABI is hand-written beside them in `src/modules/`. The builder adds the descriptor and `export * from "./generated/index.ts"`.
export { SafeDeployment } from "./modules/deployment/service.ts";
export type { SafeDeploymentInfo } from "./modules/deployment/types.ts";
export { SafeAddress } from "./modules/address/service.ts";
export type { PredictInput, SafeAddressApi } from "./modules/address/types.ts";
export { SafeTx } from "./modules/safe-tx/service.ts";
export type { SafeCallInput, SafeOperation, SafeTransaction, SafeTxApi, SafeTxField, SafeTxTypedData } from "./modules/safe-tx/types.ts";
export { SafeWorld } from "./modules/world/service.ts";
export type { SafeWorldApi } from "./modules/world/types.ts";
export { SafeRefusal } from "./modules/refusal/service.ts";
export { SafeRefused, type SafeRefusalApi } from "./modules/refusal/types.ts";
