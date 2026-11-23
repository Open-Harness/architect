// Where an operation's code lives, said once for the generator (which refuses a missing one), prove (which names it in a
// failing step) and the device host. A read has none; the app's own is `src/<thing>/<verb>.ts` in the project; a plugin's
// is `src/<thing>/<verb>.js` in its package, and a client operation has an entry per host on the device.
import type { OperationModel } from "../types.ts";

/** The hosts a client operation needs an entry for. `worker` is never one: nothing of it runs on the server. */
export const DEVICE_HOSTS = ["node", "browser", "world"] as const;

export interface HandlerFile {
  readonly host: "worker" | (typeof DEVICE_HOSTS)[number];
  /** The module's path inside its package (`src/<thing>/<verb>[.<host>].js`), for a plugin's; the project's path for the app's. */
  readonly module: string;
  /** What a reader opens: relative to the project root for the app's own, `<package>/<module>` for a plugin's. */
  readonly file: string;
}

/** The verbs of the four operations a thing with versions has (K40 fix 2). */
const VERSION_VERBS: ReadonlyArray<string> = ["save", "get", "history", "restore"];

/**
 * Is this operation one of the four the framework serves for a thing with `versions:`: its verb is one of them, and the thing's key
 * is a field of its payload? It has no handler file: the generated server serves it from the thing's declaration.
 */
export const isVersioned = (op: Pick<OperationModel, "kind" | "verb" | "payload">, versions: { readonly key: string } | undefined): boolean =>
  op.kind === "operation" && versions !== undefined && VERSION_VERBS.includes(op.verb) && versions.key in op.payload;

export const handlerFiles = (op: Pick<OperationModel, "kind" | "thing" | "verb" | "runs" | "from">): ReadonlyArray<HandlerFile> => {
  if (op.kind !== "operation") return [];
  if (op.from.kind === "app") {
    const module = `src/${op.thing}/${op.verb}.ts`;
    return [{ host: "worker", module, file: module }];
  }
  const { thing, package: pkg } = op.from;
  const one = (host: HandlerFile["host"], suffix: string): HandlerFile => {
    const module = `src/${thing}/${op.verb}${suffix}.js`;
    return { host, module, file: `${pkg}/${module}` };
  };
  return op.runs === "client" ? DEVICE_HOSTS.map((host) => one(host, `.${host}`)) : [one("worker", "")];
};
