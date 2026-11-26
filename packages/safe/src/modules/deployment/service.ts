import type { SafeDeploymentInfo } from "./types.ts";

const NONE = "0x0000000000000000000000000000000000000000";
const NO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000";

/** Empty: every field is a placeholder until the build lands (`deployment.test.ts`). */
export const SafeDeployment: SafeDeploymentInfo = {
  version: "1.4.1",
  proxyFactory: NONE,
  singleton: NONE,
  moduleSetup: NONE,
  safe4337Module: NONE,
  multiSend: NONE,
  multiSendCallOnly: NONE,
  entryPoint: NONE,
  proxyCreationCode: "0x",
  codeHashes: { proxyFactory: NO_HASH, singleton: NO_HASH, multiSend: NO_HASH, multiSendCallOnly: NO_HASH },
};
