// What a descriptor and a mount keep, and what a mount picked. `@ts-expect-error` lines are checked by tsc.
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Things } from "#modules/things/service.js";
import { Values } from "#modules/values/service.js";
import { Roles } from "#modules/roles/service.js";
import { Operations } from "#modules/operations/service.js";
import { Mounts, Plugins, Stand } from "./service.ts";
import { Via } from "./types.ts";

const style = Plugins.choice({ plain: "As given.", loud: "In capitals." });
const signer = { node: Plugins.choice({ local: "Here.", remote: "Elsewhere." }) };
const echo = Plugins.feature({ description: "Repeats.", choices: { style, signer } });
const Echo = Things.thing({ description: "x", fields: { id: Values.id("ech") } });
const shout = Operations.operation(Echo, { description: "Shout.", payload: {}, answer: {}, allowed: [Roles.anyone] });

describe("plugins", () => {
  it("a descriptor keeps what it was given and says its kind", () => {
    expect(echo.kind).toBe("feature");
    expect(echo.choices.style).toBe(style);
    expect(Object.isFrozen(echo)).toBe(true);
    const projection = Plugins.projection({ description: "Docs.", host: [], ships: [], render: () => Effect.succeed([]) });
    expect(projection.kind).toBe("projection");
    expect(Plugins.adapter({ description: "Prices.", calls: { quote: Plugins.call() } }).calls.quote.mode).toBe("promise");
    expect(Stand.none.how).toBe("none");
  });

  it("a choice's options point back at it, and the first is the default", () => {
    expect(style.loud.choice).toBe(style);
    expect(style.loud.key).toBe("loud");
    expect(Mounts.firstOption(style)).toBe(style.plain);
  });

  it("a mount records its verbs in order, and what it picked is read by identity", () => {
    const mount = Plugins.use(echo, (e) => [e.choose(e.choices.style.loud), e.narrow(shout, { via: [Via.session] }), e.omit(shout)]);
    expect(mount.kind).toBe("mount");
    expect(mount.verbs.map((v) => v.verb)).toEqual(["choose", "narrow", "omit"]);
    expect(Mounts.picked(mount, style.loud)).toBe(true);
    expect(Mounts.picked(mount, style.plain)).toBe(false);
    expect(Mounts.picked(mount, signer.node.local)).toBe(true); // left alone: its first option
    expect(Plugins.use(echo).verbs).toEqual([]);
  });

  it("an adapter's mount hands its calls to the operations that call them, and a call it has none of names itself", () => {
    const quote = Plugins.call({ mode: "effect" });
    const pricing = Plugins.adapter({ description: "Prices.", calls: { quote } });
    const mount = Plugins.use(pricing, (p) => [p.include(p.calls.quote)]);
    expect(mount.calls.quote).toBe(quote);
    expect(mount.verbs[0]).toMatchObject({ verb: "include", items: [quote] });
    expect(Operations.step.call(mount.calls.quote)).toMatchObject({ kind: "step", type: "call", call: quote });
    // @ts-expect-error the adapter has no such call
    const missing = Plugins.use(pricing, (p) => [p.include(p.calls.refund)]).verbs[0];
    expect(missing).toMatchObject({ items: [{ kind: "missing-call", name: "refund" }] });
    expect(Plugins.use(echo).calls).toEqual({});
  });

  it("an adapter's calls nest in groups, its events are schemas, and a name it hasn't answers with its dotted name", () => {
    const create = Plugins.call();
    const comment = Plugins.incoming(Schema.Struct({ action: Schema.String }));
    const github = Plugins.adapter({ description: "Issues.", calls: { issues: { createComment: create }, chatPostMessage: Plugins.call() }, events: { issueComment: comment } });
    const mount = Plugins.use(github, (g) => [g.include(g.calls.issues.createComment, g.events.issueComment)]);
    expect(mount.verbs[0]).toMatchObject({ verb: "include", items: [create, comment] });
    expect(mount.calls.issues.createComment).toBe(create);
    expect(comment).toMatchObject({ kind: "event" });
    // @ts-expect-error the group has no such call
    const call = Plugins.use(github, (g) => [g.include(g.calls.issues.createComent)]).verbs[0];
    expect(call).toMatchObject({ items: [{ kind: "missing-call", name: "issues.createComent" }] });
    // @ts-expect-error the adapter has no such event
    const event = Plugins.use(github, (g) => [g.include(g.events.issueComent)]).verbs[0];
    expect(event).toMatchObject({ items: [{ kind: "missing-event", name: "issueComent" }] });
    expect(Plugins.adapter({ description: "None." }).events).toEqual({});
  });

  it("a need may apply only when an option is picked", () => {
    const greet = Plugins.feature({ description: "Greets.", needs: [echo, Plugins.need(echo, { when: style.loud })] });
    expect(greet.needs?.[1]).toMatchObject({ kind: "need", plugin: echo, when: style.loud });
  });

  it("types: only this plugin's options, only a projection's fields", () => {
    const other = Plugins.choice({ left: "L.", right: "R." });
    // @ts-expect-error an option of a choice the plugin doesn't offer
    Plugins.use(echo, (e) => [e.choose(other.left)]);
    // @ts-expect-error a feature has no such field
    Plugins.feature({ description: "x", colour: "red" });
    // @ts-expect-error render gives back an Effect of files
    Plugins.projection({ description: "x", host: [], ships: [], render: () => "files" });
  });
});
