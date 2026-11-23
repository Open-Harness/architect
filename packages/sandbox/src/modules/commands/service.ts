import { basename, join } from "node:path";
import { Effect } from "effect";
import { InvalidBlocked, type CommandsApi } from "./types.ts";
import { hitsFile, PROGRAM, refusalText, shimScript } from "./internal/shim.ts";

export const Commands: CommandsApi = {
  firstBlocked: (command, blocked) => {
    const first = command[0];
    const name = first === undefined ? undefined : basename(first);
    return name !== undefined && blocked.includes(name) ? name : undefined;
  },
  install: (disk, shims, blocked) =>
    Effect.gen(function* () {
      for (const name of blocked) if (!PROGRAM.test(name)) return yield* Effect.fail(new InvalidBlocked({ program: name }));
      yield* disk.makeDir(shims);
      yield* disk.write(hitsFile(shims), "");
      for (const name of blocked) yield* disk.write(join(shims, name), shimScript(name, hitsFile(shims)), 0o755);
    }),
  hitsFrom: (log) => log.split("\n").filter((line) => line !== ""),
  refusalText,
  hitsFile,
};
