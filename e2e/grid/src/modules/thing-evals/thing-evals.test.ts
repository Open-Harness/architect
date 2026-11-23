// The thing row's evals over Plugged In's real model and outputs and over acme's (which has private and secret fields, optional ones and
// described ones, so what a field's row must show is judged from the model, never typed). The same suite runs for every thing the model has.
import { describe, expect, it } from "vitest";
import { editFile, editPortal, editSpans, evidenceOf, judge } from "../project-evidence/testing.ts";
import { LINK_TYPES, LINK_TYPES_PATH, withLinkTypes } from "../sdk-types/testing.ts";
import { ThingEvals } from "./service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const things = Object.keys(pluggedIn.model.things);
const check = (cell: string, subject: string, evidence = pluggedIn) => judge(ThingEvals.evals, `thing.${cell}`, subject, evidence);

describe("Plugged In, as captured on 19 November 2026 (fixtures/plugged-in)", () => {
  it.each(["model", "api", "server", "docs", "portal", "telemetry"])("thing.%s is green for every thing", (cell) => {
    for (const thing of things) expect({ thing, ...check(cell, thing) }).toEqual({ thing, ok: true, why: [] });
  });

  it("thing.sdk is red for every thing: the SDK exports no type, only functions (generators render/internal/sdk)", () => {
    for (const thing of things) expect(check("sdk", thing).why, thing).toEqual([`the SDK exports no type ${pluggedIn.model.things[thing]!.identifier}: a caller cannot name a ${thing}`]);
  });

  it("thing.mcp is red for the things whose tools answer with fields: no output schema", () => {
    expect(check("mcp", "handle").why).toEqual(["handle.claim offers no output schema, so an agent does not know the shape it gets back", "handle.resolve offers no output schema, so an agent does not know the shape it gets back"]);
    expect(check("mcp", "profile").why).toEqual(["profile.get offers no output schema, so an agent does not know the shape it gets back"]);
  });

  it("thing.cli is red where a flag is typed wrongly: link order's position is a uint shown as a string", () => {
    expect(check("cli", "link").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("cli", "handle").ok).toBe(true);
  });
});

describe("acme, from its checked-in outputs", () => {
  it("passes what its model and API say, for every thing it has", () => {
    for (const thing of Object.keys(acme.model.things)) {
      for (const cell of ["model", "api"]) expect({ thing, cell, ...check(cell, thing, acme) }).toEqual({ thing, cell, ok: true, why: [] });
    }
  });
});

describe("a model that declares what Plugged In's does not", () => {
  // Plugged In's own link, with one field made optional, private to the link's owner and described: what its rows must then show is read from the model.
  const title = pluggedIn.model.things["link"]!.fields["title"]!;
  const declared = { ...pluggedIn, model: { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...pluggedIn.model.things["link"]!, fields: { ...pluggedIn.model.things["link"]!.fields, title: { ...title, optional: true, description: "The words on the link", visibility: { private: ["linkOwner"] } } } } } } };

  it("docs and portal are red until the field's optionality, visibility and description are shown", () => {
    const wanted = ["optional (optional)", "visibility (private)", "description (The words on the link)"].map((what) => `row for title does not show its ${what}`);
    expect(check("docs", "link", declared).why).toEqual(wanted.map((w) => `the Fields table's ${w}`));
    expect(check("portal", "link", declared).why).toEqual(wanted.map((w) => `the Fields table's ${w}`));
  });

  it("docs pass once the row shows them", () => {
    const shown = editFile(declared, "generated/docs/link/index.md", (t) => t.replace("| title | LinkTitle |", "| title | LinkTitle, optional, private, The words on the link |"));
    expect(check("docs", "link", shown)).toEqual({ ok: true, why: [] });
  });

  it("a flag must carry its field's description", () => {
    // A private field is not a flag (the caller may not see it), so the description goes on a public one.
    const add = pluggedIn.model.operations["link.add"]!;
    const described = { ...pluggedIn, model: { ...pluggedIn.model, operations: { ...pluggedIn.model.operations, "link.add": { ...add, payload: { ...add.payload, title: { ...add.payload["title"]!, description: "The words on the link" } } } } } };
    const flag = { ...described, cli: { ...described.cli, "link add": "USAGE\n\nFLAGS\n  --title string    \n  --url string    \n  --json    \n" } };
    expect(check("cli", "link", flag).why).toContain('link add --title does not carry the field\'s description "The words on the link"');
  });
});

