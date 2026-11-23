// Generated TypeScript, read as TypeScript: the compiler's own parser, so a comment, a missing semicolon, a line break, a quote style, or one
// declaration syntax in place of its equivalent (an alias or an interface, a const or a function) cannot change what a declaration says.
import ts from "typescript";

const parse = (source: string) => ts.createSourceFile("generated.ts", source, ts.ScriptTarget.Latest, true);
const isExported = (node: ts.Node) => ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
const stringOf = (node: ts.Node | undefined) => (node !== undefined && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : undefined);
const nameOf = (name: ts.PropertyName | undefined) => (name !== undefined && (ts.isIdentifier(name) || ts.isStringLiteral(name)) ? name.text : undefined);

/** The string literals a type names (`"listed" | "removed"`), wherever they are in it: a comment, or a literal in another declaration, is not one. */
const literalsOf = (type: ts.TypeNode | undefined): ReadonlyArray<string> => {
  const found: Array<string> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isLiteralTypeNode(node) && stringOf(node.literal) !== undefined) found.push(stringOf(node.literal)!);
    ts.forEachChild(node, visit);
  };
  if (type !== undefined) visit(type);
  return found;
};

const membersOf = (members: ReadonlyArray<ts.TypeElement>) => members.flatMap((m) => (ts.isPropertySignature(m) ? [m] : []));

export interface ExportedType {
  readonly name: string;
  /** What the type names: the literals of an alias's type, or of an enum's values. */
  readonly literals: ReadonlyArray<string>;
  /** The literals of the type's own `state` property (an interface, or an alias of an object type); empty when it has none. */
  readonly stateLiterals: ReadonlyArray<string>;
  /** The property names of an interface or an alias of an object type. */
  readonly members: ReadonlyArray<string>;
  /** Each property's type as written (spacing collapsed) and whether it is optional (`?`), by property name. */
  readonly memberTypes: Readonly<Record<string, { readonly type: string; readonly optional: boolean }>>;
  /** The type an alias of a non-object type is written as (`"listed" | "removed"`), spacing collapsed; empty for the rest. */
  readonly aliasOf: string;
}

/** The exported types of a TypeScript source: aliases, interfaces and enums alike. */
export const exportedTypes = (source: string): ReadonlyArray<ExportedType> =>
  parse(source).statements.flatMap((s): ReadonlyArray<ExportedType> => {
    if (!isExported(s)) return [];
    const ofMembers = (name: string, members: ReadonlyArray<ts.TypeElement>, literals: ReadonlyArray<string>): ExportedType => {
      const props = membersOf(members);
      const memberTypes = Object.fromEntries(props.map((m) => [nameOf(m.name) ?? "", { type: m.type === undefined ? "" : m.type.getText().replace(/\s+/g, " "), optional: m.questionToken !== undefined }] as const));
      return { name, literals, stateLiterals: props.filter((m) => nameOf(m.name) === "state").flatMap((m) => literalsOf(m.type)), members: props.map((m) => nameOf(m.name) ?? ""), memberTypes, aliasOf: "" };
    };
    if (ts.isTypeAliasDeclaration(s)) return [ts.isTypeLiteralNode(s.type) ? ofMembers(s.name.text, s.type.members, literalsOf(s.type)) : { name: s.name.text, literals: literalsOf(s.type), stateLiterals: [], members: [], memberTypes: {}, aliasOf: s.type.getText().replace(/\s+/g, " ") }];
    if (ts.isInterfaceDeclaration(s)) return [ofMembers(s.name.text, s.members, [])];
    if (ts.isEnumDeclaration(s)) return [{ name: s.name.text, literals: s.members.flatMap((m) => stringOf(m.initializer) ?? []), stateLiterals: [], members: s.members.map((m) => nameOf(m.name) ?? ""), memberTypes: {}, aliasOf: "" }];
    return [];
  });

/** The calls `HttpApiEndpoint.<method>(<name>, <path>, …)`, whatever their formatting; one in a comment is no call. */
export const endpoints = (source: string): ReadonlyArray<{ readonly method: string; readonly name: string; readonly path: string }> => {
  const found: Array<{ method: string; name: string; path: string }> = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "HttpApiEndpoint") {
      const name = stringOf(node.arguments[0]);
      const path = stringOf(node.arguments[1]);
      if (name !== undefined && path !== undefined) found.push({ method: node.expression.name.text, name, path });
    }
    ts.forEachChild(node, visit);
  };
  visit(parse(source));
  return found;
};

/** The comment written just above a declaration (`/** … *\/`), as its text. */
const docOf = (source: string, node: ts.Node): string | undefined => {
  const ranges = ts.getLeadingCommentRanges(source, node.getFullStart()) ?? [];
  const last = ranges[ranges.length - 1];
  return last === undefined ? undefined : source.slice(last.pos, last.end).replace(/^\/\*+\s*|\s*\*+\/$/g, "").replace(/^\s*\*\s?/gm, "").trim();
};

