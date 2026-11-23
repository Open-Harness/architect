import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { parse } from "yaml";
import { Adapter } from "@orthograph/generators/adapter";
import { NewRefused, type NewApi } from "./types.ts";

const isUrl = (from: string) => /^https?:\/\//.test(from);

/** The description's text: from a URL (asking for JSON or YAML) or from a file. */
const read = (from: string) =>
  isUrl(from)
    ? Effect.tryPromise({
        try: () => fetch(from, { headers: { accept: "application/json, application/yaml, text/yaml, */*" } }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`status ${r.status}`)))),
        catch: (e) => new NewRefused({ message: `could not read ${from}: ${String(e)}` }),
      })
    : Effect.try({ try: () => readFileSync(from, "utf8"), catch: (e) => new NewRefused({ message: `could not read ${from}: ${e instanceof Error ? e.message : String(e)}` }) });

/** JSON first, then YAML (YAML reads JSON too, but a JSON parse is exact and quick for the big ones). */
const parsed = (from: string, text: string) =>
  Effect.try({ try: (): unknown => JSON.parse(text), catch: (e) => e }).pipe(
    Effect.catch(() => Effect.try({ try: (): unknown => parse(text, { maxAliasCount: -1 }), catch: (e) => e })),
    Effect.mapError((e) => new NewRefused({ message: `could not parse ${from} as JSON or YAML: ${e instanceof Error ? e.message.split("\n")[0] : String(e)}` })),
  );

const adapter: NewApi["adapter"] = ({ root, name, from }) =>
  Effect.gen(function* () {
    if (!Adapter.isName(name)) return yield* new NewRefused({ message: `${JSON.stringify(name)} isn't a name for an adapter: use lower case words joined by dashes, like github or error-tracking` });
    const spec = yield* parsed(from, yield* read(from));
    const made = yield* Adapter.generate({ name, spec }).pipe(Effect.mapError((e) => new NewRefused({ message: `${from}: ${e.message}` })));
    const dir = join(root, "plugins", name);
    yield* Effect.try({
      try: () => {
        for (const f of made.files) {
          const file = join(dir, f.path);
          if (f.how === "scaffold" && existsSync(file)) continue;
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, f.content);
        }
      },
      catch: (e) => new NewRefused({ message: `could not write ${dir}: ${String(e)}` }),
    });
    return [`wrote plugins/${name}/ (${made.files.length} files; generated ones are put back by running this again, scaffolds are yours)`,
      `generated adapter ${name}: ${made.calls} calls, ${made.events} events from ${made.title} ${made.version}`];
  });

export const New: NewApi = { adapter };
