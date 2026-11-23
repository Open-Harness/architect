import { Effect } from "effect";
import type { Disk } from "./types.ts";
import { failed, fs, writeFile } from "./internal/node.ts";

/** The real disk. */
export const nodeDisk: Disk = {
  realpath: (path) => Effect.promise(() => fs.realpath(path).catch(() => null)),
  makeDir: (path) => Effect.tryPromise({ try: () => fs.mkdir(path, { recursive: true }), catch: (e) => failed(path, e) }).pipe(Effect.asVoid),
  write: (path, content, mode) => Effect.tryPromise({ try: () => writeFile(path, content, mode), catch: (e) => failed(path, e) }),
  read: (path) => Effect.tryPromise({ try: () => fs.readFile(path, "utf8"), catch: (e) => failed(path, e) }),
  readOrEmpty: (path) => Effect.promise(() => fs.readFile(path, "utf8").catch(() => "")),
  names: (path) => Effect.promise(() => fs.readdir(path).then((names) => names.sort(), () => [])),
  remove: (path) => Effect.promise(() => fs.rm(path, { recursive: true, force: true }).catch(() => undefined)),
};
