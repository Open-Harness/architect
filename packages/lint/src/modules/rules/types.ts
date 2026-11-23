// The ortho lint rules: what the types can't see, as an oxlint JS plugin (`ortho/*`). Each rule gets what the
// project declares through one options object, which `ortho check` writes from the model (rules have no types).

/** What `ortho check` tells every rule about the project. */
export interface ProjectFacts {
  /** The project's root, absolute: rules see absolute file names and judge them by their path from here. */
  readonly root: string;
  /** Every declared name: operations, steps, events and errors. None may be written as a string outside generated/. */
  readonly names: ReadonlyArray<string>;
  /** Every declared error class name, across all things. */
  readonly errors: ReadonlyArray<string>;
  /** Each handler file (from the root) and the errors its operation declares. */
  readonly handlers: Readonly<Record<string, ReadonlyArray<string>>>;
  /** Required runner keys per handler file. */
  readonly requiredSteps?: Readonly<Record<string, ReadonlyArray<string>>>;
  /** Per handler file, the outcomes of its move when it has more than one: each should be named in a `move("…")`. */
  readonly outcomes?: Readonly<Record<string, ReadonlyArray<string>>>;
}

/** The subset of oxlint's (ESLint's) rule context the rules use. */
export interface Context {
  readonly options: ReadonlyArray<unknown>;
  readonly filename: string;
  /** The directory oxlint runs in: the repository's own rules judge a file by its path from here. */
  readonly cwd: string;
  readonly sourceCode: {
    readonly getText: (node?: Node) => string;
    readonly text: string;
    readonly getAllComments: () => ReadonlyArray<{ readonly range?: readonly [number, number]; readonly start?: number; readonly end?: number }>;
  };
  readonly report: (r: { readonly node: Node; readonly message: string }) => void;
}

export interface Node {
  readonly type: string;
  readonly parent?: Node;
  readonly [key: string]: unknown;
}

/** The options every repository code rule takes: a baseline of the breaches it tolerates, file by file. */
export interface CodeRuleOptions {
  /** Path from cwd to the baseline JSON, `{ "<rule>": { "<path from cwd>": <count> } }`. */
  readonly baseline?: string;
  /** effect-only: more entry files, as paths from cwd, where effects at the edge are allowed. */
  readonly entries?: ReadonlyArray<string>;
  /** max-lines: lines of code allowed in a file (250). */
  readonly max?: number;
}

export interface Rule {
  readonly meta: { readonly schema: ReadonlyArray<unknown>; readonly docs: { readonly description: string } };
  readonly create: (context: Context) => Record<string, (node: Node) => void>;
}

export interface Plugin {
  readonly meta: { readonly name: "ortho" };
  readonly rules: Readonly<Record<string, Rule>>;
}
