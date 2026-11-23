// What the row evals read, and how: pure functions over the text the outputs wrote. Nothing here reads a file.
import type { CellId, Eval, Finding } from "../grid/types.ts";
import type { ProjectEvidence, ProveReport } from "../project-evidence/types.ts";
import type { ExportedName, ExportedType } from "./internal/code.ts";
import type { SpanView } from "../refusal-evals/types.ts";

export interface ReadingApi {
  /** A finding from its problems: ok exactly when there are none. */
  readonly finding: (problems: ReadonlyArray<string>) => Finding;
  /** The text under a markdown `## <heading>`, up to the next `##`; `undefined` when the page has no such section. */
  readonly mdSection: (page: string, heading: string) => string | undefined;
  /** The words of a markdown page's first `# ` heading, formatting off. */
  readonly mdTitle: (page: string) => string | undefined;
  /** The body rows of the first markdown table in a section, each as its trimmed cells. */
  readonly mdRows: (section: string) => ReadonlyArray<ReadonlyArray<string>>;
  /** The body rows of the first markdown table, each by its header (lower-cased): columns are found by name, never by position. */
  readonly mdRecords: (section: string) => ReadonlyArray<Readonly<Record<string, string>>>;
  /** The same for the first HTML table of a fragment, by its `<th>` headers. */
  readonly htmlRecords: (html: string) => ReadonlyArray<Readonly<Record<string, string>>>;
  /** The `- ` bullets of a section, without the dash. */
  readonly mdBullets: (section: string) => ReadonlyArray<string>;
  /** A portal page's own part: everything before the `<h2>Docs</h2>` block, which only embeds the docs page and proves nothing about the portal. */
  readonly portalOwn: (html: string) => string;
  /** The HTML under `<h<level>>title</h<level>>` up to the next heading of the same or a higher level; `undefined` when absent. */
  readonly htmlSection: (html: string, level: number, title: string) => string | undefined;
  /** The cells of every body row of the tables in an HTML fragment, as text. */
  readonly htmlRows: (html: string) => ReadonlyArray<ReadonlyArray<string>>;
  /** The `<li>` items of an HTML fragment, as text. */
  readonly htmlItems: (html: string) => ReadonlyArray<string>;
  /** An HTML fragment as plain text: tags gone, entities decoded, spaces collapsed. */
  readonly htmlText: (html: string) => string;
  /** The problems with a prove line (`handle.claim steps`): none when prove printed it with a tick, one when it did not or was never read. */
  readonly proved: (prove: ProveReport | undefined, line: string) => ReadonlyArray<string>;
  /**
   * An eval for `cell` over a subject the model names: `find` looks it up in the project's evidence (a thing, an operation, a step);
   * a subject the model does not have is red, and otherwise `problems` says what is wrong, empty when the cell is right.
   */
  readonly over: <T>(cell: CellId, noun: string, find: (evidence: ProjectEvidence, subject: string) => T | undefined, problems: (found: T, evidence: ProjectEvidence, subject: string) => ReadonlyArray<string>) => Eval<ProjectEvidence>;
  /** The exported types of a TypeScript source (aliases, interfaces, enums) with the string literals each names and its property names; comments and other declarations never count. */
  readonly exportedTypes: (source: string) => ReadonlyArray<ExportedType>;
  /** What a written type is made of, each union member as a kind (`string`, `array`, `null`, `string-literal`, `reference`, `indexed`, …): `string[]` is an `array`, not a `string`. */
  readonly typeKinds: (text: string) => ReadonlyArray<string>;
  /** What a TypeScript source exports as a value (`export const f`, `export function f`), with the doc comment above it. */
  readonly exportedValues: (source: string) => ReadonlyArray<{ readonly name: string; readonly doc: string | undefined }>;
  /** Every name a TypeScript source exports, with what it is in the module it comes from and which module: `export { a as b } from "./a.ts"` is `{ exported: "b", local: "a", from: "./a.ts" }`. */
  readonly exportedNames: (source: string) => ReadonlyArray<ExportedName>;
  /** The text of every `<h<level>>` heading of an HTML fragment, whole and in order. */
  readonly htmlHeadings: (html: string, level: number) => ReadonlyArray<string>;
  /** An exported class as code without comments, on one line however it is laid out; `undefined` when there is none. */
  readonly classText: (source: string, name: string) => string | undefined;
  /** The rows of `export const <name> = { Row: { a: 1, b: "x" } }`: each row's literal properties, in any layout. */
  readonly objectRows: (source: string, name: string) => Readonly<Record<string, Readonly<Record<string, string | number>>>> | undefined;
  /** A TypeScript source as code alone, comments taken off. */
  readonly code: (source: string) => string;
  /** Inline Markdown as the words it stands for: links, code spans, emphasis and escapes taken off. */
  readonly plain: (text: string) => string;
  /** Is `name` in the text as a whole name, not part of a longer one (`un-listed` is not `listed`)? */
  readonly hasName: (text: string, name: string) => boolean;
  /** The `HttpApiEndpoint.<method>(<name>, <path>, …)` calls of a TypeScript source, in any formatting; a call in a comment is not one. */
  readonly endpoints: (source: string) => ReadonlyArray<{ readonly method: string; readonly name: string; readonly path: string }>;
  /** An HTML fragment as lines of text: each list item, table row (cells joined by ` | `), heading and paragraph on a line of its own. */
  readonly htmlLines: (html: string) => ReadonlyArray<string>;
  /** The spans with exactly this name. */
  readonly spansNamed: (spans: ReadonlyArray<SpanView>, name: string) => ReadonlyArray<SpanView>;
}
