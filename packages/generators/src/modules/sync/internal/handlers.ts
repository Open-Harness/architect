// A plugin operation's code, found by path in its package and refused here, at generate, when it is missing: a server
// operation needs its handler for the worker (`src/<thing>/<verb>.js`); a client operation, which runs on the device,
// needs an entry for each host (`src/<thing>/<verb>.{node,browser,world}.js`). Each message names the operation, the
// package and the host. Nothing is shimmed (M1-plugins sections 8 and 8.1).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { handlerFiles, packageDir, type Model } from "@orthograph/compiler";

export const missingHandlers = (absoluteRoot: string, model: Model): ReadonlyArray<string> =>
  Object.values(model.operations).flatMap((op) => {
    if (op.kind !== "operation" || op.from.kind === "app") return [];
    const from = op.from;
    const mount = model.mounts?.[from.mount];
    const dir = packageDir(absoluteRoot, from.package);
    const src = dir ? (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { orthograph?: { src?: string } }).orthograph?.src ?? "./dist/src" : undefined;
    const entry = ({ host, module }: { readonly host: string; readonly module: string }) => {
      return dir && src && existsSync(join(dir, src, module.slice("src/".length)))
        ? []
        : [`${mount?.file ?? "a mount"}: ${op.name} has no ${host === "worker" ? "handler for the worker" : `${host} entry`} in ${from.package}: ${from.package}/${module} is missing`];
    };
    return handlerFiles(op).flatMap(entry);
  });
