import type { Node, Rule } from "../types.ts";

type Visitors = ReturnType<Rule["create"]>;

/** The module a source node names: a string literal, a literal type, or a template with no holes. */
const moduleName = (source: unknown): string | undefined => {
  const node = source as Node | undefined;
  if (node?.type === "TSLiteralType") return moduleName(node["literal"]);
  if (node?.type === "Literal" && typeof node["value"] === "string") return node["value"];
  if (node?.type === "TemplateLiteral") {
    const quasis = node["quasis"] as ReadonlyArray<{ value: { cooked?: string } }>;
    if (quasis.length === 1) return quasis[0]?.value.cooked;
  }
};

/** Visitors that call `seen` for every module a file reaches: imports, export-froms, dynamic imports, import types and `require`. */
export const everyImport = (seen: (node: Node, name: string) => void): Visitors => {
  const check = (node: Node, source: unknown) => {
    const name = moduleName(source);
    if (name !== undefined) seen(node, name);
  };
  const checkSource = (node: Node) => check(node, node["source"]);
  return {
    ImportDeclaration: checkSource,
    ExportNamedDeclaration: checkSource,
    ExportAllDeclaration: checkSource,
    ImportExpression: checkSource,
    TSImportType: (node) => check(node, node["source"] ?? node["argument"]),
    TSExternalModuleReference: (node) => check(node, node["expression"]),
    CallExpression: (node) => {
      const callee = node["callee"] as Node | undefined;
      if (callee?.type === "Identifier" && callee["name"] === "require") {
        check(node, (node["arguments"] as ReadonlyArray<Node>)[0]);
      }
    },
  };
};
