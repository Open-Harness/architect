// Parts shared by the four ST1.22 screens. The data-portal hooks are check 28's contract (e2e/m1/28-st1-22-rules-in-the-portal.test.ts):
// rules, rule, rule-sentence, refusal, refusal-sentence, rule-link, spine-stop, plus lifecycle and operation-row from check 21.
import { Chip } from "@heroui/react";
import { ArrowRightIcon, LinkSimpleIcon } from "@phosphor-icons/react/ssr";
import { refusals, ruleOf, type Rule } from "./rules-facts.ts";

export const ruleId = (r: Pick<Rule, "name">) => `rule-${r.name}`;
export const ruleHref = (r: Rule) => `/portal/things/${r.thing}#${ruleId(r)}`;

/** A refusal a rule owns: its code, what a caller gets, the rule's sentence, and a link to the rule's row. The same markup on every surface. */
export const OwnedRefusal = ({ name }: { name: string }) => {
  const f = refusals[name]!;
  const rule = ruleOf(name)!;
  return (
    <span className="refusal" data-portal="refusal" data-refusal={name} data-rule={`${rule.thing}.${rule.name}`}>
      <span className="refusal-head">
        <Chip size="sm" variant="soft" color="warning"><span className="mono">{name}</span></Chip>
        <span className="mono muted">{f.code} · HTTP {f.status} · exit {f.exit}</span>
      </span>
      <span className="refusal-line">
        <span data-portal="refusal-sentence">{rule.sentence}</span>
        <a data-portal="rule-link" href={ruleHref(rule)} className="mono"><LinkSimpleIcon size={12} aria-hidden="true" />{rule.name}</a>
      </span>
    </span>
  );
};

/** A refusal no rule owns (the machine's, the handler's, the door's): code and what a caller gets, no rule, no link. */
export const PlainRefusal = ({ name, why }: { name: string; why: string }) => {
  const f = refusals[name]!;
  return (
    <span className="refusal">
      <span className="refusal-head">
        <Chip size="sm" variant="soft"><span className="mono">{name}</span></Chip>
        <span className="mono muted">{f.code} · HTTP {f.status} · exit {f.exit}</span>
      </span>
      <span className="refusal-line muted">{why}</span>
    </span>
  );
};

/** The lifecycle: states joined by their moves. The wire's machine carries `notFrom` (HandleNotClaimed), which no rule owns, so it sits on the arrow it guards. */
export const Lifecycle = ({ states, moves, notFrom }: {
  states: string[]; moves: { name: string; from: string; to: string; emits: string }[]; notFrom: string;
}) => (
  <div data-portal="lifecycle" className="lifecycle">
    <span className="state state--start" aria-label="before it exists">·</span>
    {moves.map((m) => (
      <span key={m.name} className="lc-step">
        <span className="arrow">
          <span className="arrow-name mono">{m.name}</span>
          <span className="arrow-line"><ArrowRightIcon size={16} aria-hidden="true" /></span>
          <span className="arrow-emits mono muted">emits {m.emits}</span>
          {m.from ? <span className="arrow-guard mono">any other state is refused {notFrom}</span> : null}
        </span>
        <span className="state mono">{m.to}</span>
      </span>
    ))}
  </div>
);

export const RuleRow = ({ rule }: { rule: Rule }) => (
  <div
    className="rule-row" data-portal="rule" id={ruleId(rule)} data-rule={`${rule.thing}.${rule.name}`} data-fields={rule.fields.join(",")}
    data-while={rule.while.join(",")} data-refuse={rule.refuse ?? ""} data-described={rule.described ? "true" : "false"}
  >
    <div className="rule-main">
      <span className="eyebrow">The rule</span>
      <div className="rule-title">
        <strong className="mono">{rule.name}</strong>
        <Chip size="sm" variant="soft">unique</Chip>
        <Chip size="sm" variant="soft"><span className="mono">{rule.fields.join(", ")}</span></Chip>
        <Chip size="sm" variant="soft">{rule.while.length ? `while ${rule.while.join(", ")}` : "in every state"}</Chip>
      </div>
      <p className="rule-sentence"><span data-portal="rule-sentence">{rule.sentence}</span></p>
      <span className="small muted">{rule.described ? "Written by the blueprint's author; it replaces the generated sentence everywhere." : "Generated from the rule, so it follows the blueprint."}</span>
    </div>
    <div className="rule-refuses">
      <span className="eyebrow">When it breaks</span>
      {rule.refuse ? <OwnedRefusal name={rule.refuse} /> : (
        <span className="refusal"><span className="refusal-head"><Chip size="sm" variant="soft" color="danger">defect</Chip></span>
          <span className="refusal-line muted">Refuses nothing: no caller can break it, so a break is the app's own bug.</span></span>
      )}
    </div>
  </div>
);
