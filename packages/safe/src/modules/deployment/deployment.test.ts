import { describe, expect, test } from "vitest";
import { SafeDeployment } from "../../main.ts";
import { CANON, keccak } from "../world/internal/testing.ts";

// Expected values: the issue's infrastructure citations (#1161) and @safe-global/safe-deployments 1.37.67 (v1.4.1, canonical),
// @safe-global/safe-modules-deployments 3.0.14 (safe-4337-module v0.3.0), @safe-global/safe-contracts 1.4.1-build.0 (SafeProxy).
describe("SafeDeployment, Safe 1.4.1 with the 4337 module v0.3.0", () => {
  test("is the whole deployment, at the canonical checksummed addresses", () => {
    expect(SafeDeployment).toStrictEqual({
      version: "1.4.1",
      proxyFactory: CANON.proxyFactory,
      singleton: CANON.singleton,
      moduleSetup: CANON.moduleSetup,
      safe4337Module: CANON.safe4337Module,
      multiSend: CANON.multiSend,
      multiSendCallOnly: CANON.multiSendCallOnly,
      entryPoint: CANON.entryPoint,
      proxyCreationCode: expect.stringMatching(/^0x[0-9a-f]+$/),
      codeHashes: {
        proxyFactory: "0x50c3cdc4074750a7a974204a716c999edd37482f907608d960b2b025ee0b3317",
        singleton: "0xb1f926978a0f44a2c0ec8fe822418ae969bd8c3f18d61e5103100339894f81ff",
        multiSend: "0x0e4f7fc66550a322d1e7688e181b75e217e662a4f3f4d6a29b22bc61217c4b77",
        multiSendCallOnly: "0xecd5bd14a08c5d2122379900b2f272bdf107a7e92423c10dd5fe3254386c9939",
      },
    });
  });

  test("the proxy creation code is SafeProxy 1.4.1's, pinned (infrastructure:P/safe-contracts.ts:59-69)", () => {
    expect((SafeDeployment.proxyCreationCode.length - 2) / 2).toBe(486);
    expect(keccak(SafeDeployment.proxyCreationCode)).toBe("0x1856e0ee08399d74e0ea0b03adca210aeade6f748969ac023cdcb4dd62dcaf5f");
  });
});
