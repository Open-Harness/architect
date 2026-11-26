import { resolve } from "node:path";
import type { HandoffApi } from "./types.ts";
import { binOf, installedCli, same } from "./internal/find.ts";

export const Handoff: HandoffApi = {
  from: (args, cwd) => {
    const at = args.findIndex((a) => a === "--root" || a.startsWith("--root="));
    const given = at < 0 ? undefined : args[at]!.startsWith("--root=") ? args[at]!.slice("--root=".length) : args[at + 1];
    return given === undefined || given === "" ? cwd : resolve(cwd, given);
  },
  target: ({ from, own }) => {
    const dir = installedCli(from);
    if (dir === undefined || same(dir, own)) return undefined;
    const run = binOf(dir);
    return run === undefined ? { broken: dir } : { run };
  },
};
