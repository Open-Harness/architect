// An operation's spine: the fixed order every call runs in, drawn from the model (portal.md, "An operation's page"). Each stop is a row; the three
// that check 28 reads carry `data-portal="spine-stop"` and `data-stop`: `move`, then `rules` (only for an operation that can break a rule, G5 Q4), then `commit`.
import { Timeline } from "@orthograph/portal-ui";
import type { ReactNode } from "react";
import type { BlueprintWire, OperationWire } from "#modules/wire/types.js";
import { ruleHref, rulesBroken } from "./rules.ts";
import { who } from "./parts.tsx";

interface Stop {
  readonly key: string;
  readonly title: string;
  readonly detail: ReactNode;
  /** The stop is one of the three the portal's checks read. */
  readonly stop?: "move" | "rules" | "commit";
  readonly rules?: ReadonlyArray<string>;
}

/** The stops, in the order a call runs them. An operation with no handler (a read) has none. */
const stopsOf = (b: BlueprintWire, op: OperationWire): ReadonlyArray<Stop> => {
  if (op.kind === "read") return [];
  const thing = b.model.things[op.thing];
  const machine = thing?.machine ?? null;
  const broken = rulesBroken(b, op);
  const store = thing === undefined ? "its store" : thing.lives === "actor" ? "its own Durable Object" : "the database";
  return [
    { key: "role", title: "role check", detail: who(op) },
    ...(op.idempotent === null ? [] : [{ key: "replay", title: "replay", detail: "the request key: the same key twice is one call" }]),
    ...(op.move === null || machine === null
      ? []
      : [{ key: "machine", title: "machine check", detail: op.move.from.length === 0 ? "nothing yet, so the move creates" : `${op.thing} is ${op.move.from.join(" or ")}, else refused ${machine.notFrom.error}` }]),
    ...Object.values(op.steps).map((s) => ({ key: `step:${s.name}`, title: `step ${s.name}`, detail: s.type })),
    ...(op.move === null ? [] : [{ key: "move", title: `move ${op.move.key}`, detail: `to ${op.move.to.join(" or ")}, emits ${op.move.emits}`, stop: "move" as const }]),
    ...(broken.length === 0 ? [] : [{
      key: "rules", title: "rules", stop: "rules" as const, rules: broken.map((r) => r.full),
      detail: (
        <span>
          {"A move is checked against these rules before it commits; a call that breaks one stops here and is refused as the rule's sentence. "}
          {broken.map((r) => (
            <span key={r.full} className="rule-stop" data-portal="spine-rule" data-rule={r.full}>
              <a className="rule-link" data-portal="rule-link" href={ruleHref(r)}>{r.name}</a>
              {" "}
              <span data-portal="spine-rule-sentence">{r.sentence}</span>
            </span>
          ))}
        </span>
      ),
    }]),
    { key: "commit", title: "commit", detail: store, stop: "commit" as const },
  ];
};

export const Spine = ({ blueprint, op }: { readonly blueprint: BlueprintWire; readonly op: OperationWire }) => {
  const stops = stopsOf(blueprint, op);
  if (stops.length === 0) return null;
  return (
    <>
      <h3>The spine</h3>
      <p className="meta">The fixed order every call runs in, drawn from the model. A rule is checked between the move and the commit.</p>
      <Timeline size="sm" className="spine">
        {stops.map((s) => (
          <Timeline.Item
            key={s.key} status={s.stop === "rules" ? "current" : "default"}
            {...(s.stop === undefined ? {} : { "data-portal": "spine-stop", "data-stop": s.stop })}
            {...(s.rules === undefined ? {} : { "data-rules": s.rules.join(",") })}
          >
            <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
            <Timeline.Content><b>{s.title}</b>{" "}<span className="meta">{s.detail}</span></Timeline.Content>
          </Timeline.Item>
        ))}
      </Timeline>
    </>
  );
};
