import { Reading } from "../../reading/service.ts";
import { over, sentenceProblems } from "./over.ts";

interface Tag { readonly index: number; readonly tag: string; readonly name: string; readonly attrs: Readonly<Record<string, string>> }

/** A tag's attributes, read one after another: a value is never read again for attributes of its own (`title='data-fields="x"'` is one value). */
const attrsOf = (tag: string): Readonly<Record<string, string>> => {
  const attrs: Record<string, string> = {};
  for (const m of tag.replace(/^<[a-z][a-z0-9]*/i, "").matchAll(/\s([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) attrs[m[1]!] ??= m[2] ?? m[3] ?? m[4] ?? "";
  return attrs;
};
/** A page as a person reads its markup: comments are no part of it. */
const clean = (html: string) => html.replace(/<!--[^]*?-->/g, "");
/** Every element of the page, by its opening tag (a `>` inside a quoted attribute does not end it). */
const allTags = (html: string): ReadonlyArray<Tag> =>
  [...html.matchAll(/<([a-z][a-z0-9]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi)].map((m) => ({ index: m.index, tag: m[0], name: m[1]!, attrs: attrsOf(m[0]) }));
/** The elements that carry `data-portal="<hook>"` (the hooks check 28 reads, G5's screens). */
const tagsOf = (html: string, hook: string): ReadonlyArray<Tag> => allTags(html).filter((t) => t.attrs["data-portal"] === hook);

/** An element, with what it holds, up to its own closing tag: same-named elements inside it are counted, so a neighbour's content is never its. */
const elementOf = (html: string, at: Tag): string => {
  const tags = new RegExp(`<(/?)${at.name}\\b(?:"[^"]*"|'[^']*'|[^'">])*>`, "gi");
  tags.lastIndex = at.index + at.tag.length;
  let depth = 1;
  for (let m = tags.exec(html); m !== null; m = tags.exec(html)) {
    depth += m[1] === "/" ? -1 : m[0].endsWith("/>") ? 0 : 1;
    if (depth === 0) return html.slice(at.index, m.index + m[0].length);
  }
  return html.slice(at.index);
};
/** What an element holds of one hook: how many there are, the first one and its text. */
const holding = (element: string, hook: string) => {
  const body = element.slice(element.indexOf(">") + 1);
  const found = tagsOf(body, hook);
  return { count: found.length, first: found[0], text: found[0] === undefined ? "" : Reading.htmlText(elementOf(body, found[0]).replace(/^<[^>]*>/, "")) };
};

/**
 * invariant.portal: the thing's page has one Rules section (`data-portal="rules"`) holding one row for the rule (`data-rule`, `data-fields`, `data-while`, `data-refuse`, an `id` that no
 * other element has, one `rule-sentence`); each page of an operation that breaks it shows the refusal once (`data-refusal`, `data-rule`) and no other refusal for this rule, with one
 * `refusal-sentence` and a `rule-link` that names the rule and goes to that row, and a spine stop `rules` between `move` and `commit` naming exactly the rules the operation can break (the
 * hooks of check 28). A rule that refuses nothing needs only its row.
 */
export const portal = over("invariant.portal", (f, e) => {
  const route = `/portal/things/${f.thing.name}`;
  const raw = e.portal[route];
  if (raw === undefined) return [`${route} could not be rendered`];
  const html = clean(raw);
  const sections = tagsOf(html, "rules");
  const rows = tagsOf(html, "rule").filter((r) => r.attrs["data-rule"] === f.full);
  const row = rows[0];
  const sentence = row === undefined ? undefined : holding(elementOf(html, row), "rule-sentence");
  const id = row?.attrs["id"] ?? "";
  const section = sections.length === 1 ? elementOf(html, sections[0]!) : "";
  const inside = row !== undefined && sections.length === 1 && row.index >= sections[0]!.index && row.index < sections[0]!.index + section.length;
  return [
    ...(sections.length === 1 ? [] : [`${route} has ${sections.length} Rules sections, it needs one`]),
    ...(rows.length === 1 ? [] : [`${route} has ${rows.length} rows for ${f.full}, it needs one`]),
    ...(row === undefined || sentence === undefined ? [] : [
      ...(sections.length !== 1 || inside ? [] : [`the row for ${f.full} is not inside the Rules section`]),
      ...(row.attrs["data-fields"] === f.rule.fields.join(",") ? [] : [`the row's data-fields is "${row.attrs["data-fields"] ?? ""}", the rule's key is "${f.rule.fields.join(",")}"`]),
      ...(row.attrs["data-while"] === (f.rule.while ?? []).join(",") ? [] : [`the row's data-while is "${row.attrs["data-while"] ?? ""}", the rule holds while "${(f.rule.while ?? []).join(",")}"`]),
      ...(row.attrs["data-refuse"] === (f.rule.refuse ?? "") ? [] : [`the row's data-refuse is "${row.attrs["data-refuse"] ?? ""}", the rule refuses "${f.rule.refuse ?? ""}"`]),
      ...(id === "" ? ["the row has no id, so no refusal can link to it"] : allTags(html).filter((t) => t.attrs["id"] === id).length > 1 ? [`the id "${id}" is on more than one element, so a link to it may land on another`] : []),
      ...(sentence.count === 1 ? sentenceProblems(e, f, sentence.text, `${route}'s row`) : [`the row for ${f.full} has ${sentence.count} sentences, it needs one`]),
    ]),
    ...(f.rule.refuse === undefined ? [] : f.breakers.flatMap((op) => {
      const rawPage = e.portal[`/portal/operations/${op.name}`];
      if (rawPage === undefined) return [`/portal/operations/${op.name} could not be rendered`];
      const page = clean(rawPage);
      const ofThisRule = tagsOf(page, "refusal").filter((r) => r.attrs["data-rule"] === f.full);
      const shown = ofThisRule.filter((r) => r.attrs["data-refusal"] === f.rule.refuse);
      const stops = tagsOf(page, "spine-stop").map((s) => s.attrs["data-stop"]);
      const rules = tagsOf(page, "spine-stop").find((s) => s.attrs["data-stop"] === "rules");
      // What the model says it can break: `breaks` (a rule that owns no refusal is in it), else, in a model older than S31, the rules behind its refusals (as the portal's `rulesBroken` does).
      const owned = [...new Set(op.breaks ?? Object.values(op.invariants ?? {}))].sort();
      return [
        ...(shown.length === 1 ? [] : [`/portal/operations/${op.name} shows ${f.rule.refuse} ${shown.length} times, it needs once`]),
        ...ofThisRule.filter((r) => r.attrs["data-refusal"] !== f.rule.refuse).map((r) => `/portal/operations/${op.name} shows ${r.attrs["data-refusal"] ?? "a refusal"} as ${f.full}'s, which refuses ${f.rule.refuse}`),
        ...shown.flatMap((r) => {
          const mine = elementOf(page, r);
          const said = holding(mine, "refusal-sentence");
          const link = holding(mine, "rule-link");
          return [
            ...(said.count === 1 ? sentenceProblems(e, f, said.text, `${op.name}'s ${f.rule.refuse}`) : [`${op.name}'s ${f.rule.refuse} has ${said.count} sentences, it needs one`]),
            ...(link.count !== 1 || link.first === undefined ? [`${op.name}'s ${f.rule.refuse} has ${link.count} links to its rule, it needs one`] : [
              ...(link.first.attrs["href"] === `${route}#${id}` && id !== "" ? [] : [`${op.name}'s ${f.rule.refuse} links to "${link.first.attrs["href"] ?? ""}", not to the rule's row ${route}#${id || "…"}`]),
              ...(Reading.hasName(link.text, f.full) || Reading.hasName(link.text, f.local) ? [] : [`${op.name}'s ${f.rule.refuse} link says "${link.text}", it should name ${f.full}`]),
            ]),
          ];
        }),
        ...(stops.indexOf("move") >= 0 && stops.indexOf("rules") === stops.indexOf("move") + 1 && stops.indexOf("commit") === stops.indexOf("rules") + 1 && stops.filter((s) => s === "rules").length === 1 ? [] : [`/portal/operations/${op.name}'s spine is [${stops.join(", ")}], it needs one rules stop between move and commit`]),
        ...(rules === undefined || [...new Set((rules.attrs["data-rules"] ?? "").split(",").filter((x) => x !== ""))].sort().join() === owned.join() ? [] : [`${op.name}'s rules stop names "${rules.attrs["data-rules"] ?? ""}", the model says the operation can break ${owned.join(", ")}`]),
      ];
    })),
  ];
});
