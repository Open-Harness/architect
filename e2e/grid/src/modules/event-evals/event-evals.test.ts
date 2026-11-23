// The event row's evals over Plugged In's real model and outputs, and acme's. The same suite runs for every event the model declares.
import { describe, expect, it } from "vitest";
import { editFile, editPortal, editSpans, evidenceOf, judge, withoutProveLine } from "../project-evidence/testing.ts";
import { EventEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const eventsOf = (e: typeof pluggedIn) => Object.values(e.model.things).flatMap((t) => Object.keys(t.events ?? {}));
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(EventEvals.evals, `event.${cell}`, subject, evidence);

describe("Plugged In, as captured on 19 November 2026 (fixtures/plugged-in)", () => {
  it("declares four events", () => {
    expect(eventsOf(pluggedIn)).toEqual(["HandleClaimed", "HandleReleased", "LinkAdded", "LinkRemoved"]);
  });

  it.each(["model", "server", "telemetry"])("event.%s is green for every event", (cell) => {
    for (const event of eventsOf(pluggedIn)) expect({ event, ...check(cell, event) }).toEqual({ event, ok: true, why: [] });
  });

  it("event.docs and event.portal are red: a thing's page names its events only in the move table, with no section that documents their fields", () => {
    for (const event of eventsOf(pluggedIn)) {
      expect(check("docs", event).why, event).toEqual([expect.stringMatching(/^generated\/docs\/(handle|link)\/index\.md has no Events section documenting /)]);
      expect(check("portal", event).why, event).toEqual([expect.stringMatching(/^\/portal\/things\/(handle|link) has no Events section listing /)]);
    }
  });
});

describe("acme", () => {
  it("passes what its model says, for every event it declares", () => {
    expect(eventsOf(acme).length).toBeGreaterThan(0);
    for (const event of eventsOf(acme)) expect({ event, ...check("model", event, acme) }).toEqual({ event, ok: true, why: [] });
  });
});

describe("a wrong output is red, and says what", () => {
  it("a subject the model does not declare", () => {
    expect(check("model", "LinkFlew")).toEqual({ ok: false, why: ["the model has no event LinkFlew"] });
  });

  it("model: an event no move emits", () => {
    const link = pluggedIn.model.things["link"]!;
    const broken = { ...pluggedIn, model: { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...link, machine: { ...link.machine!, moves: { ...link.machine!.moves, remove: { ...link.machine!.moves["remove"]!, emits: "LinkAdded" } } } } } } };
    expect(check("model", "LinkRemoved", broken).why).toEqual(["no move of link's machine emits LinkRemoved"]);
  });

  it("server: an events check prove did not tick, a commit that never named the event, and a private field nothing can show is left out", () => {
    expect(check("server", "LinkAdded", withoutProveLine(pluggedIn, "link.add events")).why).toEqual(['prove did not report "link.add events ✔"']);
    expect(check("server", "LinkAdded", editSpans(pluggedIn, (s) => s.filter((x) => x.attrs["event.name"] !== "LinkAdded"))).why).toEqual(["no committed link.add.commit span names LinkAdded"]);
    const link = pluggedIn.model.things["link"]!;
    const hidden = { ...pluggedIn, model: { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...link, events: { ...link.events, LinkAdded: { ...link.events!["LinkAdded"]!, secretNote: { value: { type: "text" }, visibility: "secret" as const } } } } } } };
    expect(check("server", "LinkAdded", hidden).why).toEqual(["LinkAdded.secretNote is not public, and nothing reads the journal to show it is left out"]);
  });

  it("docs and portal: pass once an Events section lists the event with each field, and not without a field", () => {
    const withEvents = editFile(pluggedIn, "generated/docs/link/index.md", (t) => `${t}\n## Events\n\n- LinkAdded: link\n- LinkRemoved: link\n`);
    expect(check("docs", "LinkAdded", withEvents)).toEqual({ ok: true, why: [] });
    expect(check("docs", "LinkAdded", editFile(pluggedIn, "generated/docs/link/index.md", (t) => `${t}\n## Events\n\n- LinkAdded\n`)).why).toEqual(["generated/docs/link/index.md's Events lists LinkAdded without its field link"]);
    const page = editPortal(pluggedIn, "/portal/things/link", (h) => h.replace("<h2>Roles</h2>", "<h2>Events</h2><ul><li>LinkAdded: link</li></ul><h2>Roles</h2>"));
    expect(check("portal", "LinkAdded", page)).toEqual({ ok: true, why: [] });
    expect(check("portal", "LinkRemoved", page).why).toEqual(["/portal/things/link's Events has no entry for LinkRemoved"]);
  });

  it("telemetry: a commit span without the event's name", () => {
    expect(check("telemetry", "LinkRemoved", editSpans(pluggedIn, (s) => s.map((x) => (x.name === "link.remove.commit" ? { ...x, attrs: { ...x.attrs, "event.name": undefined } } : x)))).why).toEqual(["no link.remove.commit span carries event.name LinkRemoved"]);
  });
});
