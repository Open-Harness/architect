// Where a description comes from, and how it is read: a file or an http(s) URL, JSON or YAML.
import { readFileSync } from "node:fs";
import { Effect } from "effect";
import { parse } from "yaml";
import { NewRefused } from "../types.ts";

const isUrl = (from: string) => /^https?:\/\//.test(from);

/** The description's text: from a URL (asking for JSON or YAML) or from a file. */
export const read = (from: string) =>
  isUrl(from)
    ? Effect.tryPromise({
        try: () => fetch(from, { headers: { accept: "application/json, application/yaml, text/yaml, */*" } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`status ${r.status}`)))),
        catch: (e) => new NewRefused({ message: `could not read ${from}: ${String(e)}` }),
      })
    : Effect.try({ try: () => readFileSync(from, "utf8"), catch: (e) => new NewRefused({ message: `could not read ${from}: ${e instanceof Error ? e.message : String(e)}` }) });

/** JSON first (exact and quick for the big ones), then YAML. */
export const parsed = (from: string, text: string) =>
  Effect.try({ try: (): unknown => JSON.parse(text), catch: (e) => e }).pipe(
    Effect.catch(() => Effect.try({ try: (): unknown => parse(text, { maxAliasCount: -1 }), catch: (e) => e })),
    Effect.mapError((e) => new NewRefused({ message: `could not parse ${from} as JSON or YAML: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}` })),
  );
