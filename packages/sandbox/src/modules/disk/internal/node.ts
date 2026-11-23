import * as fs from "node:fs/promises";
import { dirname } from "node:path";
import { DiskFailed } from "../types.ts";

export { fs };

/** A Node error's code, or "unknown". */
export const code = (error: unknown): string =>
  typeof error === "object" && error !== null && "code" in error && typeof error.code === "string" ? error.code : "unknown";

export const failed = (path: string, error: unknown): DiskFailed => new DiskFailed({ path, code: code(error) });

/** Write a file after making its folder; the bytes written. */
export const writeFile = (path: string, content: string, mode: number | undefined): Promise<number> =>
  fs.mkdir(dirname(path), { recursive: true })
    .then(() => fs.writeFile(path, content, mode === undefined ? undefined : { mode }))
    .then(() => (mode === undefined ? undefined : fs.chmod(path, mode)))
    .then(() => Buffer.byteLength(content));
