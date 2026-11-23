import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Effect } from "effect";
import { Adapter } from "@orthograph/generators/adapter";
import { NewRefused, type NewApi } from "./types.ts";
import { parsed, read } from "./internal/read.ts";

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
