// Rendering: the model in, the files of `generated/` (and the scaffolds a project lacks) out. No file system is written.
import type { Effect } from "effect";
import { Data } from "effect";
import type { Model } from "@orthograph/compiler";

export type { RenderedFile } from "@orthograph/projections/shared";
import type { RenderedFile } from "@orthograph/projections/shared";

export interface Project {
  /** The project's name, from its folder: `examples/acme` is `acme`. */
  readonly name: string;
  readonly model: Model;
  /**
   * The project's folder. The mounted projections are loaded from it, by the file each mount is in; without it the model
   * must mount none, and the three built-in projections stand in (see `internal/mounted.ts`).
   */
  readonly root?: string;
}

/** A mounted projection that can't be loaded, or that refused to render: the message names its file. */
export class RenderFailed extends Data.TaggedError("RenderFailed")<{ readonly message: string }> {}

export interface RenderApi {
  /** Every file of `generated/` and the scaffolds: what each mounted projection renders, then what is still fixed. */
  readonly files: (project: Project) => Effect.Effect<ReadonlyArray<RenderedFile>, RenderFailed>;
  /** A temporary local Worker with the original handlers for setup and scaffolds for journey calls. */
  readonly emptyServer: (project: Project) => ReadonlyArray<RenderedFile>;
}
