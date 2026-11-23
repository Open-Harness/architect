// Runs in node, once: an Anvil of this test run's own, for the tests that read a real chain from inside workerd. No Anvil on the machine: the URL is "" and those tests skip.
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext { anvilUrl: string }
}

const freePort = () => new Promise<number>((resolve) => {
  const server = createServer();
  server.listen(0, "127.0.0.1", () => { const { port } = server.address() as { port: number }; server.close(() => resolve(port)); });
});

export default async function setup(project: TestProject) {
  const bin = process.env["ORTHO_ANVIL_BIN"] ?? "anvil";
  if (spawnSync(bin, ["--version"]).error) { project.provide("anvilUrl", ""); return; }
  const port = await freePort();
  const child = spawn(bin, ["--silent", "--host", "127.0.0.1", "--port", String(port), "--chain-id", "31337"], { stdio: "ignore" });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 200; i++) {
    const up = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_chainId", params: [] }) }).then((r) => r.ok, () => false);
    if (up) break;
    await new Promise((done) => setTimeout(done, 100));
  }
  project.provide("anvilUrl", url);
  return () => { child.kill("SIGTERM"); };
}
