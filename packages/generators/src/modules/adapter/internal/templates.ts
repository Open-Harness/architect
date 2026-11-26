// The runtime every generated adapter carries (json-schema, client, types) is this module's own source, copied in under the
// Generated line, so a plugin imports only `orthograph` and `effect`. It is read from `runtime-sources.ts` (embed.ts says why).
import { RUNTIME } from "./runtime-sources.ts";
import { errorsOf, pascalOf } from "./names.ts";

/** Each runtime file's path inside a plugin, and its source as it is here. */
export const runtimeFiles = (): ReadonlyArray<{ readonly path: string; readonly source: string }> =>
  Object.entries(RUNTIME).map(([name, source]) => ({ path: `src/runtime/${name}.ts`, source }));

export const packageJson = (name: string, title: string, version: string) =>
  `${JSON.stringify({
    name: `@orthograph/${name}`,
    version: "0.0.0",
    description: `${title} ${version}, as an Orthograph adapter, generated from its published description.`,
    type: "module",
    orthograph: { kind: "adapter", blueprint: "blueprint" },
    exports: { ".": "./src/index.ts", "./client": "./src/client.ts", "./blueprint/*.js": "./blueprint/*.ts" },
    dependencies: { effect: "4.1.4" },
    peerDependencies: { orthograph: "*" },
  }, null, 2)}\n`;

export const blueprintReadme = (name: string) =>
  `# ${name}: declarations\n\nAn adapter adds no operations of its own. Orthograph reads this folder to know the plugin is \`@orthograph/${name}\`'s: its secrets (where the service answers, and its key), and the thing whose errors its calls fail with.\n`;

/** `baseUrl`, always, and `apiKey` when the description requires a key: each mount's `<MOUNT>_BASE_URL` and `<MOUNT>_API_KEY`. */
export const secretsFile = (head: string, keyed: boolean) => [
  head, `import { Blueprint } from "orthograph";`, "",
  `/** Where the service answers, its base path included. A world's stand-in (\`ORTHO_STAND_<MOUNT>\`) wins over it. */`,
  `export const baseUrl = Blueprint.secret.stored({ describe: "Where the service answers, its base path included" });`,
  ...(keyed ? [
    `/** The key each call sends, where the description's security says. */`,
    `export const apiKey = Blueprint.secret.stored({ describe: "The key the service is called with" });`] : []),
  "",
].join("\n");

/**
 * The thing the adapter's errors are declared on. Its refusal prefix is the compiler's default, the name's first two letters,
 * unless the plugin's own `src/written.ts` exports a `code` (snag #1012): read through the module, so a plugin scaffolded
 * before it had one still loads.
 */
export const thingFile = (head: string, name: string, title: string) => [
  head, `import { Blueprint } from "orthograph";`,
  `import * as written from "../../../src/written.ts";`, "",
  `const { code } = written as { readonly code?: string };`, "",
  `export const ${pascalOf(name)} = Blueprint.thing({`,
  `  description: ${JSON.stringify(`What ${title} fails with.`)},`,
  `  fields: { id: Blueprint.id(${JSON.stringify(name.replaceAll("-", ""))}) },`,
  `  ...(code === undefined ? {} : { code }),`,
  `});`, "",
].join("\n");

/**
 * The client's four failures as errors an operation can refuse with; a handler's mapping turns each into its namesake. Their
 * exits are one base, 81 unless the plugin's `src/written.ts` exports an `exit` (snag #1012, G16-adapter-mounts call 1):
 * read through the module, as `code` is, so a plugin scaffolded before it had one still loads.
 */
export const errorsFile = (head: string, name: string) => {
  const [apiFailure, inputRefused, answerRefused, unreachable] = errorsOf(name);
  return [
    head, `import { Blueprint } from "orthograph";`,
    `import * as written from "../../../src/written.ts";`, "",
    `const { exit = 81 } = written as { readonly exit?: number | undefined };`, "",
    `/** The service answered with an HTTP status of 400 or more, or a 200 whose body says \`ok: false\` (its \`code\`). */`,
    `export class ${apiFailure} extends Blueprint.error({ status: Blueprint.uint(16), code: Blueprint.optional(Blueprint.text({ max: 200 })) }, { exit }) {}`,
    `/** The input doesn't fit the call, so nothing was sent. */`,
    `export class ${inputRefused} extends Blueprint.error({}, { exit: exit + 1 }) {}`,
    `/** The answer doesn't fit what the description documents. */`,
    `export class ${answerRefused} extends Blueprint.error({}, { exit: exit + 2 }) {}`,
    `/** The service couldn't be reached. */`,
    `export class ${unreachable} extends Blueprint.error({}, { exit: exit + 3 }) {}`, "",
  ].join("\n");
};

/** The one file a person writes in a generated plugin: what the description doesn't say. */
export const writtenFile = () => [
  `// Scaffolded from ortho new adapter. Yours from now on.`,
  `import { Stand, type AdapterDoor } from "orthograph";`, "",
  `/** Events the service sends that its description has no schema for, each \`Blueprint.incoming(<an Effect schema of its payload>)\`. */`,
  `export const events = {};`, "",
  `/** What stands in for the service in a world: \`Stand.process("...")\`, \`Stand.vendor("...")\` or, with nothing local, \`Stand.none\`. */`,
  `export const standIn = Stand.none;`, "",
  `/** How its door receives the events: how the sender signs, where the event's name is. \`undefined\` for a service that sends none. */`,
  `export const door: AdapterDoor | undefined = undefined;`, "",
  `/** Its errors' refusal code prefix, 2 to 4 capitals (\`PH\`). \`undefined\` takes the name's first two letters; set one when another thing has those. */`,
  `export const code: string | undefined = undefined;`, "",
  `/** Its four errors' exits, one base: they take base to base+3. \`undefined\` takes 81 to 84; set one when an operation also calls another generated adapter. */`,
  `export const exit: number | undefined = undefined;`, "",
].join("\n");
