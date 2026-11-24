// The shape of one generated action module, read as syntax (check 09): K29 section 3.1 draws it, and `run` is a single `host.call`, so
// nothing else can sit in it: no state, no memo, no side effect at import, no branch on the caller, no answer dropped, no refusal swallowed.
// Returns what is wrong, as sentences; an empty list is a module of exactly that shape.
import ts from "typescript";

/** What `options(host)`'s object may carry, by property, and what each holds. */
const LITERAL_KEYS = ["name", "description"] as const;
const FLAG_KEYS = ["readOnly", "needsApproval", "agentTool"] as const;
const ANY_KEYS = ["schema", "outputSchema", "mcpTool"] as const;

const textOf = (node: ts.Node | undefined): string | undefined =>
  node === undefined ? undefined : ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isIdentifier(node) ? node.text : undefined;

const nameOf = (name: ts.PropertyName): string | undefined => (ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined);

/** `client.thing.verb` or `client["thing"]["verb"]` (or a mix): the names after `client`, or undefined when it is anything else. */
const pathAfter = (node: ts.Expression, root: string): ReadonlyArray<string> | undefined => {
  if (ts.isIdentifier(node)) return node.text === root ? [] : undefined;
  if (ts.isPropertyAccessExpression(node)) { const up = pathAfter(node.expression, root); return up === undefined ? undefined : [...up, node.name.text]; }
  if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) { const up = pathAfter(node.expression, root); return up === undefined ? undefined : [...up, node.argumentExpression.text]; }
  return undefined;
};

export const shapeProblems = (source: string, want: { readonly thing: string; readonly verb: string }): ReadonlyArray<string> => {
  const file = ts.createSourceFile("action.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const problems: Array<string> = [];
  const optionsStatements = file.statements.filter((s): s is ts.VariableStatement => ts.isVariableStatement(s));
  for (const statement of file.statements) {
    if (ts.isImportDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) continue;
    if (statement === optionsStatements[0] && optionsStatements.length === 1) continue;
    problems.push(`a top-level ${ts.SyntaxKind[statement.kind]} (only imports, types and \`export const options\` may stand at the top of a module): ${statement.getText(file).slice(0, 60)}`);
  }
  const statement = optionsStatements[0];
  const declaration = statement?.declarationList.declarations[0];
  if (statement === undefined || optionsStatements.length !== 1 || statement.declarationList.declarations.length !== 1 || declaration === undefined) return [...problems, "there is not exactly one `export const options`"];
  const exported = statement.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) === true;
  if (!exported || !ts.isIdentifier(declaration.name) || declaration.name.text !== "options" || (statement.declarationList.flags & ts.NodeFlags.Const) === 0) problems.push("the one statement is not `export const options`");
  const init = declaration.initializer;
  if (init === undefined || !ts.isArrowFunction(init) || init.parameters.length !== 1 || !ts.isIdentifier(init.parameters[0]!.name)) return [...problems, "options is not an arrow function of one parameter, the host"];
  const host = (init.parameters[0]!.name as ts.Identifier).text;
  let body: ts.Node = init.body;
  if (!ts.isParenthesizedExpression(body) || !ts.isObjectLiteralExpression(body.expression)) return [...problems, "options does not return one object literal at once (no statements inside it)"];
  body = body.expression;
  const seen = new Set<string>();
  for (const property of (body as ts.ObjectLiteralExpression).properties) {
    if (!ts.isPropertyAssignment(property)) { problems.push(`the options object has a ${ts.SyntaxKind[property.kind]} (spread, method or accessor); only plain properties`); continue; }
    const key = nameOf(property.name);
    if (key === undefined) { problems.push("the options object has a computed property name"); continue; }
    if (seen.has(key)) problems.push(`${key} appears twice`);
    seen.add(key);
    const value = property.initializer;
    if ((LITERAL_KEYS as ReadonlyArray<string>).includes(key)) { if (!(ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))) problems.push(`${key} is not a string literal`); }
    else if ((FLAG_KEYS as ReadonlyArray<string>).includes(key)) { if (value.kind !== ts.SyntaxKind.TrueKeyword && value.kind !== ts.SyntaxKind.FalseKeyword) problems.push(`${key} is not a literal true or false`); }
    else if (key === "errors") {
      if (!ts.isObjectLiteralExpression(value) || !value.properties.every((p) => ts.isPropertyAssignment(p) && nameOf(p.name) !== undefined && ts.isStringLiteral(p.initializer))) problems.push("errors is not an object literal of string literals (tag: code)");
    } else if (key === "run") {
      problems.push(...runProblems(value, host, want));
    } else if (!(ANY_KEYS as ReadonlyArray<string>).includes(key)) {
      problems.push(`${key} is not a field the actions have`);
    }
  }
  if (!seen.has("run")) problems.push("there is no run");
  return problems;
};

/** `run: (args, ctx) => host.call((client) => client.<thing>.<verb>({ payload: args }), ctx)`: nothing before the call, nothing after it, nothing else in it. */
const runProblems = (value: ts.Expression, host: string, want: { readonly thing: string; readonly verb: string }): ReadonlyArray<string> => {
  if (!ts.isArrowFunction(value) || value.parameters.length < 1 || value.parameters.length > 2 || !value.parameters.every((p) => ts.isIdentifier(p.name))) return ["run is not an arrow function of (args, ctx)"];
  const [args, ctx] = value.parameters.map((p) => (p.name as ts.Identifier).text);
  const call = value.body;
  const shape = "run must be `(args, ctx) => host.call((client) => client.<thing>.<verb>({ payload: args }), ctx)` and nothing else";
  if (!ts.isCallExpression(call) || !ts.isPropertyAccessExpression(call.expression) || !ts.isIdentifier(call.expression.expression) || call.expression.expression.text !== host || call.expression.name.text !== "call") return [`run does not return a call of ${host}.call: ${shape}`];
  if (call.arguments.length !== 2 || ctx === undefined || textOf(call.arguments[1]) !== ctx || !ts.isIdentifier(call.arguments[1]!)) return [`${host}.call is not given the context as its second and last argument: ${shape}`];
  const use = call.arguments[0]!;
  if (!ts.isArrowFunction(use) || use.parameters.length !== 1 || !ts.isIdentifier(use.parameters[0]!.name) || !ts.isCallExpression(use.body)) return [`the first argument of ${host}.call is not \`(client) => client.<thing>.<verb>(...)\`: ${shape}`];
  const client = (use.parameters[0]!.name as ts.Identifier).text;
  const names = pathAfter(use.body.expression, client);
  if (names === undefined || names.length !== 2 || names[0] !== want.thing || names[1] !== want.verb) return [`the SDK call is ${names === undefined ? "not client.<thing>.<verb>" : `client.${names.join(".")}`}, this operation's is client.${want.thing}.${want.verb}`];
  const only = use.body.arguments;
  const object = only.length === 1 ? only[0] : undefined;
  const props = object !== undefined && ts.isObjectLiteralExpression(object) ? object.properties : undefined;
  const first = props?.length === 1 ? props[0] : undefined;
  const given = first !== undefined && ts.isPropertyAssignment(first) && nameOf(first.name) === "payload" ? first.initializer : first !== undefined && ts.isShorthandPropertyAssignment(first) && first.name.text === "payload" ? undefined : null;
  if (given === null || (given !== undefined && !(ts.isIdentifier(given) && given.text === args))) return [`the SDK is not called with exactly { payload: ${args} }: ${shape}`];
  if (given === undefined && args !== "payload") return [`the SDK is not called with exactly { payload: ${args} }`];
  return [];
};
