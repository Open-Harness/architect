// The runtime a generated plugin carries lives in `runtime/*.ts`, real code that is type-checked and tested here. `tsc`
// does not ship a `.ts` file as one, so the generator reads the runtime from `runtime-sources.ts`, which is those files as
// strings. `scripts/embed-runtime.ts` writes it; a test fails when it is out of date.
export const RUNTIME_NAMES = ["types", "json-schema", "client"] as const;

/** The text of `runtime-sources.ts` for these sources, one string per runtime file. */
export const embeddedText = (sources: Readonly<Record<(typeof RUNTIME_NAMES)[number], string>>): string =>
  [
    "// Generated from internal/runtime/*.ts by scripts/embed-runtime.ts. Do not edit.",
    "// The generator's runtime files as text, so a built package needs no source folder (internal/embed.ts says why).",
    "",
    "export const RUNTIME: Readonly<Record<string, string>> = {",
    ...RUNTIME_NAMES.map((name) => `  ${JSON.stringify(name)}: ${JSON.stringify(sources[name])},`),
    "};",
    "",
  ].join("\n");
