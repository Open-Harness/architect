// A goal brief's front matter (K33): the small YAML subset the briefs use, read without a dependency.
// Supported: `key: scalar`, `key: [a, b]`, a block list of scalars (`- item`), and one level of nested map
// (`lead:` then `  harness: amp`). Strings may be quoted with "…". `null`, `true`, `false` and integers are typed.

const scalar = (raw) => {
  const v = raw.trim();
  if (v === "" || v === "null" || v === "~") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  if (v.startsWith('"') && v.endsWith('"')) return JSON.parse(v);
  if (v.startsWith("'") && v.endsWith("'")) return v.slice(1, -1);
  if (v.startsWith("[") && v.endsWith("]")) {
    const inner = v.slice(1, -1).trim();
    return inner === "" ? [] : inner.split(",").map((x) => scalar(x));
  }
  return v;
};

const stripComment = (line) => {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    if (line[i] === "#" && !quoted && (i === 0 || line[i - 1] === " ")) return line.slice(0, i).trimEnd();
  }
  return line.trimEnd();
};

/** Splits a brief into its front matter (an object, or null when there is none) and its body. */
export const splitFrontMatter = (text) => {
  if (!text.startsWith("---\n")) return { data: null, body: text };
  const end = text.indexOf("\n---\n", 4);
  if (end === -1) return { data: null, body: text, error: "front matter has no closing ---" };
  const lines = text.slice(4, end).split("\n");
  const data = {};
  let key = null;
  for (const rawLine of lines) {
    const line = stripComment(rawLine);
    if (line.trim() === "") continue;
    const nested = /^ {2}([a-z_]+):\s*(.*)$/.exec(line);
    const item = /^ {2}- (.*)$/.exec(line);
    const top = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (top) {
      key = top[1];
      data[key] = top[2] === "" ? undefined : scalar(top[2]);
    } else if (item && key) {
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(scalar(item[1]));
    } else if (nested && key) {
      if (data[key] === undefined || data[key] === null || typeof data[key] !== "object" || Array.isArray(data[key])) data[key] = {};
      data[key][nested[1]] = scalar(nested[2]);
    } else {
      return { data: null, body: text, error: `front matter line not understood: ${rawLine}` };
    }
  }
  for (const k of Object.keys(data)) if (data[k] === undefined) data[k] = null;
  return { data, body: text.slice(end + 5) };
};

/**
 * A slice line: `"5 · The shell (after 4)"` → { number: "5", title: "The shell", after: ["4"] }. A slice's number is a
 * string, a number and an optional letter (`"1b"`, a slice added between two), and its marker and order use it as is.
 */
const readSlice = (s) => {
  const m = /^(\d+[a-z]?)\s*[·:-]\s*(.+?)(?:\s*\(after ([\da-z,\s]+)\))?$/.exec(String(s));
  if (!m) return { number: null, title: String(s), after: [] };
  return { number: m[1], title: m[2].trim(), after: m[3] ? m[3].split(",").map((x) => x.trim()).filter(Boolean) : [] };
};

/** The text under a `## <name>` heading, up to the next `## ` heading; null when the heading is missing or empty. */
export const section = (body, name) => {
  const lines = body.split("\n");
  const start = lines.indexOf(`## ${name}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => l.startsWith("## "));
  const text = (end === -1 ? rest : rest.slice(0, end)).join("\n").trim();
  return text === "" ? null : text;
};

/** The goal a brief declares: its front matter, or what its file name and first heading say when it has none. */
export const readGoal = (path, text) => {
  const { data, body, error } = splitFrontMatter(text);
  if (error) return { error: `${path}: ${error}` };
  const fromName = /(?:^|\/)(\d{2})-[a-z0-9-]+\.md$/.exec(path);
  const heading = /^# (.+)$/m.exec(body);
  const number = data?.goal ?? (fromName ? Number(fromName[1]) : null);
  if (number === null) return { error: `${path}: no goal number (front matter "goal:" or a file named NN-name.md)` };
  const slices = (data?.slices ?? []).map(readSlice);
  const bad = slices.find((s) => s.number === null);
  if (bad) return { error: `${path}: slice not understood: "${bad.title}" (write "<n> · <title>", n a number and an optional letter)` };
  const title = data?.title ?? (heading ? heading[1].replace(/^Goal \d+:\s*/, "") : path);
  return {
    goal: {
      number,
      title,
      brief: path,
      milestone: data?.milestone ?? `Goal ${number}: ${title}`,
      release: data?.release ?? null,
      branch: data?.branch ?? null,
      base: data?.base ?? null,
      status: data?.status ?? null,
      lead: data?.lead ?? null,
      done_check: data?.done_check ?? null,
      owns: data?.owns ?? [],
      slices,
      card: section(body, "The goal, in plain words"),
      stands: section(body, "Where it stands"),
      declared: data !== null,
    },
  };
};
