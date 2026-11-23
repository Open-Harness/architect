// Comparing two models: what changed, declaration by declaration, and what each operation's proof depends on.
import type { Model } from "#modules/model/types.js";

export type Kind = "value" | "thing" | "operation";

/** One declaration that differs between two models. `parts` names the fields of its entry that changed. */
export interface Change {
  readonly kind: Kind;
  readonly name: string;
  readonly change: "added" | "removed" | "changed";
  readonly parts: ReadonlyArray<string>;
}

/** What an operation's proof rests on: `operation:<name>` and `thing:<name>`, each with the hash it had. */
export type Depends = Readonly<Record<string, string>>;

export type Bump = "major" | "minor" | "patch";

/** One line of `changes.json`: what changed in a declaration's part and what it does to the version. */
export interface Versioned {
  readonly kind: "added" | "removed" | "changed";
  /** `allowance.list`, or `allowance.spend.payload` for a part of one; `thing:` and `value:` for those. */
  readonly what: string;
  readonly detail?: string;
  readonly bump: Bump;
}

/** The changes between two models and the version bump they make together. */
export interface Release {
  readonly bump: Bump;
  readonly changes: ReadonlyArray<Versioned>;
}

export interface CompareApi {
  /** Every declaration that was added, removed or changed from `before` to `after`, in kind then name order. */
  readonly models: (before: Model, after: Model) => ReadonlyArray<Change>;
  /**
   * What the changes mean for the version (D3 #1): an added operation or read is minor; a changed payload, answer or
   * error set, or a removed operation, is major; anything else (a budget, the docs) is a patch.
   */
  readonly release: (before: Model, after: Model) => Release;
  /** The version after `last` for `bump`: `1.0.0` when there is none; undefined when `last` is not `x.y.z`. */
  readonly next: (last: string | undefined, bump: Bump) => string | undefined;
  /** The declarations an operation's proof depends on: itself, its thing, the things its own or its
   * thing's fields refer to, and the things whose roles may call it. */
  readonly dependsOn: (model: Model, operation: string) => Depends;
  /** The current hash of each key of `depends`, or undefined when it no longer exists. */
  readonly hashOf: (model: Model, key: string) => string | undefined;
  /**
   * What each mount provides and needs, one line each, sorted and without duplicates:
   * `feature:echo -> echo.repeat  provides`, `feature:greet -> feature:echo  needs`, and for an adapter the
   * operation that calls it, `adapter:pricing -> probe.quote  used-by`. None without mounts.
   */
  readonly edges: (model: Model) => ReadonlyArray<string>;
}
