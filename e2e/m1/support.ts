// What every M1 check shares: a project copy of acme, a fixture plugin installed into it, the ortho command run as a
// user runs it, the model, and a mount written by hand. Earlier gates' helpers are reused read-only.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect } from "vitest";
import { acme, copyOf, nothingRunning, ortho, repo } from "../layer1/support.ts";
import { freePorts } from "../ports.ts";
import { fixtures, installFixture, type Installed } from "./packages.ts";

export { acme, copyOf, fixtures, installFixture, nothingRunning, repo };

/** This milestone's ports: free ones picked when the file loads (`e2e/ports.ts`), so two runs on one machine never meet. */
export const PORTS = freePorts(
  "control", "sdk", "mcp", "loud", "empty", "defect", "prove", "narrow", "omit",
  "journey", "promise", "effect", "mapper", "walletControl", "wallets", "hold",
);

export interface Copy {
  readonly root: string;
  readonly remove: () => void;
  /** What was installed into it, by fixture kind. */
  readonly installed: Record<string, Installed>;
}

/** A copy of acme, with the fixtures named installed into its node_modules (not mounted). */
export type Entry = string | { readonly kind: string; readonly variant?: string; readonly pin?: "exact" | "range" };
export const project = (...kinds: Array<Entry>): Copy => {
  const copy = copyOf(acme);
  const installed: Record<string, Installed> = {};
  try {
    for (const entry of kinds) {
      const { kind, ...options } = typeof entry === "string" ? { kind: entry } : entry;
      installed[kind] = installFixture(copy.root, kind, options);
    }
  } catch (error) { copy.remove(); throw error; }
  return { ...copy, installed };
};

export const run = (root: string, ...args: ReadonlyArray<string>) => {
  const result = ortho(root, ...args);
  return { ...result, out: `${result.stdout}${result.stderr}` };
};
export const succeeds = (root: string, ...args: ReadonlyArray<string>) => {
  const result = run(root, ...args);
  expect(result.status, result.out).toBe(0);
  return result;
};

// ---- a mount, by hand ----

/**
 * The projections `@orthograph/projections` ships (M1-plugins section 15, and `model`): acme mounts any subset of them.
 * `actions` joined them at M1.22 (design/decisions/WEB-actions-projection.md).
 */
export const SHIPPED_PROJECTIONS = ["actions", "api", "cli", "docs", "mcp", "model", "portal", "sdk", "server"] as const;
/** A project's mounts that are projections: each is kind "projection" from `@orthograph/projections`, and its name is one it ships. */
export const projectionMounts = (mounts: Record<string, { readonly kind: string; readonly package: string }> | undefined) => {
  const all = Object.entries(mounts ?? {}).filter(([, mount]) => mount.kind === "projection");
  for (const [name, mount] of all) {
    expect(SHIPPED_PROJECTIONS as ReadonlyArray<string>, `mount ${name} is not a projection @orthograph/projections ships`).toContain(name);
    expect(mount.package, `mount ${name}`).toBe("@orthograph/projections");
  }
  return all.map(([name]) => name).sort();
};

export type Kind = "feature" | "adapter" | "projection";
const folder = { feature: "features", adapter: "adapters", projection: "projections" } as const;

/** The file a mount of this name is in. */
export const mountFile = (kind: Kind, name: string) => `blueprint/${folder[kind]}/${name}.ts`;

/**
 * Write `blueprint/<kind>s/<name>.ts` by hand, as M1-plugins section 3 shows it: the plugin's descriptor imported from
 * its package, and `Blueprint.use(plugin, (p) => [verbs])`. `verbs` are written with the callback's parameter, `p`.
 */
export const writeMount = (root: string, kind: Kind, name: string, spec: { readonly pkg: string; readonly verbs?: ReadonlyArray<string>; readonly imports?: ReadonlyArray<string>; readonly via?: boolean }) => {
  const file = join(root, mountFile(kind, name));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, [
    `import { Blueprint${spec.via ? ", Via" : ""} } from "orthograph";`,
    `import plugin from "${spec.pkg}";`,
    ...(spec.imports ?? []),
    "",
    `export default Blueprint.use(plugin, (p) => [${(spec.verbs ?? []).join(", ")}]);`,
    "",
  ].join("\n"));
  return mountFile(kind, name);
};

