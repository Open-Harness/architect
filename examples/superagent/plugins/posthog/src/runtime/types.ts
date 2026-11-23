// Generated from PostHog API 1.0.0. Do not edit.
// What a generated adapter keeps of its spec: a JSON schema is the spec's own text, and a `$ref` names a schema of the
// components table, by the same string the spec writes (`#/components/schemas/issue`).
export type JsonSchema = { readonly [key: string]: unknown };
export type Components = Readonly<Record<string, JsonSchema>>;

/** One thing a caller supplies: it goes in the path, the query or the body, under the spec's own name. */
export interface Param {
  readonly name: string;
  readonly in: "path" | "query" | "body";
  readonly required: boolean;
  readonly schema: JsonSchema;
}

/** One call: its name as groups (`["issues", "createComment"]`), its request, and the schema of each success answer it documents, by status (null: no body). */
export interface Operation {
  readonly name: ReadonlyArray<string>;
  readonly method: "get" | "post" | "put" | "patch" | "delete";
  /** The path with its base path (Swagger's `basePath`) in front. */
  readonly path: string;
  readonly params: ReadonlyArray<Param>;
  readonly successes: ReadonlyArray<{ readonly status: number; readonly schema: JsonSchema | null }>;
}

/** One event: the payloads its service sends, one schema per action it documents. */
export type EventPayloads = Readonly<Record<string, ReadonlyArray<JsonSchema>>>;
