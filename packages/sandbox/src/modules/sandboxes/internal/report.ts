import { Effect } from "effect";
import type { Left, Listed, SeenSandbox } from "../types.ts";
import type { Live, Shared } from "./live.ts";
import { readHits } from "./hits.ts";
import { alive } from "./spawn.ts";

const listed = (live: Live): Listed => ({ sandbox: live.id, owner: live.owner, tag: live.tag, state: live.state, root: live.root });

export const listIn = (shared: Shared, tag: string | undefined): ReadonlyArray<Listed> =>
  [...shared.all.values()].filter((l) => l.state === "open" && (tag === undefined || l.tag === tag)).map(listed);

/** Every sandbox the bridge has held (closed ones too, so a check can read what they saw), with the shims' latest refusals folded in first. */
export const seenIn = (shared: Shared, only: string | undefined): Effect.Effect<ReadonlyArray<SeenSandbox>> =>
  Effect.gen(function* () {
    const all = [...shared.all.values()].filter((l) => only === undefined || l.id === only);
    for (const live of all) if (live.state === "open") yield* readHits(shared, live);
    return all.map((l) => ({
      sandbox: l.id, owner: l.owner, tag: l.tag, root: l.root, state: l.state, env: l.env,
      execs: l.execs.map((e) => ({ command: e.command, exit: e.exit, lent: e.lent })),
      refusals: l.refusals.map((r) => ({ name: r.name, detail: r.detail })),
      loans: l.loans.map((x) => ({ ...x })),
    }));
  });

/** What is on this machine of the bridge's work: the folders in `<dir>/sandboxes`, and each process it started that is still alive. */
export const leftIn = (shared: Shared): Effect.Effect<Left> =>
  Effect.gen(function* () {
    const root = `${shared.config.dir}/sandboxes`;
    const folders = (yield* shared.disk.names(root)).map((name) => `${root}/${name}`);
    const processes: Array<{ pid: number; sandbox: string; command: string }> = [];
    for (const live of shared.all.values()) {
      const pids: ReadonlyArray<readonly [number, string]> = [[live.relay.pid, "pi-env serve"], ...[...live.running].map((pid) => [pid, "exec"] as const)];
      for (const [pid, command] of pids) if (yield* alive(pid)) processes.push({ pid, sandbox: live.id, command });
    }
    return { folders, processes };
  });
