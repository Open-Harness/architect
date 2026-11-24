// Declared instances: a thing made at the first deploy by the blueprint, as the same create a person would call.
import type { Thing } from "#modules/things/types.js";

export interface Declared<T extends Thing = Thing, V = unknown> {
  readonly kind: "declared";
  readonly thing: T;
  readonly values: V;
}

export interface DeclareApi {
  /**
   * `Blueprint.declare(Superagent, { name, purpose, connections, … })`: one instance of `thing`, in a file of
   * `blueprint/agents/`, made by its create at the first deploy. Whatever the file lists must be plain data.
   */
  readonly declare: <T extends Thing, V>(thing: T, values: V) => Declared<T, V>;
}
