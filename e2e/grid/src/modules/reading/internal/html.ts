const ENTITIES: Readonly<Record<string, string>> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };
const escaped = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** What a page shows is not what a `<script>` or a `<style>` holds (the ⌘K index, a stylesheet): their contents are not text a person reads. */
const shown = (html: string): string => html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ");

export const htmlText = (html: string): string =>
  shown(html).replace(/<[^>]*>/g, " ").replace(/&(?:amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e] ?? e).replace(/\s+/g, " ").trim();

export const portalOwn = (html: string): string => {
  const docs = html.indexOf("<h2>Docs</h2>");
  return docs < 0 ? html : html.slice(0, docs);
};

export const htmlSection = (html: string, level: number, title: string): string | undefined => {
  const open = new RegExp(`<h${level}>\\s*${escaped(title)}\\s*</h${level}>`).exec(html);
  if (open === null) return undefined;
  const rest = html.slice(open.index + open[0].length);
  const closes = new RegExp(`<h[1-${level}]>`).exec(rest);
  return closes === null ? rest : rest.slice(0, closes.index);
};

export const htmlRows = (html: string): ReadonlyArray<ReadonlyArray<string>> =>
  [...html.matchAll(/<tr>([\s\S]*?)<\/tr>/g)]
    .map((row) => [...row[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => htmlText(cell[1]!)))
    .filter((cellsOfRow) => cellsOfRow.length > 0);

export const htmlItems = (html: string): ReadonlyArray<string> => [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => htmlText(m[1]!));

export const htmlRecords = (html: string): ReadonlyArray<Readonly<Record<string, string>>> => {
  const table = /<table[^>]*>([\s\S]*?)<\/table>/.exec(html)?.[1] ?? "";
  const head = [...(/<tr>([\s\S]*?)<\/tr>/.exec(table)?.[1] ?? "").matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map((m) => htmlText(m[1]!).toLowerCase());
  return htmlRows(table).map((row) => Object.fromEntries(row.map((c, i) => [head[i] ?? String(i), c])));
};

export const htmlHeadings = (html: string, level: number): ReadonlyArray<string> =>
  [...html.matchAll(new RegExp(`<h${level}\\b[^>]*>([\\s\\S]*?)</h${level}>`, "g"))].map((m) => htmlText(m[1]!));

/**
 * The entries of an HTML fragment, one line each, marked as markdown marks them (a list item or a definition term `- `, a table row `| `, a heading
 * `# `) so one reader serves both. Only an entry's start makes a new line: every tag inside an entry (`p`, `div`, `span`, `strong`, `code`, `br`, a
 * definition's `dd`, a table cell) is flattened to a space, so the full text of the entry stays on its line, however the markup is laid out.
 */
export const htmlLines = (html: string): ReadonlyArray<string> =>
  shown(html).replace(/\s+/g, " ").replace(/<\/t[dh]>/g, " | ").replace(/<(?:li|dt)\b[^>]*>/g, "\n- ").replace(/<tr\b[^>]*>/g, "\n| ").replace(/<h[1-6]\b[^>]*>/g, "\n# ")
    .split("\n").map((line) => htmlText(line).replace(/(?: \|)+$/, "").trim()).filter((line) => line !== "" && !/^[-|#]$/.test(line));
