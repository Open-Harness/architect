// The palette's index (`generated/app/palette.json`) and what the caller may see of it (K31 section 4): the pages they may open, and the
// operations they may call on the page they are on. The rule is the one `generated/app/palette.ts` has, so the shell and an agent read one list.

/** Who may use a page or an operation, as the model has it. */
export type Allowed =
  | { readonly kind: "anyone" }
  | { readonly kind: "signed-in" }
  | { readonly kind: "role"; readonly role: string }
  | { readonly kind: "role-of"; readonly role: string; readonly path: string };

export type PageEntry = {
  readonly kind: "page";
  readonly name: string;
  readonly path: string;
  readonly description: string;
  readonly allowed: ReadonlyArray<Allowed>;
};

export type OperationEntry = {
  readonly kind: "operation";
  readonly name: string;
  readonly page: string;
  readonly component: string | null;
  readonly description: string;
  readonly allowed: ReadonlyArray<Allowed>;
};

export type PaletteEntry = PageEntry | OperationEntry;

/**
 * A row the app adds at run time, beside the map's own (the things, operations or refusal codes a client reads from its data API). It is a
 * move: `href` navigates, `run` calls the app. It carries `allowed` like a map entry, and the same rule applies.
 */
export interface ExtraEntry {
  readonly name: string;
  /** The heading the row sits under; rows of one group are listed together, groups in the order they first appear. */
  readonly group: string;
  readonly description?: string;
  readonly allowed: ReadonlyArray<Allowed>;
  readonly href?: string;
  readonly run?: () => void;
}

/** Where extra rows come from. `read` must return the same array until the rows change, and `subscribe` tells the shell when they have. */
export interface ExtraSource {
  readonly read: () => ReadonlyArray<ExtraEntry>;
  readonly subscribe: (listener: () => void) => () => void;
}

/** An anonymous caller, or a signed-in person. */
export type Caller = "anonymous" | "person";

export interface PaletteApi {
  /**
   * What the caller may open and call from the page they are on, in the index's order: every page whose `allowed` they pass, then the operations
   * of `page` (none on the 404) whose own `allowed` they pass. An anonymous caller passes only `anyone`; a person passes `anyone` and `signed-in`, and a
   * role only when `roles` (the names they hold) has it: no `roles` means none held, so role-only entries are hidden.
   */
  readonly visible: (entries: ReadonlyArray<PaletteEntry>, caller: Caller, page: string | undefined, roles?: ReadonlyArray<string>) => ReadonlyArray<PaletteEntry>;
  /** The extra rows the caller may use: those whose `allowed` they pass, by the same rule, in the order given. */
  readonly visibleExtra: (extras: ReadonlyArray<ExtraEntry>, caller: Caller, roles?: ReadonlyArray<string>) => ReadonlyArray<ExtraEntry>;
}
