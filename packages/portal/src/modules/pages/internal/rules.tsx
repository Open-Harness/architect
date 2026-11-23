// How a rule shows (G5, decided 20 November 2026: 1A 2A 3A 4A): a Rules section under a thing's lifecycle, a refusal a rule owns read as the rule's
// sentence with a link to the rule's row, wherever it is shown. Check 28's hooks: `rules`, `rule`, `rule-sentence`, `refusal`, `refusal-sentence`, `rule-link`; the spine's (`spine.tsx`): `spine-stop`, `spine-rule`, `spine-rule-sentence`.
import { Widget } from "@orthograph/portal-ui";
import { Fragment, useEffect, type ReactNode } from "react";
import type { ThingWire } from "#modules/wire/types.js";
import { ruleHref, ruleId, rulesOf, type RuleRef } from "./rules.ts";

/** A refusal a rule owns: what the page calls it, the rule's sentence, and a link to the rule's row. The same markup on every surface. */
export const Owned = ({ name, owner, code, count, children }: { readonly name: string; readonly owner: RuleRef; readonly code?: string; readonly count?: number | null; readonly children?: ReactNode }) => (
  <span
    className="refusal" data-portal="refusal" data-refusal={name} data-rule={owner.full}
    {...(code === undefined ? {} : { "data-code": code })} {...(count === undefined || count === null ? {} : { "data-count": String(count) })}
  >
    {children ?? <b>{name}</b>}
    {" "}
    <span className="refusal-sentence" data-portal="refusal-sentence">{owner.sentence}</span>
    {" "}
    <a className="rule-link" data-portal="rule-link" href={ruleHref(owner)}>{owner.name}</a>
  </span>
);

/** A refusal as a surface shows it: a rule's own reads as the rule's sentence, any other stays as `children` (or its name) says it. */
export const Refusal = ({ name, owner, code, count, children }: { readonly name: string; readonly owner: RuleRef | undefined; readonly code?: string; readonly count?: number | null; readonly children?: ReactNode }) =>
  owner === undefined ? <>{children ?? name}</> : <Owned name={name} owner={owner} {...(code === undefined ? {} : { code })} {...(count === undefined ? {} : { count })}>{children}</Owned>;

/** The words of a text with every refusal a rule owns in it made a refusal: the generated docs say them as plain text, and a reader of the page must not meet one without its rule. */
export const withRefusals = (text: string, owners: ReadonlyMap<string, RuleRef>): ReactNode => {
  if (owners.size === 0) return text;
  const names = [...owners.keys()].toSorted((a, b) => b.length - a.length).map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return text.split(new RegExp(`\\b(${names.join("|")})\\b`)).map((part, i) => {
    const owner = owners.get(part);
    return i % 2 === 1 && owner !== undefined ? <Owned key={i} name={part} owner={owner} /> : <Fragment key={i}>{part}</Fragment>;
  });
};

const scopeOf = (r: RuleRef): string => (r.rule.while !== undefined && r.rule.while.length > 0 ? `while ${r.rule.while.join(", ")}` : "in every state");

const RuleRow = ({ rule }: { readonly rule: RuleRef }) => {
  const { fields, refuse, description } = rule.rule;
  return (
    <div className="rule" data-portal="rule" id={ruleId(rule.name)} data-rule={rule.full} data-fields={fields.join(",")} data-while={(rule.rule.while ?? []).join(",")} data-refuse={refuse ?? ""} data-described={description === undefined ? "false" : "true"}>
      <div><b>{rule.name}</b> <span className="meta">{`unique on ${fields.join(", ")}, ${scopeOf(rule)}`}</span></div>
      <p><span data-portal="rule-sentence">{rule.sentence}</span></p>
      <p className="meta">{description === undefined ? "Generated from the rule, so it follows the blueprint." : "Written by the blueprint's author; it replaces the generated sentence everywhere."}</p>
      {refuse === undefined
        ? <p className="meta">Refuses nothing: no caller can break it, so a break is the app's own bug.</p>
        : <p><span className="meta">When it breaks: </span><Owned name={refuse} owner={rule} /></p>}
    </div>
  );
};

/** A thing's Rules section: one row per rule, under its lifecycle. A thing with no rule has none. */
export const Rules = ({ thing }: { readonly thing: ThingWire }) => {
  const rules = rulesOf(thing);
  // The page is drawn after it loads, so the browser has no row to scroll to when a refusal's link opens it: go there once the rows are in.
  useEffect(() => { const id = decodeURIComponent(window.location.hash.slice(1)); if (id !== "") document.getElementById(id)?.scrollIntoView(); }, []);
  if (rules.length === 0) return null;
  return (
    <Widget data-portal="rules">
      <Widget.Header>
        <h2>Rules</h2>
        <Widget.Description>What stays true among the instances. A move that would break one is refused, with the code shown.</Widget.Description>
      </Widget.Header>
      <Widget.Content>{rules.map((r) => <RuleRow key={r.name} rule={r} />)}</Widget.Content>
    </Widget>
  );
};
