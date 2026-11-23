// ST1.22 screens 3 and 4: an operation's page. Refusals a rule owns read as the rule's sentence and link to its row (G5 Q2 A); the spine gets a
// "rules" stop between the move and the commit for an operation that can break a rule (G5 Q4 A). claim has one, release has none.
// Facts: examples/plugged-in/generated/{docs/handle/claim.md, docs/handle/release.md, api/src/errors.ts, portal/blueprint.json}.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Timeline } from "@heroui-pro/react/timeline";
import { Widget } from "@heroui-pro/react/widget";
import { Chip, Tabs } from "@heroui/react";
import { ArrowRightIcon, ListChecksIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { PortalShell } from "./portal-shell.tsx";
import { OwnedRefusal, PlainRefusal, ruleId } from "./rules-parts.tsx";
import { rules, when } from "./rules-facts.ts";

type Row = { key: string; title: string; detail: ReactNode; stop?: "move" | "rules" | "commit"; rules?: string[]; status?: "default" | "current" };

const Spine = ({ rows }: { rows: Row[] }) => (
  <Timeline size="sm" className="spine">
    {rows.map((r) => (
      <Timeline.Item
        key={r.key} status={r.stop === "rules" ? "current" : "default"} className={r.stop === "rules" ? "spine-rules" : undefined}
        {...(r.stop ? { "data-portal": "spine-stop", "data-stop": r.stop } : {})}
        {...(r.rules ? { "data-rules": r.rules.join(",") } : {})}
      >
        <Timeline.Rail><Timeline.Marker /><Timeline.Connector /></Timeline.Rail>
        <Timeline.Content><span className="spine-title"><strong className="mono">{r.title}</strong></span><span className="spine-detail">{r.detail}</span></Timeline.Content>
      </Timeline.Item>
    ))}
  </Timeline>
);

const RulesStopDetail = ({ names }: { names: string[] }) => (
  <span className="rules-stop">
    <span>A move is checked against these rules before it commits. A call that breaks one stops here and is refused as the rule's sentence above.</span>
    <span className="rules-stop-list">
      {names.map((n) => <a key={n} href={`/portal/things/handle#${ruleId({ name: n })}`} className="mono rule-chip">{n}</a>)}
    </span>
  </span>
);

const Band = ({ inn, out, name, emits }: { inn: [string, string][]; out: [string, string][]; name: string; emits: string }) => (
  <div className="band">
    <div className="band-side"><span className="eyebrow">In</span>{inn.map(([k, v]) => <span key={k} className="mono band-field">{k}: <span className="muted">{v}</span></span>)}</div>
    <ArrowRightIcon size={18} aria-hidden="true" className="band-arrow" />
    <div className="band-op"><span className="mono">{name}</span><span className="small muted">emits {emits}</span></div>
    <ArrowRightIcon size={18} aria-hidden="true" className="band-arrow" />
    <div className="band-side"><span className="eyebrow">Out</span>{out.length ? out.map(([k, v]) => <span key={k} className="mono band-field">{k}: <span className="muted">{v}</span></span>) : <span className="muted small">nothing</span>}</div>
  </div>
);

const Journey = ({ title, start }: { title: string; start: string }) => (
  <ItemCard><ItemCard.Content><ItemCard.Title>{title}</ItemCard.Title><ItemCard.Description>Starts from {start}</ItemCard.Description></ItemCard.Content></ItemCard>
);

const OperationPage = ({ name, active, description, chips, band, refusals, refusalNote, spineNote, rows, props, journeys }: {
  name: string; active: string; description: string; chips: ReactNode; band: ReactNode; refusals: ReactNode; refusalNote: string; spineNote: string; rows: Row[];
  props: [string, ReactNode][]; journeys: { title: string; start: string }[];
}) => (
  <PortalShell active={active} crumbs={["plugged-in", "Things", "handle", name.split(".")[1]!]}>
    <div className="page page--wide">
      <Tabs defaultSelectedKey="contract" className="page-tabs">
        <Tabs.ListContainer>
          <Tabs.List aria-label="Operation views">
            {["Contract", "Metrics", "Proof", "Docs", "Notes"].map((t) => <Tabs.Tab key={t} id={t.toLowerCase()}>{t}<Tabs.Indicator /></Tabs.Tab>)}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
      <div className="overview">
        <div className="overview-main">
          <header className="goal-head">
            <span className="goal-icon"><ListChecksIcon size={20} aria-hidden="true" /></span>
            <h1 className="mono-title">{name}</h1>
            <p className="muted">{description}</p>
            <div className="props-row"><span className="props-label">Properties</span>{chips}</div>
          </header>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>In and out</Widget.Title><Widget.Description>What goes in, what comes out, and what it emits</Widget.Description></div></Widget.Header>
            <Widget.Content>{band}</Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Refusals</Widget.Title><Widget.Description>{refusalNote}</Widget.Description></div></Widget.Header>
            <Widget.Content className="errors-list">{refusals}</Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>The spine</Widget.Title><Widget.Description>{spineNote}</Widget.Description></div></Widget.Header>
            <Widget.Content><Spine rows={rows} /></Widget.Content>
          </Widget>
        </div>
        <aside className="overview-rail">
          <Widget>
            <Widget.Header><Widget.Title>Properties</Widget.Title></Widget.Header>
            <Widget.Content className="prop-list">{props.map(([k, v]) => <div key={k} className="prop"><span className="muted">{k}</span><span>{v}</span></div>)}</Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Journeys that call it</Widget.Title><Widget.Description>Declared in the blueprint, from its generated docs</Widget.Description></div></Widget.Header>
            <Widget.Content className="flush"><ItemCardGroup variant="transparent">{journeys.map((j) => <Journey key={j.title} {...j} />)}</ItemCardGroup></Widget.Content>
          </Widget>
        </aside>
      </div>
    </div>
  </PortalShell>
);

const claimRules = rules.filter((r) => r.thing === "handle").map((r) => r.name);

/** Screen 3: handle.claim breaks two rules, so it has a rules stop. */
export const ClaimOperation = () => (
  <OperationPage
    name="handle.claim" active="handle.claim"
    description="Claim a free name and make it the address of your public page, with its profile."
    chips={<><Chip size="sm" variant="soft">anyone signed in</Chip><Chip size="sm" variant="soft">idempotent by request</Chip><Chip size="sm" variant="soft">p95 150 ms</Chip><Chip size="sm" variant="soft"><a href="#thing">thing handle</a></Chip></>}
    band={<Band name="handle.claim" emits="HandleClaimed" inn={[["name", "handle.name"]]} out={[["handle", "handle.id"]]} />}
    refusals={<>
      <OwnedRefusal name="HandleTaken" />
      <OwnedRefusal name="HandleAlreadyOwned" />
      <PlainRefusal name="NotAllowed" why={`The caller isn't anyone signed in; ${when.NotAllowed!.split("; ")[1]}.`} />
      <PlainRefusal name="IdempotencyConflict" why={`The request key was first used with another payload; ${when.IdempotencyConflict!.split("; ")[1]}.`} />
    </>}
    refusalNote="The ways this operation says no. A rule's refusal reads as the rule's sentence and links to its row."
    spineNote="The fixed order every call runs in, drawn from the model. The rules stop sits between the move and the commit."
    rows={[
      { key: "role", title: "role check", detail: "anyone signed in" },
      { key: "replay", title: "replay", detail: "the request key: the same key twice is one call" },
      { key: "machine", title: "machine check", detail: "nothing yet, so the move creates" },
      { key: "step", title: "step handle.claim.record", detail: "database" },
      { key: "move", title: "move claim", detail: "→ claimed, emits HandleClaimed", stop: "move" },
      { key: "rules", title: "rules", detail: <RulesStopDetail names={claimRules} />, stop: "rules", rules: claimRules.map((n) => `handle.${n}`) },
      { key: "commit", title: "commit", detail: "the database", stop: "commit" },
    ]}
    props={[["Who may call", "anyone signed in"], ["Idempotent", "by request"], ["Budget", <span className="mono">p95 150 ms</span>], ["Move", <span className="mono">claim → claimed</span>], ["Step", <span className="mono">handle.claim.record</span>]]}
    journeys={[
      { title: "a name is claimed once", start: "the world claimed" }, { title: "a stranger cannot edit a page", start: "the world page-to-guard" },
      { title: "claim a handle", start: "an empty world" }, { title: "release a handle", start: "the world claimed-to-release" },
    ]}
  />
);

/** Screen 4: handle.release breaks no rule, so it has no rules stop. */
export const ReleaseOperation = () => (
  <OperationPage
    name="handle.release" active="handle.release"
    description="Free your name and take its public page offline. Anyone may claim the name afterwards."
    chips={<><Chip size="sm" variant="soft">the handleOwner of the handle</Chip><Chip size="sm" variant="soft">p95 150 ms</Chip><Chip size="sm" variant="soft"><a href="#thing">thing handle</a></Chip></>}
    band={<Band name="handle.release" emits="HandleReleased" inn={[["handle", "handle.id"]]} out={[]} />}
    refusals={<>
      <PlainRefusal name="HandleNotClaimed" why="The handle is in a state release can't start from. Decided by the machine; carries the state." />
      <PlainRefusal name="NotAllowed" why="The caller isn't the handleOwner of the handle; the handler never runs." />
    </>}
    refusalNote="The ways this operation says no. None is a rule's: the machine and the door decide them."
    spineNote="The same fixed order. Release only leaves claimed and creates nothing, so no rule can break and the spine has no rules stop."
    rows={[
      { key: "role", title: "role check", detail: "the handleOwner of the handle" },
      { key: "machine", title: "machine check", detail: "claimed → released; any other state is refused" },
      { key: "step", title: "step handle.release.record", detail: "database" },
      { key: "move", title: "move release", detail: "claimed → released, emits HandleReleased", stop: "move" },
      { key: "commit", title: "commit", detail: "the database", stop: "commit" },
    ]}
    props={[["Who may call", "the handleOwner of the handle"], ["Idempotent", <span className="muted">no</span>], ["Budget", <span className="mono">p95 150 ms</span>], ["Move", <span className="mono">release: claimed → released</span>], ["Step", <span className="mono">handle.release.record</span>]]}
    journeys={[{ title: "a stranger cannot edit a page", start: "the world page-to-guard" }, { title: "release a handle", start: "the world claimed-to-release" }]}
  />
);
