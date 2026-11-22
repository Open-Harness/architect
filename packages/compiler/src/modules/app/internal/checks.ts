// The map's refusals (K31, K36), each a problem line `<file>: [<tag>] <words>`. The tag says which of the five it is; the file
// is the page (or the app) it is about, and every other file it involves is named in the words.
import type { AllowedModel, FieldModel, Model } from "#modules/model/types.js";

const PARAM = /:([A-Za-z_][A-Za-z0-9_]*)/g;
export const paramsOf = (path: string): ReadonlyArray<string> => [...path.matchAll(PARAM)].map((m) => m[1]!);
/** An address with its parameters' names taken out: `/@:handle` and `/@:name` are one. */
const shape = (path: string) => path.replace(PARAM, ":");

/** A read or operation named on a page or in one of its components, and the file that names it. */
export interface Item {
  readonly op: string;
  readonly file: string;
}

export interface PageFacts {
  readonly name: string;
  readonly file: string;
  readonly path: string;
  readonly params: Readonly<Record<string, FieldModel>>;
  readonly allowed: ReadonlyArray<AllowedModel>;
  readonly shows: ReadonlyArray<Item>;
  readonly offers: ReadonlyArray<Item>;
}

const also = (page: PageFacts, item: Item) => (item.file === page.file ? "" : ` (named in ${item.file})`);
const tagged = (file: string, tag: string, words: string) => `${file}: [${tag}] ${words}`;

/** The path and its parameters agree; each shown read gets what its payload needs; each parameter is used by one. */
export const routeProblems = (page: PageFacts, model: Model): ReadonlyArray<string> => {
  const named = paramsOf(page.path);
  const typed = Object.keys(page.params);
  const out: Array<string> = [];
  if (!page.path.startsWith("/")) out.push(tagged(page.file, "app-route-param", `the route "${page.path}" must start with /`));
  for (const p of named.filter((n) => !typed.includes(n))) out.push(tagged(page.file, "app-route-param", `the route "${page.path}" has :${p}, which route.params doesn't type`));
  for (const p of typed.filter((n) => !named.includes(n))) out.push(tagged(page.file, "app-route-param", `route.params types ${p}, which the route "${page.path}" doesn't have`));
  const shown = page.shows.map((item) => ({ item, op: model.operations[item.op] }));
  if (shown.length === 0 || shown.some((s) => s.op === undefined)) return out;
  const supplies = (key: string, field: FieldModel) =>
    Object.entries(page.params).some(([p, f]) => p === key || (field.ref !== undefined && f.ref === field.ref));
  for (const { item, op } of shown) {
    for (const [key, field] of Object.entries(op!.payload)) {
      const byRole = page.allowed.some((a) => a.kind === "role-of" && a.path.split(".")[0] === key);
      if (!field.optional && !supplies(key, field) && !byRole) {
        out.push(tagged(page.file, "app-route-param", `${page.name} shows ${item.op}${also(page, item)}, whose payload field "${key}" no route parameter, session or allowed role supplies (route "${page.path}")`));
      }
    }
  }
  for (const [p, f] of Object.entries(page.params)) {
    const taken = shown.some(({ op }) => Object.entries(op!.payload).some(([key, field]) => key === p || (f.ref !== undefined && field.ref === f.ref)));
    if (!taken) out.push(tagged(page.file, "app-route-param", `route parameter ${p} is taken by no read ${page.name} shows (${shown.map((s) => s.item.op).join(", ")})`));
  }
  return out;
};

/** Callable: the page allows anyone or a signed-in caller, or the operation allows anyone or a signed-in one, or they share a role. */
const callable = (page: ReadonlyArray<AllowedModel>, op: ReadonlyArray<AllowedModel>): boolean => {
  const roleOf = (a: AllowedModel) => (a.kind === "role" || a.kind === "role-of" ? a.role : undefined);
  return page.some((a) => a.kind === "anyone" || a.kind === "signed-in")
    || op.some((a) => a.kind === "anyone" || a.kind === "signed-in")
    || page.some((a) => roleOf(a) !== undefined && op.some((o) => roleOf(o) === roleOf(a)));
};

/** Each offered operation can be called by someone who may open the page. */
export const offerProblems = (page: PageFacts, model: Model): ReadonlyArray<string> =>
  page.offers.flatMap((item) => {
    const op = model.operations[item.op];
    return op === undefined || callable(page.allowed, op.allowed)
      ? []
      : [tagged(page.file, "app-offer-uncallable", `${page.name} offers ${item.op}${also(page, item)}, which none of the page's allowed roles may call`)];
  });

/** A read or operation named more than once among a page and its components (K36: one owner for each fact). */
export const twiceProblems = (page: PageFacts): ReadonlyArray<string> => {
  const all = [...page.shows, ...page.offers];
  return [...new Set(all.map((i) => i.op))].flatMap((op) => {
    const where = all.filter((i) => i.op === op);
    if (where.length < 2) return [];
    const files = [...new Set([page.file, ...where.map((i) => i.file)])];
    return [tagged(page.file, "app-named-twice", `${op} is named ${where.length} times among ${page.name} and its components (${files.join(", ")}): name it in exactly one`)];
  });
};

/** Two pages at one address. */
export const duplicateRoutes = (pages: ReadonlyArray<{ readonly name: string; readonly file: string; readonly path: string }>): ReadonlyArray<string> => {
  const by = new Map<string, Array<{ readonly name: string; readonly file: string; readonly path: string }>>();
  for (const p of pages) by.set(shape(p.path), [...(by.get(shape(p.path)) ?? []), p]);
  return [...by.values()].filter((group) => group.length > 1).map((group) =>
    tagged(group[0]!.file, "app-duplicate-route", `${group.map((p) => `${p.name} (${p.file}, "${p.path}")`).join(" and ")} are at one address`));
};

/** Pages whose parents lead back to themselves: each cycle once. */
export const cycles = (parents: ReadonlyMap<string, string>, files: ReadonlyMap<string, string>): ReadonlyArray<string> => {
  const seen = new Set<string>();
  const out: Array<string> = [];
  for (const start of [...parents.keys()].sort()) {
    const path: Array<string> = [];
    let at: string | undefined = start;
    while (at !== undefined && !path.includes(at)) { path.push(at); at = parents.get(at); }
    if (at === undefined) continue;
    const loop = path.slice(path.indexOf(at)).sort();
    const key = loop.join(",");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tagged(files.get(loop[0]!) ?? "?", "app-parent-cycle", `the parents of ${loop.join(", ")} lead back to themselves (${loop.map((n) => files.get(n)).join(", ")})`));
  }
  return out;
};
