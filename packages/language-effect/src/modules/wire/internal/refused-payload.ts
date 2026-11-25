import { Effect } from "effect";
import { HttpServerResponse } from "effect/http";
import { HttpApiError } from "effect/http-api";

type Issue = { readonly _tag: string; readonly path?: ReadonlyArray<unknown>; readonly issue?: unknown; readonly issues?: ReadonlyArray<unknown> };

/** Where a payload is refused and why, never what it held: a value can be a password. The SDK's words, so a client reads one shape on both sides. */
const said = (issue: Issue, path: ReadonlyArray<unknown> = []): ReadonlyArray<string> => {
  const where = path.length === 0 ? "the payload" : path.map(String).join(".");
  const inner = (next: unknown, more: ReadonlyArray<unknown> = []) => said(next as Issue, [...path, ...more]);
  switch (issue._tag) {
    case "Pointer": return inner(issue.issue, issue.path);
    case "Encoding": return inner(issue.issue);
    case "Composite": return (issue.issues ?? []).flatMap((next) => inner(next));
    case "OneOf": return [`${where} matches more than one kind of value`];
    // A union none of whose members takes the value's kind (a list for an object) has no issues of its own.
    case "AnyOf": return issue.issues?.length ? issue.issues.flatMap((next) => inner(next)) : [`${where} is not the right kind of value`];
    case "MissingKey": return [`${where} is missing`];
    case "UnexpectedKey": return [`${where} is not expected`];
    case "InvalidType": return [`${where} is not the right kind of value`];
    case "Filter": return [`${where} does not satisfy its check`];
    default: return [`${where} is refused`];
  }
};

/** A payload its schema refused, as the decoder reported it. */
export const isRefusedPayload = (error: unknown): error is HttpApiError.HttpApiSchemaError =>
  HttpApiError.HttpApiSchemaError.is(error) && error.kind === "Payload";

/** The API's answer to a refused payload: 400, `{ _tag: "InvalidPayload", message }`, naming each refused field and why (#988). */
export const refusedPayload = (error: HttpApiError.HttpApiSchemaError) =>
  Effect.succeed(HttpServerResponse.jsonUnsafe({ _tag: "InvalidPayload", message: [...new Set(said(error.cause.issue as Issue))].join("; ") }, { status: 400 }));
