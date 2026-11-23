import type { OperationModel } from "../../project-evidence/types.ts";
import { Reading } from "../../reading/service.ts";
import { over } from "./over.ts";

/** operation.model: the operation is in the model with its kind, description, payload, answer, who may call, idempotency, budget and where it runs. */
export const model = over("operation.model", (op) => [
  ...(op.kind === "operation" || op.kind === "read" ? [] : [`its kind is ${op.kind}, expected operation or read`]),
  ...((op.description ?? "").trim() === "" ? ["it has no description"] : []),
  ...(op.allowed.length === 0 ? ["it says nobody may call it (allowed is empty)"] : []),
  ...(typeof op.budget?.p95Ms === "number" ? [] : ["it declares no p95 budget"]),
  ...(op.idempotent === undefined ? ["the model does not say whether it is idempotent (idempotent is missing, null means not)"] : []),
  ...(op.runs === undefined ? ["the model does not say where it runs"] : []),
  ...(typeof op.payload === "object" && typeof op.answer === "object" ? [] : ["its payload or answer is not in the model"]),
]);

/** The error classes an endpoint lists: `error: [LinkNotListed, NotAllowed]`. */
const endpointErrors = (source: string): ReadonlyArray<string> | undefined => {
  const found = /\berror: \[([^\]]*)\]/.exec(source);
  return found === null ? undefined : found[1]!.split(",").map((n) => n.trim()).filter((n) => n !== "");
};

/**
 * The HTTP method a client calls each kind with (design/history/retired-2026-11-23/frame/projections.md: "Journeys call the server directly over HTTP", `POST` to
 * `/<thing>/<verb>` for an operation and for a read alike). Judged from the model's kind, never from a name typed in an eval.
 */
const METHOD: Readonly<Record<string, string>> = { operation: "post", read: "post" };

const endpointProblems = (path: string, source: string, op: OperationModel): ReadonlyArray<string> => {
  const found = Reading.endpoints(source).filter((x) => x.name === op.verb && x.path === `/${op.thing}/${op.verb}`);
  if (found.length === 0) return [`${path} has no endpoint "${op.verb}" at /${op.thing}/${op.verb}`];
  const method = METHOD[op.kind];
  return method === undefined || found.some((x) => x.method === method) ? [] : [`${path}'s endpoint ${op.verb} is ${found[0]!.method.toUpperCase()}, but ${op.kind === "operation" ? "an" : "a"} ${op.kind} is called with ${method.toUpperCase()} (design/history/retired-2026-11-23/frame/projections.md)`];
};

/** operation.api: one endpoint at `/<thing>/<verb>` with the declaration's own schemas, listing every refusal the model gives the operation. */
export const api = over("operation.api", (op, e) => {
  const path = `generated/api/src/${op.thing}/${op.verb}.ts`;
  const source = e.files[path];
  if (source === undefined) return [`${path} was not generated`];
  const index = e.files["generated/api/src/index.ts"] ?? "";
  const text = Reading.code(source);
  const listed = endpointErrors(text);
  const want = [...(op.refusals ?? [])].sort();
  return [
    ...endpointProblems(path, source, op),
    ...(text.includes("declaration.payloadSchema") ? [] : [`${path}'s payload is not the declaration's own schema`]),
    ...(text.includes("declaration.answer") ? [] : [`${path}'s answer is not the declaration's own answer`]),
    ...(listed === undefined ? [`${path} lists no error classes`] : JSON.stringify([...listed].sort()) === JSON.stringify(want) ? [] : [`${path} lists errors [${[...listed].sort().join(", ")}], the model gives [${want.join(", ")}]`]),
    ...(new RegExp(`["'\`]${op.name.replace(/\./g, "\\.")}["'\`]\\s*:`).test(Reading.code(index)) ? [] : [`generated/api/src/index.ts's operations table has no "${op.name}"`]),
  ];
});

/** A module specifier as a path from the folder it is written in: `./remove.ts` is `remove.ts`. */
const module = (specifier: string | undefined) => specifier?.replace(/^\.\//, "");

/** operation.sdk: one function named for the verb, the description as its doc comment, exported through its thing's group. */
export const sdk = over("operation.sdk", (op, e) => {
  const path = `generated/sdk/src/${op.thing}/${op.verb}.ts`;
  const source = e.files[path];
  if (source === undefined) return [`${path} was not generated`];
  const group = e.files[`generated/sdk/src/${op.thing}/index.ts`] ?? "";
  const root = e.files["generated/sdk/src/index.ts"] ?? "";
  // The group is the thing's identifier with a lower-case first letter (`ApiKey` is `apiKey`), the way the SDK exports it.
  const fn = op.identifier ?? op.verb;
  const identifier = e.model.things[op.thing]?.identifier ?? op.thing;
  const groupName = identifier.charAt(0).toLowerCase() + identifier.slice(1);
  // The function is any exported value of that name (a const or a function), its doc comment the description as words (formatting off).
  const documented = Reading.exportedValues(source).find((v) => v.name === fn);
  const said = (text: string | undefined) => Reading.plain(text ?? "").replace(/\s+/g, " ").trim();
  return [
    ...(documented !== undefined && said(documented.doc) === said(op.description) ? [] : [`${path} does not export ${fn} under the doc comment "${op.description ?? ""}"`]),
    // The group takes `fn` from the verb's own file (`export { fn } from "./verb.ts"`, with or without an `as fn`, or `export * from "./verb.ts"`); the
    // root takes the whole of the thing's group (`export * as group from "./thing/index.ts"`). A name exported from another module is not the function.
    ...(Reading.exportedNames(group).some((n) => module(n.from) === `${op.verb}.ts` && ((n.exported === fn && n.local === fn) || n.exported === "*")) ? [] : [`the ${op.thing} group does not export ${fn} from ./${op.verb}.ts`]),
    ...(Reading.exportedNames(root).some((n) => n.exported === groupName && n.local === "*" && module(n.from) === `${op.thing}/index.ts`) ? [] : [`the SDK does not export the ${op.thing} group as ${groupName} from ./${op.thing}/index.ts`]),
  ];
});
