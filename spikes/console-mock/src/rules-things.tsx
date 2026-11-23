// ST1.22 screens 1 and 2: a thing's page with its Rules section under the lifecycle (G5 Q1 A, Q2 A, Q3 A).
// Handle's rules, refusals and words: examples/plugged-in/generated/{docs/handle/index.md, docs/profile/index.md, api/src/errors.ts, portal/blueprint.json}.
import { ItemCard } from "@heroui-pro/react/item-card";
import { ItemCardGroup } from "@heroui-pro/react/item-card-group";
import { Widget } from "@heroui-pro/react/widget";
import { Chip, Tabs } from "@heroui/react";
import { BookOpenTextIcon, ScalesIcon, StackIcon } from "@phosphor-icons/react/ssr";
import type { ReactNode } from "react";
import { PortalShell } from "./portal-shell.tsx";
import { Lifecycle, OwnedRefusal, PlainRefusal, RuleRow } from "./rules-parts.tsx";
import { rules } from "./rules-facts.ts";

const TabsRow = () => (
  <Tabs defaultSelectedKey="overview" className="page-tabs">
    <Tabs.ListContainer>
      <Tabs.List aria-label="Thing views">
        <Tabs.Tab id="overview">Overview<Tabs.Indicator /></Tabs.Tab>
        <Tabs.Tab id="metrics">Metrics<Tabs.Indicator /></Tabs.Tab>
        <Tabs.Tab id="docs">Docs<Tabs.Indicator /></Tabs.Tab>
        <Tabs.Tab id="notes">Notes<Tabs.Indicator /></Tabs.Tab>
      </Tabs.List>
    </Tabs.ListContainer>
  </Tabs>
);

const Head = ({ name, description, chips }: { name: string; description: string; chips: ReactNode }) => (
  <header className="goal-head">
    <span className="goal-icon"><StackIcon size={20} aria-hidden="true" /></span>
    <h1 className="mono-title">{name}</h1>
    <p className="muted">{description}</p>
    <div className="props-row"><span className="props-label">Properties</span>{chips}</div>
  </header>
);

const RulesSection = ({ thing, description }: { thing: string; description: string }) => (
  <Widget data-portal="rules">
    <Widget.Header>
      <div className="head-text"><Widget.Title>Rules</Widget.Title><Widget.Description>{description}</Widget.Description></div>
      <ScalesIcon size={18} aria-hidden="true" />
    </Widget.Header>
    <Widget.Content className="flush rules-list">
      {rules.filter((r) => r.thing === thing).map((r) => <RuleRow key={r.name} rule={r} />)}
    </Widget.Content>
  </Widget>
);

const Operation = ({ name, who, what }: { name: string; who: string; what: string }) => (
  <ItemCard data-portal="operation-row" data-operation={name}>
    <ItemCard.Content><ItemCard.Title><a href="#operation" className="mono">{name}</a></ItemCard.Title><ItemCard.Description>{what}</ItemCard.Description></ItemCard.Content>
    <ItemCard.Action><Chip size="sm" variant="soft">{who}</Chip></ItemCard.Action>
  </ItemCard>
);

const Rail = ({ rows, docs }: { rows: [string, ReactNode][]; docs: string }) => (
  <aside className="overview-rail">
    <Widget>
      <Widget.Header><Widget.Title>Properties</Widget.Title></Widget.Header>
      <Widget.Content className="prop-list">
        {rows.map(([k, v]) => <div key={k} className="prop"><span className="muted">{k}</span><span>{v}</span></div>)}
      </Widget.Content>
    </Widget>
    <Widget>
      <Widget.Header><div className="head-text"><Widget.Title>Docs</Widget.Title><Widget.Description>The generated page reads in the same order</Widget.Description></div></Widget.Header>
      <Widget.Content><a href="#docs" className="small mono docs-link"><BookOpenTextIcon size={14} aria-hidden="true" /> {docs}</a></Widget.Content>
    </Widget>
  </aside>
);

