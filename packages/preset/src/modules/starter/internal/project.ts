// The files around the blueprint that make the workspace a project: its package.json, tsconfig and ignores.
import { Names } from "orthograph/server";
const EXACT = {
  effect: "4.1.4",
  "@effect/platform-node": "4.1.4",
  "@effect/sql-d1": "4.1.4",
};
const DEV = {
  "@cloudflare/workers-types": "5.20261101.1",
  "@types/node": "24.19.2",
  "@typescript/native": "npm:typescript@7.0.2",
  oxlint: "1.90.0",
  wrangler: "4.156.1",
};

export const packageJson = (existing: Record<string, unknown>, name: string, version: string) => {
  const framework = Object.fromEntries([Names.frontDoor, ...(["host-cloudflare", "portal", "language-effect"] as const).map(Names.pkg)].map((p) => [p, version]));
  return {
    ...existing,
    type: "module",
    packageManager: "pnpm@11.20.0",
    scripts: { ...(existing["scripts"] as object | undefined), [Names.short]: Names.short },
    bin: { [name]: "./generated/cli/src/main.ts" },
    dependencies: { ...(existing["dependencies"] as object | undefined), ...framework, ...EXACT },
    devDependencies: { ...(existing["devDependencies"] as object | undefined), [Names.pkg("cli")]: version, ...DEV },
  };
};

export const TSCONFIG = {
  compilerOptions: {
    target: "es2024", module: "nodenext", moduleResolution: "nodenext", lib: ["es2024"],
    types: ["node", "@cloudflare/workers-types"],
    strict: true, exactOptionalPropertyTypes: true, noUncheckedIndexedAccess: true, noImplicitOverride: true,
    verbatimModuleSyntax: true, erasableSyntaxOnly: true, allowImportingTsExtensions: true, noEmit: true,
    skipLibCheck: true, resolveJsonModule: true, isolatedModules: true,
  },
  include: ["blueprint/**/*.ts", "generated/**/*.ts", "src/**/*.ts", "journeys/**/*.ts"],
};

export const IGNORES = [`${Names.folder}/`, ".wrangler/", "node_modules/"];

/** pnpm settings the project needs: workerd and esbuild build for the local world; kysely held as in Orthograph (D2 #68). */
export const WORKSPACE: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  allowBuilds: { esbuild: "true", nx: "true", workerd: "true" },
  overrides: { kysely: "0.29.7" },
};

/** Merge flat two-level maps into a pnpm-workspace.yaml: each entry is set under its key, which is added if missing. */
export const mergeWorkspace = (yaml: string, settings: typeof WORKSPACE): string => {
  const lines = yaml.trimEnd() === "" ? [] : yaml.trimEnd().split("\n");
  for (const [key, entries] of Object.entries(settings)) {
    let at = lines.findIndex((l) => l === `${key}:`);
    if (at === -1) { lines.push(`${key}:`); at = lines.length - 1; }
    let end = at + 1;
    while (end < lines.length && lines[end]!.startsWith("  ")) end++;
    for (const [name, value] of Object.entries(entries)) {
      const line = `  ${name}: ${value}`;
      const found = lines.slice(at + 1, end).findIndex((l) => l.trimStart().replace(/^'|'(?=:)/g, "").startsWith(`${name}:`));
      if (found === -1) { lines.splice(end, 0, line); end++; } else lines[at + 1 + found] = line;
    }
  }
  return lines.join("\n") + "\n";
};
