// A TypeScript program over the generated SDK's own files. The blueprint modules they import are not in the evidence, so each is stood in by a module written
// from the model, and what the generator's helper types (`Declared`, `Of<…>`) compute from it is the checker's to say.
import { dirname, resolve } from "node:path/posix";
import ts from "typescript";
import type { FieldModel, Fields, ProjectModel } from "../../project-evidence/types.ts";

const ROOT = "/g/";
const SYNTHETIC = `${ROOT}__blueprint/`;

export interface Built {
  readonly program: ts.Program;
  readonly checker: ts.TypeChecker;
}

/**
 * The type the blueprint's schema for a field decodes to, from the model, tagged with the field it belongs to: an id or text is a string, a uint a bigint, a boolean a
 * boolean, a named schema an opaque object, each intersected with `{ __field: "<thing>.<field>" }`. A member that resolves to another field's tag is derived from the wrong field.
 */
const decoded = (field: FieldModel, tag: string): string => {
  const type = field.value.type;
  const marker = `{ readonly __field: ${JSON.stringify(tag)} }`;
  const base = type === "id" || type === "text" ? "string" : type === "uint" || type === "int" ? "bigint" : type === "boolean" || type === "bool" ? "boolean" : undefined;
  const tagged = base === undefined ? marker : `${base} & ${marker}`;
  return field.optional === true ? `(${tagged}) | undefined` : tagged;
};

/** The alias a field's stand-in is exported under. */
export const standInName = (field: string) => `Field_${field.replace(/\W/g, "_")}`;

const fieldsText = (fields: Fields, prefix: string) =>
  Object.entries(fields).map(([name, f]) => `readonly ${JSON.stringify(name)}: { readonly value: { readonly schema: { readonly Type: ${decoded(f, `${prefix}.${name}`)} } } };`).join(" ");

/** What `import type * as Source from "…/thing.ts"` and `* as Events from "…/events.ts"` give: the thing's fields and each event's, as the generator reads them. */
const thingModule = (model: ProjectModel, name: string) => [
  `export declare const thing: { readonly kind: "thing"; readonly fields: { ${fieldsText(model.things[name]?.fields ?? {}, name)} } };`,
  // Each field's stand-in by name, so a member can be compared with the type its own declaration decodes to.
  ...Object.entries(model.things[name]?.fields ?? {}).map(([field, f]) => `export type ${standInName(field)} = ${decoded({ ...f, optional: false }, `${name}.${field}`)};`),
].join("\n");
const eventsModule = (model: ProjectModel, name: string) =>
  Object.entries(model.things[name]?.events ?? {}).map(([event, fields]) => `export declare const ${event}: { readonly fields: { ${fieldsText(fields, `${name}.${event}`)} } };`).join("\n");

/** `import type * as <alias> from "<specifier>"`, by specifier. */
const importsOf = (text: string): ReadonlyArray<{ readonly alias: string; readonly specifier: string }> =>
  [...text.matchAll(/import\s+type\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']/g)].map((m) => ({ alias: m[1]!, specifier: m[2]! }));

const OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, strict: true, noEmit: true,
  skipLibCheck: true, allowImportingTsExtensions: true, types: [],
};

const build = (files: Readonly<Record<string, string>>, model: ProjectModel): Built => {
  const virtual = new Map<string, string>();
  for (const [path, text] of Object.entries(files)) if (path.startsWith("generated/sdk/")) virtual.set(`${ROOT}${path}`, text);
  /** Each SDK file's blueprint imports, resolved to the module written from the model: by the alias the generator gives them, for the thing whose folder the file is in. */
  const standIns = new Map<string, string>();
  for (const [path, text] of [...virtual]) {
    const thing = path.split("/")[5];
    if (thing === undefined || model.things[thing] === undefined) continue;
    for (const { alias, specifier } of importsOf(text)) {
      if (alias !== "Source" && alias !== "Events") continue;
      const file = `${SYNTHETIC}${thing}/${alias === "Source" ? "thing" : "events"}.ts`;
      virtual.set(file, alias === "Source" ? thingModule(model, thing) : eventsModule(model, thing));
      standIns.set(`${path}\n${specifier}`, file);
    }
  }
  const base = ts.createCompilerHost(OPTIONS, true);
  const host: ts.CompilerHost = {
    ...base,
    fileExists: (file) => virtual.has(file) || base.fileExists(file),
    readFile: (file) => virtual.get(file) ?? base.readFile(file),
    getSourceFile: (file, language, ...rest) => (virtual.has(file) ? ts.createSourceFile(file, virtual.get(file)!, language, true) : base.getSourceFile(file, language, ...rest)),
    resolveModuleNameLiterals: (literals, containing) => literals.map((literal) => {
      const specifier = literal.text;
      const candidate = specifier.startsWith(".") ? resolve(dirname(containing), specifier) : undefined;
      const found = standIns.get(`${containing}\n${specifier}`) ?? (candidate !== undefined && virtual.has(candidate) ? candidate : undefined);
      return { resolvedModule: found === undefined ? undefined : { resolvedFileName: found, extension: ts.Extension.Ts, isExternalLibraryImport: false } };
    }),
  };
  const program = ts.createProgram({ rootNames: [...virtual.keys()], options: OPTIONS, host });
  return { program, checker: program.getTypeChecker() };
};

const cache = new WeakMap<object, { readonly things: object; readonly built: Built }>();

/** The program over the SDK's files, built once for one evidence and model. */
export const programOf = (files: Readonly<Record<string, string>>, model: ProjectModel): Built => {
  const hit = cache.get(files);
  if (hit !== undefined && hit.things === model.things) return hit.built;
  const built = build(files, model);
  cache.set(files, { things: model.things, built });
  return built;
};

/** The synthetic module a thing's fields are written in, by path from the root. */
export const syntheticPath = (thing: string) => `__blueprint/${thing}/thing.ts`;

export const virtualPath = (path: string) => `${ROOT}${path}`;
