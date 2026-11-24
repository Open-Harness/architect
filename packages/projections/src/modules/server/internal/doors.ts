// The Worker's doors (M5-reach-out Q2, built in Goal 17 slice 11): `/_in/<mount>` for each adapter mount whose model entry has a `door`.
// Everything here is the text the generated server gains, and nothing when no mount has a door, so an app without one generates as before.
import type { Model } from "@orthograph/compiler";
import { toRoot } from "#modules/names/service.js";

interface SourceEntry { readonly mount?: string; readonly file: string; readonly export: string }

export const doorsOf = (model: Model, name: string, mountVar: (mount: string) => string, imported: ReadonlyArray<string>) => {
  const doored = Object.entries(model.mounts ?? {}).filter(([, m]) => m.door !== undefined).sort(([a], [b]) => a.localeCompare(b));
  const sourcesOf = (mount: string) => Object.values((model.sources ?? {}) as Record<string, SourceEntry>).filter((s) => s.mount === mount);
  const sourceAt = (file: string) => (file.startsWith("@") ? file.replace(/\.ts$/, ".js") : `${toRoot("generated/server/main.ts")}${file}`);
  return {
    any: doored.length > 0,
    /** The mounts' files not already imported, and each source kind that maps them. */
    imports: [
      ...doored.filter(([m]) => !imported.includes(m)).map(([m]) => `import ${mountVar(m)} from "${toRoot("generated/server/main.ts")}${model.mounts![m]!.file}";`),
      ...doored.flatMap(([m]) => sourcesOf(m)).map((src) => `import { ${src.export} } from "${sourceAt(src.file)}";`),
    ],
    /** Each door: the adapter that says how its sender signs, the events the mount includes, the sources that map them, and the binding of its signing secret. */
    table: doored.length === 0 ? [] : [
      "/** Each door: the adapter that says how its sender signs, the events the mount includes, the sources that map them, and the binding of its signing secret. */",
      `const doors = [${doored.map(([m, mm]) => `{ mount: "${m}", adapter: ${mountVar(m)}.plugin, events: ${JSON.stringify(mm.events ?? [])}, sources: [${sourcesOf(m).map((x) => x.export).join(", ")}], secret: "${mm.door!.secret}" }`).join(", ")}];`,
      "",
    ],
    env: doored.map(([, mm]) => `  /** The signing secret of a door: set by whoever runs the Worker, never written in a file. */\n  readonly ${mm.door!.secret}?: string;`),
    route: doored.length === 0 ? [] : [
      "    if (new URL(request.url).pathname.startsWith(\"/_in/\")) {",
      `      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "${name}", handler: (req, context) => Inbound.handle({ doors, db: env.DB, secrets: env as unknown as Record<string, unknown> }, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);`,
      "    }",
    ],
  };
};
