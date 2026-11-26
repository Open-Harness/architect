// Names from a doctype's (CX-from-doctype): `Tea Blend` is the folder `tea-blend`, the export `TeaBlend`, the id prefix
// `tbl` and the refusal code `TB`; a field's `blend_name` is `blendName`. Prefixes and codes already held, in the
// project or by another thing of the same run, are lengthened, never shared.

const words = (name: string) => name.split(/[^A-Za-z0-9]+/).filter((w) => w !== "");
const letterWords = (name: string) => name.split(/[^A-Za-z]+/).filter((w) => w !== "");
const capital = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

/** `Tea Blend` → `tea-blend`. */
export const kebabOf = (name: string) => words(name).map((w) => w.toLowerCase()).join("-");
/** `Tea Blend` → `TeaBlend`. */
export const pascalOf = (name: string) => words(name).map((w) => capital(w.toLowerCase())).join("");
/** `Tea Blend` → `teaBlend`. */
export const camelName = (name: string) => {
  const p = pascalOf(name);
  return p.charAt(0).toLowerCase() + p.slice(1);
};
/** `blend_name` → `blendName`. */
export const camelField = (fieldname: string) => {
  const [first = "", ...rest] = fieldname.split(/_+/).filter((w) => w !== "");
  return first.toLowerCase() + rest.map((w) => capital(w.toLowerCase())).join("");
};
/** `steep_time` → `SteepTime`. */
export const pascalField = (fieldname: string) => capital(camelField(fieldname));

/** "a", or "an" before a vowel: "an infusion". */
export const article = (name: string) => (/^[aeiou]/i.test(name) ? "an" : "a");

/** The lower-case initials, filled to three by the last word's letters after its first, then an `x` while it is held. */
export const prefixFor = (name: string, held: ReadonlySet<string>): string => {
  const ws = letterWords(name).map((w) => w.toLowerCase());
  const last = ws[ws.length - 1] ?? "x";
  let prefix = ws.map((w) => w.charAt(0)).join("");
  for (let i = 1; prefix.length < 3 && i < last.length; i++) prefix += last.charAt(i);
  prefix = prefix.padEnd(3, "x");
  while (held.has(prefix)) prefix += "x";
  return prefix;
};

/** The runtime's own refusals take `AR` (`[AR-001]`): no thing may. */
const RUNTIME = "AR";

/**
 * The capital initials, at most four (one word: its first two letters); while held, the last word's next letter is
 * added, up to four. `{ none }` names the last code tried when every one is held.
 */
export const codeFor = (name: string, held: ReadonlySet<string>): { readonly code: string } | { readonly none: string } => {
  const ws = letterWords(name).map((w) => w.toUpperCase());
  const last = ws[ws.length - 1] ?? "";
  let code = ws.length === 1 ? last.slice(0, 2) : ws.map((w) => w.charAt(0)).join("").slice(0, 4);
  let next = ws.length === 1 ? 2 : 1;
  while (held.has(code) || code === RUNTIME || code.length < 2) {
    if (code.length >= 4 || next >= last.length) return { none: code };
    code += last.charAt(next++);
  }
  return { code };
};
