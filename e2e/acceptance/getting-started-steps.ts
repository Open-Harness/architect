// The page's steps, as check 09 of #1111 read them (commit 754aa114), for check 09 of slice 11 (`09-g18-11-acceptance.test.ts`), which
// runs them. Written by the author before the build; a builder never edits it (AGENTS.md, "Journeys and checks come first").
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repo } from "../local-registry.ts";

export const PAGE = join(repo, "docs/canon/getting-started.mdx");
export const page = existsSync(PAGE) ? readFileSync(PAGE, "utf8") : "";

/** The steps of the page, in order: every command line of its sh, bash and shell fences, and the `$ ` lines of its console fences; `a && b` is two. */
export const stepsOf = (text: string): ReadonlyArray<string> => {
  const out: string[] = [];
  let kind: "run" | "console" | "skip" | undefined;
  let pending = "";
  for (const raw of text.split("\n")) {
    const fence = /^\s*```\s*([\w-]*)/.exec(raw);
    if (fence) {
      kind = kind !== undefined ? undefined : ["sh", "bash", "shell"].includes(fence[1] ?? "") ? "run" : fence[1] === "console" ? "console" : "skip";
      pending = "";
      continue;
    }
    if (kind === undefined || kind === "skip") continue;
    let line = raw.trim();
    if (pending === "") {
      if (kind === "console") { if (!line.startsWith("$ ")) continue; line = line.slice(2).trim(); }
      else line = line.replace(/^\$\s+/, "");
      if (line === "" || line.startsWith("#")) continue;
    }
    if (line.endsWith("\\")) { pending += `${line.slice(0, -1).trim()} `; continue; }
    out.push(...`${pending}${line}`.split("&&").map((x) => x.trim()).filter((x) => x !== ""));
    pending = "";
  }
  return out;
};
export const STEPS = stepsOf(page);

const RUNNER = /^(?:(?:pnpm|yarn|bun)\s+(?:exec|dlx)\s+|npx\s+(?:--yes\s+|-y\s+)?|npm\s+exec\s+(?:--yes\s+)?(?:--\s+)?)/;
/** `ortho <verb>`, as a reader types it: plain, or through pnpm, npx, npm exec, yarn or bun. */
export const orthoRun = (verb: string) => new RegExp(`^(?:[A-Z][A-Z0-9_]*=\\S+\\s+)*(?:(?:pnpm|yarn|bun)(?:\\s+exec)?\\s+|npx\\s+(?:--yes\\s+|-y\\s+)?|npm\\s+exec\\s+(?:--yes\\s+)?(?:--\\s+)?)?ortho\\s+${verb}\\b`);
const CREATE = /^(?:(?:(?:pnpm|yarn|bun)(?:\s+exec)?\s+|npx\s+(?:--yes\s+|-y\s+)?)?ortho\s+new\s+app|(?:npm|pnpm|yarn|bun)\s+(?:create|init)\s+orthograph(?:@\S+)?|npx\s+(?:--yes\s+|-y\s+)?create-orthograph(?:@\S+)?)\s+([a-z][a-z0-9-]*)\b/;
const at = (re: RegExp) => STEPS.findIndex((s) => re.test(s));
export const createAt = at(CREATE);
export const NAME = createAt >= 0 ? CREATE.exec(STEPS[createAt] ?? "")?.[1] : undefined;
/** The generated CLI's rule for an app's variables (cli.ts: `name.toUpperCase().replace(/-/g, "_")`). */
export const PREFIX = NAME?.toUpperCase().replace(/-/g, "_");
export const proveAt = at(orthoRun("prove"));
export const devAt = at(orthoRun("dev"));

/** Why a step is not a plain command a reader types (the contract above), or undefined when it is. `name` is the app's (the page's own). */
export const refusal = (step: string, name: string | undefined = NAME): string | undefined => {
  if (/[;|&<>()`]|\$\(/.test(step)) return "it uses the shell (`;`, `|`, `&`, a redirect, `$(…)`, backticks or parentheses)";
  // GOAL18-getting-started-acceptance and the 🔍 review of #1145: the only variables a page sets, by `export` or before a command, are
  // the app's own two, `<APP>_URL` and `<APP>_TOKEN`. Anything else (npm's or pnpm's config, PATH, HOME, NODE_*, COREPACK_*, YARN_*,
  // XDG_*, a proxy, a CA) would move what the reader's own npm, pnpm or Node does.
  const prefix = name?.toUpperCase().replace(/-/g, "_");
  const own = (v: string) => prefix !== undefined && (v === `${prefix}_URL` || v === `${prefix}_TOKEN`);
  const only = prefix === undefined ? "no variable (the page creates no app)" : `only ${prefix}_URL and ${prefix}_TOKEN`;
  const exported = /^export\s+([A-Za-z_][A-Za-z0-9_]*)=/.exec(step)?.[1];
  if (exported !== undefined && !own(exported)) return `it exports ${exported}: a page sets ${only}`;
  const before = [.../^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/.exec(step)?.[0].matchAll(/([A-Za-z_][A-Za-z0-9_]*)=/g) ?? []].map((m) => m[1] ?? "");
  const set = before.find((v) => !own(v));
  if (exported === undefined && set !== undefined) return `it sets ${set}: a page sets ${only}`;
  // A `cd` stays inside the folder the steps start in, and no flag points npm or pnpm at another registry (a scope's or a host's too),
  // a token, a config, a prefix or a folder.
  if (/^cd\s+/.test(step) && (/^cd\s+(?:\/|~)/.test(step) || /(?:^|\/)\.\.(?:\/|$)/.test(step.slice(3).trim()))) return "it leaves the folder the steps start in";
  if (/(?:^|\s)--(?:(?:@[\w.-]+:)?registry|\/\/|userconfig|globalconfig|prefix|dir|store-dir|cache|cache-dir|config\.[\w-]+)/.test(step)) return "it points npm or pnpm at another registry, token, config or folder";
  if (/^cd\s+\S+$/.test(step) || /^export\s+[A-Za-z_][A-Za-z0-9_]*=\S*$/.test(step)) return undefined;
  const words = step.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, "").split(/\s+/);
  if (words.some((w) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w) && words.indexOf(w) === 0)) return "it only sets a variable";
  const [program = "", ...rest] = words;
  const pkg = /^(?:orthograph|@orthograph\/[a-z0-9-]+|create-orthograph)(?:@[\w.-]+)?$/;
  const runnable = (w: string | undefined) => w === "ortho" || w === name || /^create-orthograph(?:@[\w.-]+)?$/.test(w ?? "");
  const plainArgs = rest.filter((w) => !w.startsWith("-"));
  if (RUNNER.test(step.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, ""))) {
    const after = step.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, "").replace(RUNNER, "").split(/\s+/)[0];
    return runnable(after) ? undefined : `it runs \`${after}\`, not ortho, create-orthograph or the app's command`;
  }
  if (program === "ortho" || program === name) return undefined;
  if (program === "node") return /^(?:\.\/)?generated\/cli\/src\/main\.ts$/.test(rest[0] ?? "") ? undefined : "node runs something other than the app's generated CLI";
  if (["npm", "pnpm", "yarn", "bun"].includes(program)) {
    const [verb = "", ...args] = plainArgs;
    if (["create", "init"].includes(verb)) return /^orthograph(?:@[\w.-]+)?$/.test(args[0] ?? "") ? undefined : `it creates from \`${args[0]}\`, not orthograph`;
    if (["install", "i", "add"].includes(verb)) return args.every((a) => pkg.test(a)) ? undefined : `it installs something other than Orthograph: ${args.join(" ")}`;
    if (verb === "ortho" || verb === name) return undefined;
    return `\`${program} ${verb}\` is not an install, a create or a run of ortho or the app`;
  }
  return `\`${program}\` is not a program the page may run`;
};
export const refused = STEPS.flatMap((s) => { const why = refusal(s); return why === undefined ? [] : [`\`${s}\`: ${why}`]; });
/** The step that calls the app through its generated CLI: the app's own command (`<name> …`, the bin it declares) or `node generated/cli/src/main.ts …`. */
const callsTool = (s: string) => {
  const bare = s.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=\S*\s+)+/, "");
  return NAME !== undefined && (new RegExp(`^(?:(?:pnpm|yarn|bun)(?:\\s+exec)?\\s+|npx\\s+(?:--yes\\s+|-y\\s+)?)?${NAME}\\s+\\S`).test(bare) || /^node\s+(?:\.\/)?generated\/cli\/src\/main\.ts\s+\S/.test(bare));
};
export const toolAt = STEPS.findIndex((s, i) => i > devAt && devAt >= 0 && callsTool(s));
export const urlSetAt = PREFIX === undefined ? -1 : STEPS.findIndex((s) => new RegExp(`\\b${PREFIX}_URL=`).test(s));

