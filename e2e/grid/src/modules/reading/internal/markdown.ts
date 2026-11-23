const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Inline Markdown as the words it stands for: a link is its label, a code span its code, emphasis (`**x**`, `__x__`, `*x*`, `_x_`) the text it
 * wraps, and a backslash escape the character it escapes. `_` is emphasis only at a word's edge, so `link_add` keeps its underscore.
 */
export const plain = (text: string): string =>
  text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`+([^`]*)`+/g, "$1")
    .replace(/\*\*([^*]+)\*\*|__([^_]+)__/g, (_, a: string | undefined, b: string | undefined) => a ?? b ?? "")
    .replace(/\*([^*\s][^*]*)\*/g, "$1")
    .replace(/(^|[^\w])_([^_\s][^_]*)_(?=$|[^\w])/g, "$1$2")
    .replace(/\\(.)/g, "$1");

/** The page's title: the words of its first `# ` heading, formatting off. */
export const mdTitle = (page: string): string | undefined => {
  const line = page.split("\n").find((l) => /^#\s/.test(l));
  return line === undefined ? undefined : plain(line.replace(/^#\s+/, "").replace(/\s+#+\s*$/, "")).trim();
};

/** A heading line's words: its marks (`##`, a closing `##`) and inline formatting taken off. */
const headingText = (line: string) => plain(line.replace(/^#{1,6}\s+/, "").replace(/\s+#+\s*$/, "")).trim();

export const mdSection = (page: string, heading: string): string | undefined => {
  const lines = page.split("\n");
  const start = lines.findIndex((l) => /^##\s/.test(l) && headingText(l) === heading);
  if (start < 0) return undefined;
  const next = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start + 1, next < 0 ? undefined : next).join("\n").trim();
};

/** The cells of a table row: split at pipes that are not escaped, each as plain text. */
const cells = (line: string) => line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/).map((c) => plain(c.trim()));

export const mdRows = (section: string): ReadonlyArray<ReadonlyArray<string>> => {
  const rows = section.split("\n").filter((l) => l.trim().startsWith("|"));
  // The first row is the header and the second the `|---|` rule.
  return rows.slice(2).map(cells);
};

export const mdBullets = (section: string): ReadonlyArray<string> =>
  section.split("\n").filter((l) => /^\s*[-*+]\s/.test(l)).map((l) => plain(l.replace(/^\s*[-*+]\s+/, "").trim()));

export const mdRecords = (section: string): ReadonlyArray<Readonly<Record<string, string>>> => {
  const rows = section.split("\n").filter((l) => l.trim().startsWith("|"));
  const head = (rows[0] === undefined ? [] : cells(rows[0])).map((h) => h.toLowerCase());
  return rows.slice(2).map((row) => Object.fromEntries(cells(row).map((c, i) => [head[i] ?? String(i), c])));
};

/** Is `name` in the text as a whole name: not part of a longer one (`un-listed`, `LinkAdded2`, `link.add.record` for `link.add`)? */
export const hasName = (text: string, name: string): boolean => new RegExp(`(?<![\\w.-])${escaped(name)}(?![\\w-]|\\.\\w)`).test(text);
