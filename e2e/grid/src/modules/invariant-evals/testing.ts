// What the invariant row's tests judge: Plugged In as ST1.19 leaves it (fixtures/plugged-in-rules, a throwaway stand-in of the slice, captured 21 November 2026), the
// portal's pages drawn by hand from the model in the hooks check 28 reads (the portal draws no Rules section until ST1.22), and the plants.
import type { ProjectEvidence, ProjectModel, RuleModel } from "../project-evidence/types.ts";
import { evidenceOf } from "../project-evidence/testing.ts";

const html = (strings: ReadonlyArray<string>) => strings.join("");

/** The sentence a rule says in the portal (and the docs, and the tool): its description, or the generated one this page's author makes up from the model. */
export const sentenceOf = (thing: string, rule: RuleModel) =>
  rule.description ?? `another ${(rule.while ?? []).join(" ")} ${thing} holds this ${rule.fields.join(" and ")}`.replace(/ {2,}/g, " ");

/** The portal's pages for a model, as a Rules section and a spine stop would draw them. */
export const portalPages = (model: ProjectModel): Readonly<Record<string, string>> => ({
  ...Object.fromEntries(Object.values(model.things).map((t) => {
    const rules = Object.entries(t.invariants ?? {});
    return [`/portal/things/${t.name}`, html([
      `<main><h1>${t.name}</h1><section data-portal="lifecycle">lifecycle</section>`,
      rules.length === 0 ? "" : html([`<section data-portal="rules"><h2>Rules</h2><ul>`, ...rules.map(([n, r]) =>
        `<li data-portal="rule" id="rule-${n}" data-rule="${t.name}.${n}" data-fields="${r.fields.join(",")}" data-while="${(r.while ?? []).join(",")}" data-refuse="${r.refuse ?? ""}"><code>${n}</code> <span data-portal="rule-sentence">${sentenceOf(t.name, r)}</span></li>`), `</ul></section>`]),
      `<div data-portal="operation-row">operations</div></main>`,
    ])] as const;
  })),
  ...Object.fromEntries(Object.values(model.operations).map((op) => {
    const owned = Object.entries(op.invariants ?? {});
    /** What the operation can break: `breaks` when the model has it (S31), else the rules behind its refusals. */
    const broken = op.breaks ?? owned.map(([, full]) => full);
    return [`/portal/operations/${op.name}`, html([
      `<main><h1>${op.name}</h1><ul>`,
      ...owned.map(([refusal, full]) => {
        const [thing, name] = [full.slice(0, full.indexOf(".")), full.slice(full.indexOf(".") + 1)];
        const rule = model.things[thing]!.invariants![name]!;
        return `<li data-portal="refusal" data-refusal="${refusal}" data-rule="${full}"><span data-portal="refusal-sentence">${sentenceOf(thing, rule)}</span> <a data-portal="rule-link" href="/portal/things/${thing}#rule-${name}">${full}</a></li>`;
      }),
      `</ul>`,
      broken.length === 0 ? "" : `<ol><li data-portal="spine-stop" data-stop="move">move</li><li data-portal="spine-stop" data-stop="rules" data-rules="${broken.join(",")}">rules</li><li data-portal="spine-stop" data-stop="commit">commit</li></ol>`,
      `</main>`,
    ])] as const;
  })),
});

/** Plugged In as ST1.19 leaves it, with its portal pages drawn. */
export const standIn = async (): Promise<ProjectEvidence> => {
  const e = await evidenceOf("plugged-in-rules");
  return { ...e, portal: portalPages(e.model) };
};

/** The evidence with the model changed (the files and pages stay what they were). */
export const withModel = (e: ProjectEvidence, change: (model: ProjectModel) => ProjectModel): ProjectEvidence => ({ ...e, model: change(e.model) });
/** The evidence with one rule of one thing changed. */
export const withRule = (e: ProjectEvidence, thing: string, rule: string, change: (r: RuleModel) => RuleModel): ProjectEvidence =>
  withModel(e, (m) => ({ ...m, things: { ...m.things, [thing]: { ...m.things[thing]!, invariants: { ...m.things[thing]!.invariants, [rule]: change(m.things[thing]!.invariants![rule]!) } } } }));
/** The evidence with one operation of the model changed. */
export const withOperation = (e: ProjectEvidence, op: string, change: (o: ProjectModel["operations"][string]) => ProjectModel["operations"][string]): ProjectEvidence =>
  withModel(e, (m) => ({ ...m, operations: { ...m.operations, [op]: change(m.operations[op]!) } }));
/** The evidence with the portal pages changed by replacing text in one. */
export const withPage = (e: ProjectEvidence, route: string, from: string | RegExp, to: string): ProjectEvidence => {
  const before = e.portal[route]!;
  const after = before.replace(from, to);
  if (after === before) throw new Error(`${route} has no ${String(from)}: the plant is out of date`);
  return { ...e, portal: { ...e.portal, [route]: after } };
};
/** The evidence with one generated file changed by replacing text in it. */
export const withText = (e: ProjectEvidence, path: string, from: string | RegExp, to: string): ProjectEvidence => {
  const before = e.files[path]!;
  const after = before.replace(from, to);
  if (after === before) throw new Error(`${path} has no ${String(from)}: the plant is out of date`);
  return { ...e, files: { ...e.files, [path]: after } };
};
