// After every Gate 2 check: nothing of Orthograph's is left running (K10 section 8, M1.33: no Docker, so no `docker ps`).
// The run gets a run folder of its own, and every process the framework starts (the Collector, an issuer, a registry) leaves a
// marker with its PID there. What the markers still name alive at the end, running the command it was started with, is a leak:
// it is stopped, and the run fails. Other runs on the machine have folders of their own, so they never look like a leak here.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Effect } from "effect";
import { Owned } from "@orthograph/services";

export default function setup() {
  const dir = mkdtempSync(join(tmpdir(), "ortho-layer2-run-"));
  process.env["ORTHO_RUN_DIR"] = dir;
  return async () => {
    const left = await Effect.runPromise(Owned.sweep(dir));
    rmSync(dir, { recursive: true, force: true });
    if (left.length > 0) throw new Error(`left behind: ${left.map((m) => `${m.kind} ${m.pid}`).join(", ")}`);
  };
}
