// After every check: no process of Orthograph's is left running (K10 section 8, M1.33: no Docker, so no `docker ps`).
// Every process the framework starts (the Collector, an issuer, a registry) leaves a marker with its PID in the run folder.
// The run gets a folder of its own; what its markers still name alive at the end, running the command it was started with, is a
// leak: it is stopped, and the run fails.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { Owned } from "@orthograph/services";

export default function setup() {
  const dir = mkdtempSync(join(tmpdir(), "ortho-layer1-run-"));
  // Workers and every command they start inherit it.
  process.env["ORTHO_RUN_DIR"] = dir;
  return async () => {
    const left = await Effect.runPromise(Owned.sweep(dir));
    rmSync(dir, { recursive: true, force: true });
    if (left.length > 0) throw new Error(`left running: ${left.map((m) => `${m.kind} ${m.pid}`).join(", ")}`);
  };
}
