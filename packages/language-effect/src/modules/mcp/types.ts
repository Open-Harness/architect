// The remote MCP server: one tool per operation and read, on the MCP SDK's stateless web-standard streamable HTTP
// transport (D3 #122). A tool is the operation's own call, as the person the access token names, so the role check is the
// API's. Only public fields are in a tool's input or its answer; a field private to roles is shown to a caller who holds one.
import type { Effect } from "effect";
import type { FieldsInput, Operation, Principal, Read, Thing } from "orthograph";
import type { Store } from "#modules/records/types.js";

/** What a tool calls: an operation, a read by id, or a list read (whose payload and answer differ from a read by id). */
export type McpOperation = Operation | Read<Thing, unknown, unknown>;

/** What the generated `mcp` catalog says of each operation and read, by its name (`allowance.get`). */
export interface McpEntry {
  readonly description: string;
  readonly operation: McpOperation;
  /** The states of the thing's machine, when it has one: a `state` in the answer is one of them. */
  readonly states?: ReadonlyArray<string>;
  /** The move the operation makes, when it makes one: the tool lists it, so an agent knows which states a call moves between. */
  readonly move?: McpMove;
}

/** A move of the thing's machine, as a tool lists it. */
export interface McpMove {
  readonly key: string;
  readonly from: ReadonlyArray<string>;
  readonly to: ReadonlyArray<string>;
  readonly emits: string;
}

/** One refusal's row of the generated `refusals` table: its code, the CLI's exit and the HTTP status (K16, M1.47). */
export interface McpRefusalRow {
  readonly code: string;
  readonly exit: number;
  readonly status: number;
}

/** The refusals of a project: each one's code, the declared error's fields (a machine's own refusal has none declared), and the table. */
export interface McpRefusals {
  readonly codes: { readonly [tag: string]: string };
  readonly declared: { readonly [tag: string]: { readonly fields: FieldsInput } };
  /** The generated `refusals` table: a refusal's result carries its row, so an agent tells a refusal from a defect without parsing. */
  readonly table?: { readonly [tag: string]: McpRefusalRow };
}

/** What a tool answers: MCP content, `isError` for a refusal. */
export interface McpResult {
  readonly isError: boolean;
  /** The answer as one line of JSON (bigints as text), or the refusal's `[AL-001] Name { field: value }`. */
  readonly text: string;
  /** The answer's shown fields; for a refusal, `{ refusal, code, exit, status }` and the fields the caller may see. */
  readonly structured?: { readonly [field: string]: unknown };
}

export interface McpTool<R> {
  readonly name: string;
  readonly description: string;
  /** JSON Schema of the arguments: the operation's payload, from the model's declaration, its public fields only. */
  readonly input: { readonly [key: string]: unknown };
  /** JSON Schema of the answer an agent is shown (M1.37); absent when the answer has no fields. */
  readonly output?: { readonly [key: string]: unknown };
  /** The move the call makes (`_meta` in `tools/list`), when it makes one. */
  readonly move?: McpMove;
  /** A read changes nothing. */
  readonly readOnly: boolean;
  /** Some `allowed` entry admits an agent: only then is an agent shown the tool. Absent: shown. */
  readonly agentTool?: boolean;
  /** Never fails: a refusal is a result, and a defect is told as `[AR-500]` without its detail. */
  readonly call: (args: { readonly [field: string]: unknown }, principal: Principal) => Effect.Effect<McpResult, never, R>;
}

/** An operation or read served: `run` takes the payload already decoded, as the API's handlers do. */
export interface McpServed<R> {
  readonly run: (payload: never, principal: Principal) => Effect.Effect<unknown, unknown, R>;
}

export interface McpApi {
  /** One tool for each entry of the catalog, each calling its served operation. */
  readonly tools: <R>(spec: {
    readonly catalog: { readonly [name: string]: McpEntry };
    readonly served: { readonly [name: string]: McpServed<R> };
    readonly refusals: McpRefusals;
  }) => ReadonlyArray<McpTool<R | Store>>;
  /**
   * Answer one MCP request, stateless: a server made for it and let go, the caller already known. `run` is how the host
   * runs a tool's effect (its services, its tracing). Initialize, `tools/list` and `tools/call` are all it speaks.
   */
  readonly handle: <R>(spec: {
    readonly name: string;
    readonly version: string;
    readonly tools: ReadonlyArray<McpTool<R>>;
    readonly principal: Principal;
    readonly run: (effect: Effect.Effect<McpResult, never, R>) => Promise<McpResult>;
  }, request: Request) => Promise<Response>;
}