describe("a wrong output is red, and says what", () => {
  it("a subject the model does not have", () => {
    expect(check("model", "wallet")).toEqual({ ok: false, why: ["the model has no thing wallet"] });
  });

  it("model: a thing with no description or no fields", () => {
    const broken = { ...pluggedIn, model: { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...pluggedIn.model.things["link"]!, description: "", fields: {} } } } };
    expect(check("model", "link", broken).why).toEqual(["it has no description", "it has no fields"]);
  });

  it("api: an endpoint that does not type its payload from the declaration", () => {
    expect(check("api", "link", editFile(pluggedIn, "generated/api/src/link/add.ts", (t) => t.replace("payload: declaration.payloadSchema", "payload: Schema.Any"))).why).toEqual(["generated/api/src/link/add.ts does not type its payload from the declaration"]);
  });

  it("server: an answer shape prove did not tick", () => {
    const lines = pluggedIn.prove!.lines.filter((l) => !l.startsWith("link.add answer shape"));
    expect(check("server", "link", { ...pluggedIn, prove: { ...pluggedIn.prove!, lines } }).why).toEqual(['prove did not report "link.add answer shape ✔"']);
  });

  describe("sdk: every member resolves to what the model says (the checker's verdict; the attacks are in sdk-types.test.ts)", () => {
    const path = LINK_TYPES_PATH;
    it("green: the file the generator writes", () => {
      expect(check("sdk", "link", withLinkTypes(pluggedIn))).toEqual({ ok: true, why: [] });
    });
    it("red: a type that leaves out a field", () => {
      expect(check("sdk", "link", withLinkTypes(pluggedIn, LINK_TYPES.replace('  readonly "url": Of<Declared["url"]>;\n', ""))).why).toEqual([`${path}'s Link leaves out the field url`]);
    });
    it("red: the SDK exports no type for the thing", () => {
      expect(check("sdk", "link").why).toEqual(["the SDK exports no type Link: a caller cannot name a link"]);
    });
    it("red: a helper type that resolves to never, so every member does", () => {
      const tampered = LINK_TYPES.replace(/type Of<F> = .*;/, "type Of<F> = never;");
      expect(check("sdk", "link", withLinkTypes(pluggedIn, tampered)).why).toHaveLength(5);
    });
    it("red: a member typed as a boxed Number, a Promise, or any, and an index signature", () => {
      for (const type of ["Number", "string | Promise<void>", "any", "Record<string, unknown>"]) expect(check("sdk", "link", withLinkTypes(pluggedIn, LINK_TYPES.replace('"title": Of<Declared["title"]>', `"title": ${type}`))).ok, type).toBe(false);
      expect(check("sdk", "link", withLinkTypes(pluggedIn, LINK_TYPES.replace('"state": LinkState;', '"state": LinkState; [key: string]: unknown;'))).ok).toBe(false);
    });
  });

  it("mcp: an output schema that refuses its own answer, one that accepts anything, and a correct one", () => {
    const refusal = { type: "object", properties: { refusal: { type: "string" }, code: { type: "string" }, exit: { type: "integer" }, status: { type: "integer" } }, required: ["refusal", "code", "exit", "status"] };
    const answered = (outputSchema: unknown) => ({ ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "handle.claim" ? { ...t, outputSchema } : t)) });
    const only = (e: typeof pluggedIn) => check("mcp", "handle", e).why.filter((w) => w.startsWith("handle.claim"));
    expect(only(answered({ type: "object", anyOf: [{ type: "object", properties: { handle: { type: "string" } }, required: ["handle"] }, refusal] }))).toEqual([]);
    expect(only(answered({ type: "object", properties: { handle: { type: "integer" } }, anyOf: [{ required: ["handle"] }, refusal] }))[0]).toMatch(/^handle\.claim's output schema refuses its own answer/);
    expect(only(answered({ type: "object" }))[0]).toMatch(/^handle\.claim's output schema accepts {}/);
  });

  it("cli: a flag that is not there, and a numeric flag typed as a number", () => {
    const help = (flag: string) => ({ ...pluggedIn.cli, "link order": `USAGE\n\nFLAGS\n${flag}\n` });
    expect(check("cli", "link", { ...pluggedIn, cli: help("  --link string    \n  --json    ") }).why).toContain("link order has no --position flag");
    expect(check("cli", "link", { ...pluggedIn, cli: help("  --link string    \n  --position integer    \n  --json") }).why).toEqual([]);
  });

  it("mcp: an input schema that leaves out a field, and one that shows a private one", () => {
    const tools = pluggedIn.mcp!;
    const without = tools.map((t) => (t.name === "link.order" ? { ...t, inputSchema: { properties: { link: { type: "string" } } } } : t));
    expect(check("mcp", "link", { ...pluggedIn, mcp: without }).why).toContain("link.order's input schema leaves out the public field position");
    const extra = tools.map((t) => (t.name === "link.remove" ? { ...t, inputSchema: { properties: { link: { type: "string" }, secret: { type: "string" } } } } : t));
    expect(check("mcp", "link", { ...pluggedIn, mcp: extra }).why).toContain("link.remove's input schema shows secret, which is not a public payload field");
  });

  it("docs: a field row that went missing or lost its type", () => {
    expect(check("docs", "link", editFile(pluggedIn, "generated/docs/link/index.md", (t) => t.replace("| url | LinkUrl |\n", ""))).why).toEqual(["the Fields table has no row for the field url"]);
    expect(check("docs", "link", editFile(pluggedIn, "generated/docs/link/index.md", (t) => t.replace("| title | LinkTitle |", "| title | text |"))).why).toEqual(["the Fields table's row for title does not show its type LinkTitle"]);
  });

  it("portal: home with no card for the thing, and a page that only embeds the docs", () => {
    expect(check("portal", "link", editPortal(pluggedIn, "/portal", (h) => h.replace("A title and web address on a public page.</li>", "</li>"))).why).toEqual(["home shows no card for link with its description"]);
    expect(check("portal", "link", editPortal(pluggedIn, "/portal/things/link", (h) => h.slice(h.indexOf("<h2>Docs</h2>")))).why[0]).toMatch(/has no heading link/);
  });

  it("telemetry: a span that carries text the thing does not show, and one that never carries a public field", () => {
    const leaky = editSpans(pluggedIn, (spans) => spans.map((s) => (s.name === "link.add" ? { ...s, attrs: { ...s.attrs, "payload.title": "x" } } : s)));
    expect(check("telemetry", "link", leaky).why).toEqual(["link.add's span carries payload.title, which the thing does not show (private, secret or text not marked traced, or not declared)"]);
    const bare = editSpans(pluggedIn, (spans) => spans.map((s) => (s.name === "link.order" ? { ...s, attrs: Object.fromEntries(Object.entries(s.attrs).filter(([k]) => k !== "payload.position")) } : s)));
    expect(check("telemetry", "link", bare).why).toEqual(["link.order's spans never carry payload.position (public, LinkPosition)"]);
  });
});
