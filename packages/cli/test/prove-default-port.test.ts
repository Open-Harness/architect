// S-25: `ortho prove` with no --port runs on a free port the system picks (the flag defaults to 0), so a world another
// session left on the old fixed default, 8799, can't be mistaken for its own. Run as a real process, so the flag's
// default itself is what is tested.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repo = resolve(import.meta.dirname, "../../..");
const main = resolve(repo, "packages/cli/src/main.ts");
const acme = resolve(repo, "examples/acme");

const run = (args: ReadonlyArray<string>) =>
  new Promise<{ readonly out: string; readonly status: number | null }>((done) => {
    const child = spawn("node", [main, ...args], { cwd: repo });
    let out = "";
    child.stdout.on("data", (chunk) => (out += String(chunk)));
    child.once("close", (status) => done({ out, status }));
  });

describe("ortho prove, with no --port", () => {
  it("runs its own world while something else holds 8799", { timeout: 180_000 }, async () => {
    const held = createServer((_, res) => { res.writeHead(200, { "content-type": "application/json" }); res.end("{}"); });
    // Another session may already hold it: that is the situation tested, so either way it is held.
    await new Promise<void>((ok) => { held.once("error", () => ok()); held.listen(8799, "127.0.0.1", () => ok()); });
    try {
      const proved = await run(["prove", "--root", acme, "--only", "grant an allowance"]);
      expect(proved.out).toContain("journey grant an allowance ✔ 4/4 steps");
      expect(proved.out).not.toContain("telemetry missing");
    } finally {
      held.close();
    }
  });
});
