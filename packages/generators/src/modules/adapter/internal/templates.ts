// The runtime every generated adapter carries (json-schema, client, types) is this module's own source, copied in under the
// Generated line, so a plugin imports only `orthograph` and `effect`. Reading it is this module's one piece of I/O.
import { readFileSync } from "node:fs";

const NAMES = ["types", "json-schema", "client"] as const;

/** Each runtime file's path inside a plugin, and its source as it is here. */
export const runtimeFiles = (): ReadonlyArray<{ readonly path: string; readonly source: string }> =>
  NAMES.map((name) => ({ path: `src/runtime/${name}.ts`, source: readFileSync(new URL(`./runtime/${name}.ts`, import.meta.url), "utf8") }));

export const packageJson = (name: string, title: string, version: string) =>
  `${JSON.stringify({
    name: `@orthograph/${name}`,
    version: "0.0.0",
    description: `${title} ${version}, as an Orthograph adapter, generated from its published description.`,
    type: "module",
    orthograph: { kind: "adapter", blueprint: "blueprint" },
    exports: { ".": "./src/index.ts", "./client": "./src/client.ts" },
    dependencies: { effect: "4.1.4" },
    peerDependencies: { orthograph: "*" },
  }, null, 2)}\n`;

export const blueprintReadme = (name: string) =>
  `# ${name}: declarations\n\nAn adapter adds no things or operations of its own, so this folder is empty. Orthograph reads it to know the plugin is \`@orthograph/${name}\`'s.\n`;

/** The one file a person writes in a generated plugin: what the description doesn't say. */
export const writtenFile = () => [
  `// Scaffolded from ortho new adapter. Yours from now on.`,
  `import { Stand } from "orthograph";`, "",
  `/** Events the service sends that its description has no schema for, each \`Blueprint.incoming(<an Effect schema of its payload>)\`. */`,
  `export const events = {};`, "",
  `/** What stands in for the service in a world: \`Stand.process("...")\`, \`Stand.vendor("...")\` or, with nothing local, \`Stand.none\`. */`,
  `export const standIn = Stand.none;`, "",
].join("\n");
