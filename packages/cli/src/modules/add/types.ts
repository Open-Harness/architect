// Adding to a blueprint: `ortho add thing | operation | read | journey | journeys` writes declarations with blanks in them.
// A blank (`Blueprint.todo`) compiles, and `ortho check` names each one until it is filled.
import type { Effect } from "effect";
import { Data } from "effect";
import type { Model } from "@orthograph/compiler";

/** One file `add` would write: its path from the project's root, and what goes in it. */
export interface Written {
  readonly path: string;
  readonly content: string;
}

export type What = "thing" | "operation" | "read" | "journey";

/** What `add journeys` writes, and the stubs it leaves because they are already there (and yours). */
export interface Planned {
  readonly write: ReadonlyArray<Written>;
  readonly there: ReadonlyArray<string>;
}

/** What `add thing --from-doctype` writes, the link values it keeps because they are there, and the fields that still name what it scaffolds. */
export interface FromDoctype {
  readonly write: ReadonlyArray<Written>;
  readonly kept: ReadonlyArray<string>;
  readonly notes: ReadonlyArray<string>;
}

/** The name doesn't fit what is being added, or a file it would write is already there. */
export class AddRefused extends Data.TaggedError("AddRefused")<{ readonly message: string }> {}

export interface AddApi {
  /**
   * The files for `add <what> <name>`, never overwriting one that `exists`. A thing is `allowance`; an operation or a
   * read is `allowance.spend`; a journey is its title, `"spend within an allowance"`.
   */
  readonly plan: (what: What, name: string, exists: (path: string) => boolean) => ReadonlyArray<Written> | AddRefused;
  /** `add journeys <thing>`: a stub per path, role and declared error, writing only the missing ones (K16 e). */
  readonly journeys: (model: Model, thing: string, exists: (path: string) => boolean) => Planned | AddRefused;
  /**
   * `add thing --from-doctype <file>` (CX-from-doctype): the thing, machine, events and verbs of an ERPNext doctype, a
   * line per child table, and a link value per record type it links to that isn't scaffolded. Reads the file, its
   * tables beside it and the project's model; writes nothing.
   */
  readonly fromDoctype: (input: { readonly root: string; readonly file: string; readonly asset: string | undefined }) => Effect.Effect<FromDoctype, AddRefused>;
}
