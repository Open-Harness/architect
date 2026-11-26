import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
// Nx has no public export of FsTree or flushChanges; this deep import is why nx is a run-time dependency of the preset, and so of every app's cli.
import { FsTree, flushChanges } from "nx/src/generators/tree";
import { Starter } from "#modules/starter/service.js";
import { AppRefused, type AppApi } from "./types.ts";
import { isName, problem } from "./internal/names.ts";
import { occupied } from "./internal/folder.ts";

const create: AppApi["create"] = ({ parent, name }) =>
  Effect.gen(function* () {
    const wrong = problem(name);
    if (wrong !== undefined) return yield* new AppRefused({ message: wrong });
    const dir = join(parent, name);
    const taken = yield* Effect.try({
      try: () => occupied(dir, name),
      catch: (e) => new AppRefused({ message: `could not read ${name}/: ${String(e)}` }),
    });
    if (taken !== undefined) return yield* new AppRefused({ message: taken });
    yield* Effect.try({
      try: () => {
        mkdirSync(dir, { recursive: true });
        // The starter writes into a tree; the tree is put on disk as a whole. The install task it returns is never run.
        const tree = new FsTree(dir, false);
        Starter.write(tree, { name }, Starter.bundled());
        flushChanges(dir, tree.listChanges());
      },
      catch: (e) => new AppRefused({ message: `could not write ${name}/: ${String(e)}` }),
    });
    return [`made ${name}/`, "", "next:", `  cd ${name}`, "  pnpm install", "  pnpm ortho check", "  pnpm ortho prove"];
  });

const nameIn: AppApi["nameIn"] = (args) =>
  args.length === 0
    ? Effect.fail(new AppRefused({ message: "an app needs a name: use lower case words joined by dashes, like bakery or pastry-shop" }))
    : args.length > 1
      ? Effect.fail(new AppRefused({ message: `one name only, and ${JSON.stringify(args[1])} is another: an app takes just its name` }))
      : Effect.succeed(args[0]!);

export const App: AppApi = { create, nameIn, isName };
