// The source kinds the intake plugin holds (`plugins/intake/blueprint/sources/<name>.ts`), imported as the compiler and the
// runtime read them: each is `Source.from(adapter, spec)`, and its `spec` is the mapping's pure functions (GOAL17-source-from,
// "The types"). Checks 62 and 65 call them with payloads and judge what they answer; nothing here is run by the app.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect } from "vitest";
import { superagent } from "./app.ts";

export type Fn = (...args: ReadonlyArray<any>) => any;
export interface SourceSpec {
  readonly on: Readonly<Record<string, Fn>>;
  readonly closed?: Readonly<Record<string, Fn>>;
  readonly scope: Fn;
  readonly reply?: { readonly call: unknown; readonly args: Fn; readonly landed: Fn; readonly gone: ReadonlyArray<unknown> };
  readonly history?: { readonly call: unknown; readonly args: Fn; readonly page: Fn };
  readonly policyPart: { readonly rows: Fn; readonly sync?: unknown };
  readonly environment: { readonly variables: Readonly<Record<string, string>>; readonly of: Fn };
}

/** `plugins/intake/blueprint/sources/<name>.ts`'s `<name>Source`: the kind, with its `spec`. */
export const sourceKind = async (name: string): Promise<{ readonly spec: SourceSpec; readonly adapter: unknown; (config: unknown): unknown }> => {
  const file = join(superagent, "plugins/intake/blueprint/sources", `${name}.ts`);
  expect(existsSync(file), `plugins/intake/blueprint/sources/${name}.ts is where the ${name} source kind is (GOAL17-source-from, "Where it lives")`).toBe(true);
  const mod = (await import(pathToFileURL(file).href)) as Record<string, any>;
  const kind = mod[`${name}Source`];
  expect(kind?.kind, `${name}.ts exports \`${name}Source\`, made by Source.from`).toBe("source-kind");
  return kind;
};

/** What a mapping is given beside the event: the connection's configuration, and its own account (GOAL17-source-from, `Ctx`). */
export const ctx = (config: { readonly me: unknown }) => ({ config, me: config.me });
