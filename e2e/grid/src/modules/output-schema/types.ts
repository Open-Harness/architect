// What an MCP tool's output schema must do, judged by validating real-shaped values against it with the MCP SDK's own validator.
import type { OperationModel, ProjectModel } from "../project-evidence/types.ts";
import type { SpanView } from "../refusal-evals/types.ts";

export interface OutputSchemaInput {
  readonly model: ProjectModel;
  readonly op: OperationModel;
  /** The tool's `outputSchema` exactly as `tools/list` gave it. */
  readonly schema: unknown;
  /** The spans of the prove run: an answer field's real value is read from `answer.<field>` on the operation's span. */
  readonly spans?: ReadonlyArray<SpanView> | undefined;
  /** The generated files: the refusal table (`generated/api/src/errors.ts`) gives each refusal's code, exit and status. */
  readonly files?: Readonly<Record<string, string>> | undefined;
}

export interface OutputSchemaApi {
  /**
   * What is wrong with the schema as the type of `op`'s results: it must accept an answer built from the operation's declared answer fields
   * (a real value from the run where the spans hold one), accept each refusal the operation can give, refuse `{}`, and refuse each answer field
   * given a value of the wrong type. Empty when it does all of that, and for an operation whose answer has no fields.
   */
  readonly answers: (input: OutputSchemaInput) => ReadonlyArray<string>;
  /** What is wrong with the schema as the type of a `state` the answer carries: each state of `states` is accepted, one that is not a state is refused. */
  readonly states: (input: OutputSchemaInput & { readonly states: ReadonlyArray<string> }) => ReadonlyArray<string>;
}
