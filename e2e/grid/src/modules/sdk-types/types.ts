// What the generated SDK's types resolve to, judged with the TypeScript checker over the SDK's own files.
import type { ProjectModel, ThingModel } from "../project-evidence/types.ts";

export interface SdkTypesInput {
  /** Every generated file, by path from the project's root: the SDK's are loaded into the program. */
  readonly files: Readonly<Record<string, string>>;
  readonly model: ProjectModel;
  readonly thing: ThingModel;
  /** The SDK file that declares the thing's type (`generated/sdk/src/link/types.ts`). */
  readonly path: string;
}

export interface SdkTypesApi {
  /**
   * What is wrong with each member of the thing's type, against its model field: it must exist; resolve to the kind the model says (string for an id or text,
   * number or bigint for a uint or int, boolean for a boolean, anything real for a named schema: never `any`, `unknown`, `never`, an index signature, a `Promise`
   * or a boxed `Number`); be optional exactly when a call may leave the field out; and the type itself must have no index signature.
   */
  readonly fieldProblems: (input: SdkTypesInput) => ReadonlyArray<string>;
  /**
   * What is wrong with the thing's state: its `state` member must resolve to exactly the machine's states (a union of those string literals and nothing else),
   * and so must each exported `<Thing>State`, `<Thing>States` and `<Thing>Status`.
   */
  readonly stateProblems: (input: SdkTypesInput & { readonly states: ReadonlyArray<string> }) => ReadonlyArray<string>;
}
