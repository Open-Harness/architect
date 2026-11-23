import { Names } from "orthograph/server";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { Render } from "@orthograph/generators/render";
import type { Model } from "@orthograph/compiler";
import { Effect } from "effect";
import { ProveFailed } from "../types.ts";

const io = <A>(work: () => A) =>
  Effect.try({ try: work, catch: (error) => new ProveFailed({ message: `couldn't prepare the scaffold world: ${String(error)}` }) });

/** Keep the test-only route switch and scaffold modules out of the project's source and generated tree. */
export const emptyWorld = (at: string, model: Model) =>
  Effect.gen(function* () {
    const root = resolve(at);
    const dir = join(root, Names.folder);
    yield* io(() => mkdirSync(dir, { recursive: true }));
    const scratch = yield* Effect.acquireRelease(
      io(() => mkdtempSync(join(dir, "empty-"))),
      (path) => Effect.sync(() => rmSync(path, { recursive: true, force: true })),
    );
    yield* io(() => {
      mkdirSync(join(scratch, "generated"), { recursive: true });
      for (const path of ["blueprint", "src", "generated/api", "generated/mcp", "generated/portal"]) {
        symlinkSync(join(root, path), join(scratch, path), "dir");
      }
      for (const file of Render.emptyServer({ name: basename(root), model })) {
        const path = join(scratch, file.path);
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, file.content);
      }
    });
    return scratch;
  });
