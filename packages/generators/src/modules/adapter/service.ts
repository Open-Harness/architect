import { Effect } from "effect";
import { AdapterRefused, type AdapterApi, type PluginFile } from "./types.ts";
import { clientFile, componentsFile, eventsFile, generatedLine, indexFile, operationsFile, treeOf } from "./internal/emit.ts";
import { componentsOf, eventsOf, operationsOf, type Description, type Node } from "./internal/extract.ts";
import { isName } from "./internal/names.ts";
import { blueprintReadme, packageJson, runtimeFiles, writtenFile } from "./internal/templates.ts";

const isRecord = (x: unknown): x is Node => typeof x === "object" && x !== null && !Array.isArray(x);

const generate: AdapterApi["generate"] = ({ name, spec }) =>
  Effect.gen(function* () {
    if (!isName(name)) return yield* new AdapterRefused({ message: `${JSON.stringify(name)} isn't a name for an adapter: use lower case words joined by dashes, like github or error-tracking` });
    if (!isRecord(spec) || (spec["openapi"] === undefined && spec["swagger"] === undefined)) return yield* new AdapterRefused({ message: "not an OpenAPI or Swagger description (it has neither an `openapi` nor a `swagger` version)" });
    const d: Description = { raw: spec, swagger: spec["swagger"] !== undefined };
    const ops = operationsOf(d);
    if (ops.length === 0) return yield* new AdapterRefused({ message: "no operations: the description has no path with an operationId" });
    const { tree, clashes } = treeOf(ops);
    if (clashes.length > 0) return yield* new AdapterRefused({ message: `a name is both a call and a group of calls, so the descriptor can't hold it: ${clashes.slice(0, 5).join(", ")}` });
    const [title, version] = [String(spec["info"]?.["title"] ?? name), String(spec["info"]?.["version"] ?? "0")];
    const events = eventsOf(d);
    const components = componentsOf(d, [...ops.flatMap((o) => [...o.successes.flatMap((x) => (x.schema === null ? [] : [x.schema])), ...o.params.map((p) => p.schema)]), ...events.flatMap((e) => e.payloads)]);
    const head = generatedLine(title, version);
    const generated = (path: string, content: string): PluginFile => ({ path, content, how: "generated" });
    const files: ReadonlyArray<PluginFile> = [
      { path: "package.json", content: packageJson(name, title, version), how: "scaffold" },
      { path: "blueprint/README.md", content: blueprintReadme(name), how: "scaffold" },
      { path: "src/written.ts", content: writtenFile(), how: "scaffold" },
      generated("src/index.ts", indexFile(head, title, version, tree, events)),
      generated("src/client.ts", clientFile(head)),
      generated("src/spec/operations.ts", `${head}\n${operationsFile(ops)}`),
      generated("src/spec/components.ts", `${head}\n${componentsFile(components)}`),
      generated("src/spec/events.ts", `${head}\n${eventsFile(events)}`),
      ...runtimeFiles().map((f) => generated(f.path, `${head}\n${f.source}`)),
    ];
    return { title, version, calls: ops.length, events: events.length, files };
  });

export const Adapter: AdapterApi = { generate, isName };
