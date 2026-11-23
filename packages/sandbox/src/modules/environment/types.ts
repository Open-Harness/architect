import { Data, type Effect } from "effect";

/** A variable's name looks like a credential: it is refused, whatever the value. */
export class CredentialLikeVariable extends Data.TaggedError("CredentialLikeVariable")<{ readonly variable: string }> {}

/** A variable's name is not an environment name, or is given twice. */
export class BadVariableName extends Data.TaggedError("BadVariableName")<{ readonly variable: string }> {}

export type VariableSource = "built-in" | "source" | "settings";

export interface EnvVar {
  readonly name: string;
  readonly from: VariableSource;
  readonly value: string;
}

/** A variable the app gives: a source's `environment.of`, or Settings' `variables`. */
export interface Given {
  readonly name: string;
  readonly value: string;
  readonly from?: "source" | "settings";
}

export interface EnvironmentSpec {
  /** The superagent: `SUPERAGENT_NAME`. */
  readonly owner: string;
  /** The ticket: `SUPERAGENT_TICKET`. */
  readonly tag: string;
  /** The sandbox's folder: `SUPERAGENT_DIR`. */
  readonly root: string;
  readonly blocked: ReadonlyArray<string>;
  readonly variables: ReadonlyArray<Given>;
}

export interface EnvironmentApi {
  readonly of: (spec: EnvironmentSpec) => Effect.Effect<ReadonlyArray<EnvVar>, CredentialLikeVariable | BadVariableName>;
  /** The whole environment of a process: the variables, `PATH` with `shims` in front, `HOME` and `LANG`. */
  readonly processEnv: (variables: ReadonlyArray<EnvVar>, where: { readonly root: string; readonly shims: string; readonly systemPath: string }) => Readonly<Record<string, string>>;
}