/** What a source exports as a value, with the doc comment above it: `export const f = …` and `export function f() {}` alike. */
export const exportedValues = (source: string): ReadonlyArray<{ readonly name: string; readonly doc: string | undefined }> =>
  parse(source).statements.flatMap((s) => {
    if (!isExported(s)) return [];
    if (ts.isFunctionDeclaration(s) && s.name !== undefined) return [{ name: s.name.text, doc: docOf(source, s) }];
    if (ts.isVariableStatement(s)) return s.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [{ name: d.name.text, doc: docOf(source, s) }] : []));
    return [];
  });

/** One name a source makes available: how it is exported, what it is in the module it comes from, and that module (`undefined` when it is declared here). */
export interface ExportedName {
  readonly exported: string;
  /** The name in the module it comes from; `*` for a whole module (`export * as ns`, `export *`). */
  readonly local: string;
  /** The module specifier, as written (`./remove.ts`). */
  readonly from: string | undefined;
}

/**
 * The names a source makes available: its own exports; `export { a, b as c } from "…"`, each with the name it has in that module; `export * as ns from "…"`,
 * the whole module as `ns`; and `export * from "…"`, whose names are not known here, as the name `*`.
 */
export const exportedNames = (source: string): ReadonlyArray<ExportedName> =>
  parse(source).statements.flatMap((s): ReadonlyArray<ExportedName> => {
    if (ts.isExportDeclaration(s)) {
      const from = stringOf(s.moduleSpecifier);
      if (s.exportClause === undefined) return [{ exported: "*", local: "*", from }];
      return ts.isNamedExports(s.exportClause)
        ? s.exportClause.elements.map((e) => ({ exported: e.name.text, local: (e.propertyName ?? e.name).text, from }))
        : [{ exported: s.exportClause.name.text, local: "*", from }];
    }
    if (!isExported(s)) return [];
    const own = (name: string): ExportedName => ({ exported: name, local: name, from: undefined });
    if ((ts.isFunctionDeclaration(s) || ts.isClassDeclaration(s) || ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s) || ts.isEnumDeclaration(s)) && s.name !== undefined) return [own(s.name.text)];
    return ts.isVariableStatement(s) ? s.declarationList.declarations.flatMap((d) => (ts.isIdentifier(d.name) ? [own(d.name.text)] : [])) : [];
  });

/** An exported class as code without its comments, however it is broken over lines; `undefined` when there is none. */
export const classText = (source: string, name: string): string | undefined => {
  const file = parse(source);
  const found = file.statements.find((s): s is ts.ClassDeclaration => ts.isClassDeclaration(s) && isExported(s) && s.name?.text === name);
  return found === undefined ? undefined : ts.createPrinter({ removeComments: true }).printNode(ts.EmitHint.Unspecified, found, file).replace(/\s+/g, " ");
};

/** A source as code alone: every comment taken off, so a word in a comment cannot make a check pass. */
export const code = (source: string): string => ts.createPrinter({ removeComments: true }).printFile(parse(source));

/** The rows of `export const <name> ={ Row: { a: 1, b: "x" }, … }`: each row's literal properties, in any layout. */
export const objectRows = (source: string, name: string): Readonly<Record<string, Readonly<Record<string, string | number>>>> | undefined => {
  const declaration = parse(source).statements.flatMap((s) => (ts.isVariableStatement(s) && isExported(s) ? s.declarationList.declarations : [])).find((d) => ts.isIdentifier(d.name) && d.name.text === name);
  const unwrap = (e: ts.Expression | undefined): ts.Expression | undefined => (e !== undefined && (ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isParenthesizedExpression(e)) ? unwrap(e.expression) : e);
  const object = unwrap(declaration?.initializer);
  if (object === undefined || !ts.isObjectLiteralExpression(object)) return undefined;
  return Object.fromEntries(object.properties.flatMap((p): ReadonlyArray<readonly [string, Readonly<Record<string, string | number>>]> => {
    const row = ts.isPropertyAssignment(p) ? unwrap(p.initializer) : undefined;
    const key = ts.isPropertyAssignment(p) ? nameOf(p.name) : undefined;
    if (row === undefined || key === undefined || !ts.isObjectLiteralExpression(row)) return [];
    const values = row.properties.flatMap((q): ReadonlyArray<readonly [string, string | number]> => {
      const k = ts.isPropertyAssignment(q) ? nameOf(q.name) : undefined;
      const v = ts.isPropertyAssignment(q) ? q.initializer : undefined;
      if (k === undefined || v === undefined) return [];
      return ts.isNumericLiteral(v) ? [[k, Number(v.text)] as const] : stringOf(v) !== undefined ? [[k, stringOf(v)!] as const] : [];
    });
    return [[key, Object.fromEntries(values)] as const];
  }));
};
