// What the M2.04 checks (secrets by declaration) share: the fixture app with both stand-in plugins in their `secrets` variant
// (each declares secrets in its own `blueprint/secrets.ts`), mounted under names the check picks, and the ortho command run
// with a value on stdin, which `e2e/layer1/support.ts` cannot do.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { acme, cli } from "../layer1/support.ts";
import { installFixture } from "./packages.ts";
import { app, run, type Copy } from "./support.ts";

export { run, type Copy };

/** One mount file of a plugin, as `ortho add` scaffolds it. */
const mountOf = (plugin: string) => `import { Blueprint } from "orthograph";\nimport plugin from "${plugin}";\n\nexport default Blueprint.use(plugin, (_p) => []);\n`;

export interface Layout {
  /** The mount name of the auth stand-in (`blueprint/features/<name>.ts`), or none. Default `auth`. */
  readonly auth?: string | null;
  /** The mount name of the organizations stand-in, or none. Default `organizations`. */
  readonly organizations?: string | null;
  /** The app's own `blueprint/secrets.ts`, when it has one. */
  readonly appSecrets?: string;
  /** One more environment (`blueprint/environments/<name>.ts`, a copy of local), so that no list of environment names is the answer. */
  readonly extraEnvironment?: string;
}

/** The app's own secret, as frame/secrets.md has it: no mount in its name. */
export const INVOICE = `import { Blueprint } from "orthograph";\n\nexport const invoiceSigning = Blueprint.secret.generated({ bytes: 32 });\nexport const ledgerKey = Blueprint.secret.stored({ describe: "The ledger's key" });\n`;

/** The fixture app with its plugins in their `secrets` variant, mounted as `layout` says. */
export const secretsApp = (layout: Layout = {}): Copy => {
  const copy = app();
  try {
    const { auth = "auth", organizations = "organizations", appSecrets, extraEnvironment } = layout;
    const features = join(copy.root, "blueprint/features");
    for (const file of readdirSync(features)) rmSync(join(features, file));
    if (auth !== null) {
      installFixture(copy.root, "auth", { variant: "secrets" });
      writeFileSync(join(features, `${auth}.ts`), mountOf("@fixture/auth"));
    }
    if (organizations !== null) {
      installFixture(copy.root, "organizations", { variant: "secrets" });
      writeFileSync(join(features, `${organizations}.ts`), mountOf("@fixture/organizations"));
    }
    if (appSecrets !== undefined) writeFileSync(join(copy.root, "blueprint/secrets.ts"), appSecrets);
    if (extraEnvironment !== undefined) writeFileSync(join(copy.root, `blueprint/environments/${extraEnvironment}.ts`), readFileSync(join(copy.root, "blueprint/environments/local.ts"), "utf8"));
  } catch (error) { copy.remove(); throw error; }
  return copy;
};

/** `ortho <args>` with `input` on its stdin, as a person pipes a value in. */
export const withInput = (root: string, input: string, ...args: ReadonlyArray<string>) => {
  const result = spawnSync(process.execPath, [cli, ...args, "--root", root], { cwd: root, input, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 120_000 });
  return { ...result, out: `${result.stdout}${result.stderr}` };
};

export interface ModelSecret {
  readonly how: string;
  readonly kind: string;
  readonly export: string;
  readonly from: { readonly kind: string; readonly mount?: string };
}
export interface ModelOf {
  readonly secrets?: Readonly<Record<string, ModelSecret>>;
  readonly environments?: Readonly<Record<string, { readonly secrets?: Readonly<Record<string, string>> }>>;
}

/** `ortho model --json` of a project, parsed; a refusal fails with what it said. */
export const modelOf = (root: string): { readonly model: ModelOf; readonly text: string } => {
  const made = run(root, "model", "--json");
  if (made.status !== 0) throw new Error(`ortho model --json exited ${String(made.status)}:\n${made.out}`);
  return { model: JSON.parse(made.stdout) as ModelOf, text: made.stdout };
};

/** One row of `ortho secrets`: `NAME  how  kind  status...`, split on spaces. */
export interface Row { readonly name: string; readonly how: string; readonly kind: string; readonly status: string }
export const rowsOf = (out: string): ReadonlyArray<Row> =>
  out.split("\n").flatMap((line) => {
    const [name = "", how = "", kind = "", ...status] = line.trim().split(/\s+/);
    return /^[A-Z][A-Z0-9_]*$/.test(name) && /^(generated|stored)$/.test(how) ? [{ name, how, kind, status: status.join(" ") }] : [];
  });

/** Where a local environment's values live (frame/secrets.md; `prove/.../environments/internal/process.ts`). */
export const secretsFile = (root: string, env = "local") => join(root, ".ortho/environments", env, "secrets.env");
export const valuesIn = (root: string, env = "local"): ReadonlyMap<string, string> => {
  const file = secretsFile(root, env);
  const text = existsSync(file) ? readFileSync(file, "utf8") : "";
  return new Map(text.split("\n").flatMap((line) => { const at = line.indexOf("="); return at > 0 ? [[line.slice(0, at), line.slice(at + 1)] as const] : []; }));
};
export const modeOf = (path: string) => statSync(path).mode & 0o777;

/** Every file under a folder, symbolic links not followed (a copy of acme links its packages), but those under a folder named in `skip`. */
export const projectFiles = (root: string, skip: ReadonlyArray<string> = ["node_modules", ".ortho"]): ReadonlyArray<string> => {
  const walk = (dir: string): ReadonlyArray<string> => readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    skip.includes(entry.name) || entry.isSymbolicLink() ? [] : entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
  return walk(root);
};

export const NAMES = {
  auth: ["AUTH_SECRET"],
  organizations: ["ORGANIZATIONS_WEBHOOK_SIGNING", "ORGANIZATIONS_SIGNING_KEY", "ORGANIZATIONS_SIGNING_SECRET", "ORGANIZATIONS_RELEASE_SEED", "ORGANIZATIONS_PUBLISH_TOKEN", "ORGANIZATIONS_QUERY_TOKEN"],
  app: ["INVOICE_SIGNING", "LEDGER_KEY"],
} as const;
/** The runtime secrets among them: what a running place holds. The release and builder ones belong to CI and a developer. */
export const RUNTIME = ["AUTH_SECRET", "ORGANIZATIONS_WEBHOOK_SIGNING", "ORGANIZATIONS_SIGNING_KEY", "ORGANIZATIONS_SIGNING_SECRET", "INVOICE_SIGNING", "LEDGER_KEY"] as const;

/** Does `text` hold any six characters in a row of `value`? A prefix, a suffix or a middle of a secret is a leak as much as the whole. */
export const leaks = (text: string, value: string): boolean => {
  for (let at = 0; at + 6 <= value.length; at++) if (text.includes(value.slice(at, at + 6))) return true;
  return false;
};

/** Every file under `root` but those under a folder named in `skip`. */
export const allFiles = projectFiles;

export { acme };
