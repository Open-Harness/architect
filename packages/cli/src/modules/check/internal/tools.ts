// The types and rules parts: tsc and oxlint, run for real on the project, their output read back as findings.
import { Names } from "orthograph/server";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import type { Model } from "@orthograph/compiler";
import type { ProjectFacts } from "@orthograph/lint";
import type { Finding } from "../types.ts";
import { binOf, tsFiles } from "./files.ts";

export const RULES = ["no-name-as-string", "refusal-has-log", "declared-errors-only", "no-wall-clock", "handler-matches-path", "no-old-names"] as const;

/** The drift rules (M1.26, K16 f): the blueprint grew past a handler that is yours. Warnings, never failures. */
export const WARNINGS = ["required-step-used", "outcome-chosen", "declared-error-named"] as const;

export const types = (root: string): ReadonlyArray<Finding> => {
  const tsc = binOf(root, "tsc");
  if (!tsc) return [{ part: "types", rule: "tsc", file: "tsconfig.json", message: "no tsc found in node_modules/.bin" }];
  const run = spawnSync(tsc, ["-p", join(root, "tsconfig.json"), "--noEmit", "--pretty", "false"], { cwd: root, encoding: "utf8" });
  const found = (run.stdout ?? "").split("\n").flatMap((l) => {
    const m = /^(.+?)\((\d+),\d+\): error (TS\d+): (.*)$/.exec(l);
    return m ? [{ part: "types" as const, rule: m[3]!, file: m[1]!, line: Number(m[2]), message: m[4]! }] : [];
  });
  return found.length === 0 && run.status !== 0 ? [failed("types", "tsc", "tsconfig.json", run)] : found;
};

export const factsOf = (root: string, model: Model): ProjectFacts => {
  const ops = Object.values(model.operations);
  const things = Object.values(model.things);
  return {
    root,
    names: [...ops.map((o) => o.name), ...ops.flatMap((o) => Object.values(o.steps).map((s) => s.name)),
      ...things.flatMap((t) => [...Object.keys(t.events), ...Object.keys(t.errors)])],
    errors: things.flatMap((t) => Object.keys(t.errors)),
    handlers: Object.fromEntries(ops.filter((o) => o.kind === "operation").map((o) => [`src/${o.thing}/${o.verb}.ts`, o.errors])),
    requiredSteps: Object.fromEntries(ops.filter((o) => o.kind === "operation" && o.from.kind === "app").map((o) =>
      [`src/${o.thing}/${o.verb}.ts`, Object.keys(o.steps).filter((key) => !o.steps[key]?.optional)])),
    outcomes: Object.fromEntries(ops.filter((o) => o.kind === "operation" && o.from.kind === "app" && (o.move?.to.length ?? 0) > 1).map((o) =>
      [`src/${o.thing}/${o.verb}.ts`, o.move!.to])),
  };
};

export const rules = (root: string, model: Model): { readonly errors: ReadonlyArray<Finding>; readonly warnings: ReadonlyArray<Finding> } => {
  const oxlint = binOf(root, "oxlint");
  if (!oxlint) return { errors: [{ part: "rules", rule: "oxlint", file: ".", message: "no oxlint found in node_modules/.bin" }], warnings: [] };
  const plugin = createRequire(import.meta.url).resolve(`${Names.pkg("lint")}/plugin`);
  const facts = factsOf(root, model);
  const dir = join(root, Names.folder, "check");
  mkdirSync(dir, { recursive: true });
  // Only the ortho rules: the project's own lint config is its own business.
  const config = {
    jsPlugins: [plugin], categories: { correctness: "off" }, plugins: [],
    rules: { ...Object.fromEntries(RULES.map((r) => [`ortho/${r}`, ["error", facts]])), ...Object.fromEntries(WARNINGS.map((r) => [`ortho/${r}`, ["warn", facts]])) },
  };
  writeFileSync(join(dir, "oxlintrc.json"), JSON.stringify(config, null, 2));
  // Files named one by one: walking a folder applies every .gitignore above it, which would skip a project kept in one.
  const targets = ["src", "blueprint"].flatMap((d) => tsFiles(join(root, d)).map((f) => relative(root, f)));
  if (targets.length === 0) return { errors: [], warnings: [] };
  const run = spawnSync(oxlint, ["-c", join(dir, "oxlintrc.json"), "--no-ignore", "--format", "unix", ...targets], { cwd: root, encoding: "utf8" });
  const errors: Array<Finding> = [];
  const warnings: Array<Finding> = [];
  for (const line of (run.stdout ?? "").split("\n")) {
    const m = /^(.+?):(\d+):\d+: (.*) \[(Error|Warning)\/ortho\((.+?)\)\]$/.exec(line);
    if (m) (m[4] === "Error" ? errors : warnings).push({ part: "rules", rule: m[5]!, file: m[1]!, line: Number(m[2]), message: m[3]! });
  }
  if (errors.length === 0 && run.status !== 0) errors.push(failed("rules", "oxlint", ".", run));
  return { errors, warnings };
};

/** A tool that exits non-zero without one finding it reports didn't run: that is a finding too, never a pass. */
const failed = (part: "types" | "rules", rule: string, file: string, run: { readonly status: number | null; readonly stderr?: string | null; readonly stdout?: string | null }): Finding =>
  ({ part, rule, file, message: `${rule} failed (exit ${run.status}): ${`${run.stderr ?? ""}${run.stdout ?? ""}`.trim().split("\n")[0] ?? ""}` });
