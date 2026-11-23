// An environment's `secrets.env`: `NAME=value` lines, owner-only. Read and written whole; a value is never logged.
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Names } from "orthograph/server";

export const fileOf = (root: string, env: string): string => join(resolve(root), Names.folder, "environments", env, "secrets.env");

export const valuesOf = (file: string): ReadonlyMap<string, string> =>
  new Map((existsSync(file) ? readFileSync(file, "utf8") : "").split("\n").flatMap((line) => {
    const at = line.indexOf("=");
    return at > 0 ? [[line.slice(0, at), line.slice(at + 1)] as const] : [];
  }));

/** Replace or add one line, keeping every other as it is. The mode is 0600 before the value is written, and after. */
export const keep = (file: string, name: string, value: string): void => {
  mkdirSync(dirname(file), { recursive: true });
  const lines = (existsSync(file) ? readFileSync(file, "utf8") : "").split("\n").filter((line) => line !== "");
  const at = lines.findIndex((line) => line.startsWith(`${name}=`));
  const line = `${name}=${value}`;
  if (at >= 0) lines[at] = line; else lines.push(line);
  if (existsSync(file)) chmodSync(file, 0o600);
  writeFileSync(file, `${lines.join("\n")}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
};