/** Screen 1: handle, two rules, each owning a refusal. */
export const HandleThing = () => (
  <PortalShell active="handle" crumbs={["plugged-in", "Things", "handle"]}>
    <div className="page page--wide">
      <TabsRow />
      <div className="overview">
        <div className="overview-main">
          <Head
            name="handle" description="A public name that belongs to one person until they release it, and is the address of a public page."
            chips={<><Chip size="sm" variant="soft">lives in the database</Chip><Chip size="sm" variant="soft">code prefix HN</Chip><Chip size="sm" variant="soft">role handleOwner</Chip></>}
          />
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Lifecycle</Widget.Title><Widget.Description>The states a handle moves through. A move from the wrong state is refused.</Widget.Description></div></Widget.Header>
            <Widget.Content>
              <Lifecycle
                states={["claimed", "released"]}
                moves={[{ name: "claim", from: "", to: "claimed", emits: "HandleClaimed" }, { name: "release", from: "claimed", to: "released", emits: "HandleReleased" }]}
                notFrom="HandleNotClaimed"
              />
            </Widget.Content>
          </Widget>
          <RulesSection thing="handle" description="What stays true among handles. A rule is checked each time a move would break it; the caller is then refused with the code shown." />
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Operations</Widget.Title><Widget.Description>What a person or an agent can do with a handle</Widget.Description></div></Widget.Header>
            <Widget.Content className="flush">
              <ItemCardGroup variant="transparent">
                <Operation name="claim" who="anyone signed in" what="Claim a free name and make it the address of your public page, with its profile." />
                <Operation name="release" who="the handleOwner" what="Free your name and take its public page offline. Anyone may claim the name afterwards." />
                <Operation name="resolve" who="anyone" what="Find the handle that holds a claimed name. A released or unclaimed name has none." />
              </ItemCardGroup>
            </Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Errors</Widget.Title><Widget.Description>Every refusal of this thing, and what decides it: a rule, the machine, or the handler</Widget.Description></div></Widget.Header>
            <Widget.Content className="errors-list">
              <OwnedRefusal name="HandleTaken" />
              <OwnedRefusal name="HandleAlreadyOwned" />
              <PlainRefusal name="HandleNotClaimed" why="Decided by the machine: a move from a state it can't start from. Carries the handle's state." />
              <PlainRefusal name="HandleNotFound" why="Declared in errors.ts, decided by the handler: a name nobody has claimed does not resolve." />
            </Widget.Content>
          </Widget>
        </div>
        <Rail
          docs="generated/docs/handle/index.md"
          rows={[["Lives in", "the database"], ["Code prefix", <span className="mono">HN</span>], ["Roles", <span className="mono">handleOwner</span>], ["Moves", <span className="mono">claim, release</span>], ["Events", <span className="mono">HandleClaimed, HandleReleased</span>]]}
        />
      </div>
    </div>
  </PortalShell>
);

/** Screen 2: profile, one rule that refuses nothing, no lifecycle. */
export const ProfileThing = () => (
  <PortalShell active="profile" crumbs={["plugged-in", "Things", "profile"]}>
    <div className="page page--wide">
      <TabsRow />
      <div className="overview">
        <div className="overview-main">
          <Head
            name="profile" description="A claimed name's public page, with its links in the order they were put."
            chips={<><Chip size="sm" variant="soft">lives in the database</Chip><Chip size="sm" variant="soft">code prefix PR</Chip><Chip size="sm" variant="soft">no lifecycle</Chip></>}
          />
          <RulesSection thing="profile" description="What stays true among profiles. This rule names no refusal: no caller can break it, so a break is a defect in the app." />
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Operations</Widget.Title><Widget.Description>What a person or an agent can do with a profile</Widget.Description></div></Widget.Header>
            <Widget.Content className="flush">
              <ItemCardGroup variant="transparent">
                <Operation name="get" who="anyone" what="Read a claimed name's public page and its links in display order." />
              </ItemCardGroup>
            </Widget.Content>
          </Widget>
          <Widget>
            <Widget.Header><div className="head-text"><Widget.Title>Errors</Widget.Title><Widget.Description>Every refusal of this thing, and what decides it</Widget.Description></div></Widget.Header>
            <Widget.Content className="errors-list">
              <PlainRefusal name="ProfileNotFound" why="Declared in errors.ts, decided by the handler: a name nobody claimed has no page." />
            </Widget.Content>
          </Widget>
        </div>
        <Rail
          docs="generated/docs/profile/index.md"
          rows={[["Lives in", "the database"], ["Code prefix", <span className="mono">PR</span>], ["Roles", <span className="muted">none</span>], ["Rules", <span className="mono">onePagePerHandle</span>], ["Refusals it owns", <span className="muted">none</span>]]}
        />
      </div>
    </div>
  </PortalShell>
);