export type Style = "plain" | "loud";
/** `blueprint/features/<name>.ts` mounting @fixture/echo with a pick, and any further verbs. */
export const mountEcho = (root: string, options: { readonly name?: string; readonly pick?: Style; readonly verbs?: ReadonlyArray<string>; readonly imports?: ReadonlyArray<string>; readonly via?: boolean } = {}) =>
  writeMount(root, "feature", options.name ?? "echo", { pkg: "@fixture/echo", via: options.via ?? false, imports: options.imports ?? [],
    verbs: [`p.choose(p.choices.style.${options.pick ?? "plain"})`, ...(options.verbs ?? [])] });

/** `ortho add feature @fixture/echo …`, which must succeed. */
export const addFeature = (root: string, ...args: ReadonlyArray<string>) => succeeds(root, "add", "feature", "@fixture/echo", ...args);

/** The plugin's own declarations, written as a mount's imports do (`op` is the identity the verbs match on). */
export const declaration = (name: string, thing: string, verb: string, pkg = "@fixture/echo") =>
  `import ${name} from "${pkg}/blueprint/things/${thing}/verbs/${verb}.js";`;

// ---- the model and the tree ----

export interface OperationJson {
  readonly name: string; readonly thing: string; readonly verb: string; readonly identifier: string; readonly file: string; readonly hash: string;
  readonly from:
    | { readonly kind: "app" }
    | { readonly kind: "feature" | "adapter"; readonly mount: string; readonly package: string; readonly version: string; readonly thing: string };
  readonly via?: ReadonlyArray<string>;
  readonly [key: string]: unknown;
}
export interface MountJson {
  readonly kind: string; readonly file: string; readonly package: string; readonly version: string; readonly integrity: string;
  readonly chosen: Record<string, string>; readonly omitted?: ReadonlyArray<string>; readonly narrowed?: Record<string, ReadonlyArray<string>>;
  readonly needs?: ReadonlyArray<string>; readonly hash: string;
}
export interface ModelJson {
  readonly refusals: Record<string, string>;
  readonly things: Record<string, { readonly name: string; readonly identifier: string; readonly code: string; readonly hash: string; readonly errors?: unknown; readonly from: OperationJson["from"] }>;
  readonly operations: Record<string, OperationJson>;
  readonly mounts?: Record<string, MountJson>;
  readonly [key: string]: unknown;
}
/** `ortho model --json`, which must succeed. */
export const model = (root: string) => JSON.parse(succeeds(root, "model", "--json").stdout) as ModelJson;

export const textAt = (root: string, path: string) => readFileSync(join(root, path), "utf8");
export const tree = (root: string, dir: string): ReadonlyArray<string> => existsSync(join(root, dir))
  ? readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`;
    return entry.isDirectory() ? tree(root, path) : [path];
  }).sort()
  : [];
/** Every file under `dir` with a digest of its bytes: two of these are equal when the trees are byte for byte. */
export const digest = (root: string, dir: string): Record<string, string> =>
  Object.fromEntries(tree(root, dir).map((path) => [path, createHash("sha256").update(readFileSync(join(root, path))).digest("hex")]));

/** Remove a file or folder of the copy. */
export const removeAt = (root: string, path: string) => rmSync(join(root, path), { recursive: true, force: true });

/**
 * A check that the CLI refuses: a non-zero exit, the diagnostic, and every named source in the message. The refusal must
 * not be an unrelated failure, so none of the command's own errors for a missing feature are accepted.
 */
export const refuses = (root: string, args: ReadonlyArray<string>, diagnostic: RegExp, names: ReadonlyArray<string>) => {
  const result = run(root, ...args);
  expect(result.status, result.out).not.toBe(0);
  expect(result.out).toMatch(diagnostic);
  for (const name of names) expect(result.out, `the message should name ${name}\n${result.out}`).toContain(name);
  expect(result.out).not.toMatch(/unknown command|unknown subcommand|not a place the blueprint reads|is not a function|Cannot read properties|SyntaxError|ERR_MODULE_NOT_FOUND/i);
  return result;
};

export const echoJourneyTitle = "echo repeats and shouts";
