// An environment's secrets: made once, kept in a file only its owner reads, and passed to wrangler as that file.
import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { EnvironmentModel } from "@orthograph/compiler";

const parse = (text: string): ReadonlyMap<string, string> =>
  new Map(text.split("\n").flatMap((line) => {
    const at = line.indexOf("=");
    return at > 0 ? [[line.slice(0, at), line.slice(at + 1)] as const] : [];
  }));

/** The names this environment may invent a value for: the ones declared `generated`. A stored secret is a person's to set, never made up. */
export const generatedNames = (secrets: EnvironmentModel["secrets"]): ReadonlyArray<string> =>
  Object.entries(secrets).flatMap(([name, how]) => (how === "generated" ? [name] : []));

/**
 * `secrets.env`, mode 0600: Better Auth's `AUTH_SECRET` and every `generated` secret the environment names. A value that is
 * already there stays (so a restart keeps sessions valid), as does every other line (a stored secret a person set); a new
 * generated name, or one with an empty value, gets a generated one. Values never reach a command line.
 */
export const ensureSecrets = (file: string, generated: ReadonlyArray<string>): void => {
  const have = existsSync(file) ? parse(readFileSync(file, "utf8")) : new Map<string, string>();
  const made = new Map(have);
  for (const name of ["AUTH_SECRET", ...generated]) if ((made.get(name) ?? "") === "") made.set(name, randomBytes(32).toString("hex"));
  writeFileSync(file, `${[...made].map(([name, value]) => `${name}=${value}`).join("\n")}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
};
