import { Effect } from "effect";
import type { TestTokenApi } from "./types.ts";

// Empty handler: the checks (`test-token.test.ts`, `../erc20/anvil.test.ts`) are red until the build lands (#1162).
export const TestToken: TestTokenApi = {
  decimals: 6,
  deploy: () => Effect.die("erc20: the test token is not built (#1162)"),
};
