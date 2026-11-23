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

/** An anonymous caller, or a signed-in person. */
export type Caller = "anonymous" | "person";

export interface PaletteApi {
  /**
   * What the caller may open and call from the page they are on, in the index's order: every page whose `allowed` they pass, then the operations
   * of `page` (none on the 404) whose own `allowed` they pass. An anonymous caller passes only `anyone`; a person passes `anyone` and `signed-in`, and a
   * role only when `roles` (the names they hold) has it: no `roles` means none held, so role-only entries are hidden.
   */
  readonly visible: (entries: ReadonlyArray<PaletteEntry>, caller: Caller, page: string | undefined, roles?: ReadonlyArray<string>) => ReadonlyArray<PaletteEntry>;
}
