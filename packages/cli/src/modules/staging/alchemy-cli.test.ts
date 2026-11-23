// The Alchemy CLI the real tools start, and what its words keep and hide. The verbs themselves are in staging.test.ts.
import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";

const credentials = { token: "token-for-the-test", account: "account-for-the-test" };

describe("the Alchemy CLI the real tools start", () => {
  it("is a file that exists, the one in Alchemy's own package", async () => {
    const { alchemyBin } = await import("./internal/alchemy-bin.ts");
    expect(existsSync(alchemyBin)).toBe(true);
    expect(alchemyBin.endsWith("/alchemy/bin/cli.js")).toBe(true);
  });

  it("keeps the line that names a missing module, and still hides the credentials", async () => {
    const { clip } = await import("./internal/stack.ts");
    const trace = ["Error: Cannot find module '/x/token-for-the-test/missing.js'", ...Array.from({ length: 10 }, (_, i) => `    at frame ${i}`), "Node.js v24"].join("\n");
    const said = clip(trace, credentials);
    expect(said).toContain("Cannot find module");
    expect(said).toContain("missing.js");
    expect(said).not.toContain("token-for-the-test");
    expect(said).toContain("[token]");
  });
});
