// The evals judge what an output says, not how it is laid out (the 🔍 on #143). For each one that read a layout, the same correct output
// written another way stays green, and the real defect stays red. The client builder (M1.42) is about to reformat the CLI, docs, API and SDK.
import { describe, expect, it } from "vitest";
import { EventEvals } from "../event-evals/service.ts";
import { MachineEvals } from "../machine-evals/service.ts";
import { OperationEvals } from "../operation-evals/service.ts";
import { RefusalSourceEvals } from "../refusal-source-evals/service.ts";
import { editFile, editPortal, evidenceOf, judge } from "../project-evidence/testing.ts";
import { ThingEvals } from "../thing-evals/service.ts";

const pluggedIn = await evidenceOf("plugged-in");
const link = "generated/docs/link/index.md";

describe("machine.docs: columns by header, states by content", () => {
  const check = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.docs", "link", e);
  const prose = `## Machine

Two states, listed and removed. LinkNotListed (code 31) is what a move from the wrong state gets.

| emits | to | move | note | from |
|---|---|---|---|---|
| LinkAdded | listed | add | new | (creates) |
| LinkRemoved | removed | remove | gone | listed |

`;
  const reformatted = editFile(pluggedIn, link, (t) => t.replace(/## Machine[\s\S]*?(?=## Roles)/, prose));

  it("stays green when the columns are reordered, another column is added and the states are in a sentence", () => {
    expect(check(reformatted)).toEqual({ ok: true, why: [] });
  });
  it("is red when a move's row ends in another state, whatever the column order", () => {
    expect(check(editFile(reformatted, link, (t) => t.replace("| LinkRemoved | removed |", "| LinkRemoved | listed |"))).why).toEqual(["the move table has no correct row for remove"]);
  });
  it("is red when a move emits another event, when a state is never named and when the refusal is gone", () => {
    expect(check(editFile(reformatted, link, (t) => t.replace("| LinkAdded | listed |", "| LinkRemoved | listed |"))).why).toEqual(["the move table has no correct row for add"]);
    expect(check(editFile(reformatted, link, (t) => t.replace(/removed/g, "gone"))).why).toContain("the Machine section does not name the states removed");
    expect(check(editFile(reformatted, link, (t) => t.replace("LinkNotListed (code 31)", "an error"))).why).toEqual(["the Machine section does not name the wrong-state refusal LinkNotListed with its exit 31"]);
  });
});

describe("machine.portal: the same, on the portal's table", () => {
  const route = "/portal/things/link";
  const check = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.portal", "link", e);
  const counted = editPortal(pluggedIn, route, (h) => h.replace("<th>Emits</th>", "<th>Emits</th><th>Count</th>"));
  it("stays green when the portal's columns are reordered", () => {
    const swapped = editPortal(counted, route, (h) => h.replace(/(<h2>Machine<\/h2>[\s\S]*?)<thead>[\s\S]*?<\/tbody>/, "$1<thead><tr><th>Emits</th><th>Move</th><th>To</th><th>From</th><th>Count</th></tr></thead><tbody><tr><td>LinkAdded</td><td>add</td><td>listed</td><td>(creates)</td><td>0</td></tr><tr><td>LinkRemoved</td><td>remove</td><td>removed</td><td>listed</td><td>0</td></tr></tbody>"));
    expect(check(swapped)).toEqual({ ok: true, why: [] });
    expect(check(editPortal(swapped, route, (h) => h.replace("<td>removed</td><td>listed</td><td>0</td>", "<td>listed</td><td>listed</td><td>0</td>"))).why).toEqual([`${route}'s move table has no correct row for remove`]);
  });
});

describe("event.docs: an event's fields, in any layout", () => {
  const check = (e: typeof pluggedIn, event = "LinkAdded") => judge(EventEvals.evals, "event.docs", event, e);
  it("stays green as a table row, a nested list or prose; red when a field is missing or belongs to the next event", () => {
    const table = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n| event | fields |\n|---|---|\n| LinkAdded | link |\n| LinkRemoved | link |\n`);
    const nested = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n- LinkAdded\n  - link: the new link\n- LinkRemoved\n  - link\n`);
    for (const e of [table, nested]) expect(check(e)).toEqual({ ok: true, why: [] });
    const borrowed = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n- LinkAdded\n- LinkRemoved\n  - link\n`);
    expect(check(borrowed).why).toEqual([`${link}'s Events lists LinkAdded without its field link`]);
  });
  it("anchors on the event's own entry: prose that mentions it first, or fields that follow the last event, are not its", () => {
    const prose = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\nA link is listed with LinkAdded, the link field says which, and later LinkRemoved.\n\n- LinkAdded\n- LinkRemoved\n  - link\n`);
    expect(check(prose).why).toEqual([`${link}'s Events lists LinkAdded without its field link`]);
    const last = editFile(pluggedIn, link, (t) => `${t}\n## Events\n\n- LinkRemoved\n- LinkAdded\n  - link\n`);
    expect(check(last, "LinkRemoved").why).toEqual([`${link}'s Events lists LinkRemoved without its field link`]);
    expect(check(last, "LinkAdded")).toEqual({ ok: true, why: [] });
  });
  it("reads an entry whose markup has line breaks inside it", () => {
    const route = "/portal/things/link";
    const portal = (events: string) => judge(EventEvals.evals, "event.portal", "LinkAdded", editPortal(pluggedIn, route, (h) => h.replace("<h2>Roles</h2>", `<h2>Events</h2>${events}<h2>Roles</h2>`)));
    expect(portal("<ul>\n<li>\n  LinkAdded:\n  link\n</li>\n<li>\nLinkRemoved\n</li>\n</ul>")).toEqual({ ok: true, why: [] });
    expect(portal("<table>\n<tr>\n<td>\nLinkAdded\n</td>\n<td>\nlink\n</td>\n</tr>\n</table>")).toEqual({ ok: true, why: [] });
    expect(portal("<ul>\n<li>\n  LinkAdded:\n  nothing\n</li>\n</ul>").why).toEqual([`${route}'s Events lists LinkAdded without its field link`]);
  });
  describe("an entry is the full text of its element, however its content is wrapped", () => {
    const route = "/portal/things/link";
    const portal = (events: string, event = "LinkAdded") => judge(EventEvals.evals, "event.portal", event, editPortal(pluggedIn, route, (h) => h.replace("<h2>Roles</h2>", `<h2>Events</h2>${events}<h2>Roles</h2>`)));
    const docsLike = (events: string, event = "LinkAdded") => judge(EventEvals.evals, "event.portal", event, editPortal(pluggedIn, route, (h) => h.replace("<h2>Roles</h2>", `<h2>Events</h2>${events}<h2>Roles</h2>`)));
    const red = [`${route}'s Events lists LinkAdded without its field link`];

    it("is green with the event and field wrapped in p, div and strong/code, in a list item, a table cell and a definition", () => {
      expect(portal("<ul><li><p>LinkAdded: link</p></li><li><p>LinkRemoved: link</p></li></ul>")).toEqual({ ok: true, why: [] });
      expect(portal("<ul><li><div><strong><code>LinkAdded</code></strong>: <div>link</div></div></li><li>LinkRemoved</li></ul>")).toEqual({ ok: true, why: [] });
      expect(portal("<table><tr><td><p>LinkAdded</p></td><td><div><strong><code>link</code></strong></div></td></tr><tr><td><p>LinkRemoved</p></td><td><p>link</p></td></tr></table>")).toEqual({ ok: true, why: [] });
      expect(portal("<dl><dt><p>LinkAdded</p></dt><dd><div>link</div></dd><dt>LinkRemoved</dt><dd><p>link</p></dd></dl>")).toEqual({ ok: true, why: [] });
    });
    it("is green with inline tags nested and split across lines", () => {
      expect(portal("<ul>\n<li>\n<p>\n<strong>\n  <code>\n LinkAdded\n </code>\n</strong>:\n<span>\n  <em>link</em>\n</span>\n</p>\n</li>\n<li><br/>LinkRemoved</li>\n</ul>")).toEqual({ ok: true, why: [] });
      expect(docsLike("<dl>\n<dt>\n<code>LinkAdded</code>\n</dt>\n<dd>\n<p>\nlink\n</p>\n</dd>\n</dl>")).toEqual({ ok: true, why: [] });
    });
    it("is red with the field missing, in each of them", () => {
      expect(portal("<ul><li><p>LinkAdded</p></li><li><p>LinkRemoved: link</p></li></ul>").why).toEqual(red);
      expect(portal("<table><tr><td><p>LinkAdded</p></td><td><div>nothing</div></td></tr></table>").why).toEqual(red);
      expect(portal("<dl><dt><p>LinkAdded</p></dt><dd><div>nothing</div></dd><dt>LinkRemoved</dt><dd>link</dd></dl>").why).toEqual(red);
      expect(portal("<ul>\n<li>\n<p>\n<strong><code>LinkAdded</code></strong>\n</p>\n</li>\n</ul>").why).toEqual(red);
    });
    it("is red when two events sit in one entry and the field is the second's", () => {
      expect(portal("<ul><li><p>LinkAdded</p><p>LinkRemoved: link</p></li></ul>").why).toEqual(red);
      expect(portal("<ul><li><strong>LinkAdded</strong> and <strong>LinkRemoved</strong>: link</li></ul>").why).toEqual(red);
      expect(portal("<ul><li><strong>LinkAdded</strong> and <strong>LinkRemoved</strong>: link</li></ul>", "LinkRemoved").why).toEqual([`${route}'s Events has no entry for LinkRemoved`]);
    });
  });
  it("reads the portal's list items and table rows the same way", () => {
    const route = "/portal/things/link";
    const portal = (events: string) => judge(EventEvals.evals, "event.portal", "LinkAdded", editPortal(pluggedIn, route, (h) => h.replace("<h2>Roles</h2>", `<h2>Events</h2>${events}<h2>Roles</h2>`)));
    expect(portal("<ul><li>LinkAdded<ul><li>link</li></ul></li><li>LinkRemoved</li></ul>")).toEqual({ ok: true, why: [] });
    expect(portal("<table><tbody><tr><td>LinkAdded</td><td>link</td></tr><tr><td>LinkRemoved</td><td>link</td></tr></tbody></table>")).toEqual({ ok: true, why: [] });
    expect(portal("<p>LinkAdded carries link.</p><ul><li>LinkAdded</li><li>LinkRemoved<ul><li>link</li></ul></li></ul>").why).toEqual([`${route}'s Events lists LinkAdded without its field link`]);
  });
});

describe("thing.cli: a flag's name, type and description, in any layout", () => {
  const check = (help: string) => judge(ThingEvals.evals, "thing.cli", "link", { ...pluggedIn, cli: { ...pluggedIn.cli, "link order": help } });
  it("stays green on a wide table, a short-flag form and flags with the type after an equals sign", () => {
    expect(check("USAGE\n  plugged-in link order [flags]\n\nFLAGS\n  --link string      the link\n  --position integer\n  --json\n")).toEqual({ ok: true, why: [] });
    expect(check("Options:\n  -l, --link <string>\n      Which link.\n  -p, --position=<integer>\n      Where it goes.\n")).toEqual({ ok: true, why: [] });
    expect(check("--link  TEXT\n--position  NUMBER\n")).toEqual({ ok: true, why: [] });
  });
  it("is red when the number is a string, or the flag is gone, in any of them", () => {
    expect(check("Options:\n  -l, --link <string>\n  -p, --position=<string>\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("Options:\n  -l, --link <string>\n").why).toEqual(["link order has no --position flag"]);
    expect(check("FLAGS\n  --link string\n  --positional integer\n").why).toEqual(["link order has no --position flag"]);
  });
  it("judges the type on the type token alone: a word in the description does not make a string a number", () => {
    expect(check("FLAGS\n  --link string  the link\n  --position string  The integer position\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("FLAGS\n  --link string\n  --position string\n      A number, an integer, from zero\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("FLAGS\n  --link string\n  --position integer  The string position\n")).toEqual({ ok: true, why: [] });
  });
  it("reads the whole type expression: an enum's choices in brackets, and a type written after the description", () => {
    const enumField = (type: string) => {
      const add = pluggedIn.model.operations["link.order"]!;
      const model = { ...pluggedIn.model, operations: { ...pluggedIn.model.operations, "link.order": { ...add, payload: { ...add.payload, position: { value: { type: "enum" } } } } } };
      return judge(ThingEvals.evals, "thing.cli", "link", { ...pluggedIn, model, cli: { ...pluggedIn.cli, "link order": `FLAGS\n  --link string\n  --position ${type}\n` } });
    };
    expect(enumField("<listed | removed>")).toEqual({ ok: true, why: [] });
    expect(enumField("[listed|removed]  where it goes")).toEqual({ ok: true, why: [] });
    expect(enumField("{a,b}")).toEqual({ ok: true, why: [] });
    expect(enumField("<string>").why).toEqual(['link order --position: an enum is shown as "string", not its choices']);
    expect(check("FLAGS\n  --link string\n  --position  Where it goes <integer>\n")).toEqual({ ok: true, why: [] });
    expect(check("FLAGS\n  --link string\n  --position  Where it goes <string>\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
    expect(check("FLAGS\n  --link string\n  --position <integer | string>\n").ok).toBe(false);
  });
  it("finds a flag by its own declaration: the usage line and another flag's description do not name it", () => {
    expect(check("USAGE\n  plugged-in link order --position <integer> --link <link>\n\nFLAGS\n  --link string  like --position integer\n").why).toEqual(["link order has no --position flag"]);
    expect(check("FLAGS\n  --link string  set it with --position integer\n  --position string\n").why).toEqual(['link order --position: a uint is shown as "string", not a number']);
  });
  it("ends the last flag's text with the flags section, not with the help", () => {
    const help = "FLAGS\n  --link string\n  --position integer\n\nNOTES\n  --position is the integer position, a string\n";
    expect(check(help)).toEqual({ ok: true, why: [] });
    expect(check("FLAGS\n  --link string\n  --position\n\nGLOBAL FLAGS\n  --log-level integer  the integer level\n").why).toEqual(['link order --position: a uint is shown as no type, not a number']);
  });
});

describe("operation.api: the endpoint's method and path, not its formatting", () => {
  const check = (t: (text: string) => string) => judge(OperationEvals.evals, "operation.api", "link.remove", editFile(pluggedIn, "generated/api/src/link/remove.ts", t));
  it("stays green when the call is spread over lines, single-quoted, or has a comment beside it", () => {
    expect(check((t) => t.replace('HttpApiEndpoint.post("remove", "/link/remove", {', "HttpApiEndpoint\n  .post(\n    'remove',\n    `/link/remove`,\n    {"))).toEqual({ ok: true, why: [] });
    expect(check((t) => `// HttpApiEndpoint.get("remove", "/link/remove")\n${t}`)).toEqual({ ok: true, why: [] });
  });
  it("owns the method: an operation is called with POST (design/history/retired-2026-11-23/frame/projections.md), whatever the endpoint says", () => {
    expect(check((t) => t.replace("HttpApiEndpoint.post(", "HttpApiEndpoint.delete(")).why).toEqual(["generated/api/src/link/remove.ts's endpoint remove is DELETE, but an operation is called with POST (design/history/retired-2026-11-23/frame/projections.md)"]);
    expect(check((t) => t.replace("HttpApiEndpoint.post(", "HttpApiEndpoint.get(")).ok).toBe(false);
  });
  it("is red when the only endpoint call is in a comment", () => {
    expect(check((t) => t.replace("export const endpoint = HttpApiEndpoint.post(", "// HttpApiEndpoint.post(").replace('"remove", "/link/remove", {', '"remove", "/link/remove", {')).ok).toBe(false);
    expect(check((t) => t.replace("export const endpoint = ", "/* ").replace("});\n", "}); */\n")).why[0]).toMatch(/has no endpoint "remove" at \/link\/remove/);
  });
  it("is red when the verb or the path is another", () => {
    expect(check((t) => t.replace('"/link/remove"', '"/link/rm"')).why[0]).toMatch(/has no endpoint "remove" at \/link\/remove/);
    expect(check((t) => t.replace('post("remove"', 'post("rm"')).why[0]).toMatch(/has no endpoint "remove"/);
  });
});

describe("machine.mcp and operation.mcp do not contradict: the description is the model's, the states are in the schema", () => {
  it("is green on both for a tool whose description names no state but whose schema does, and red on machine.mcp when neither does", () => {
    const schema = { properties: { state: { enum: ["listed", "removed"] } } };
    const named = { ...pluggedIn, mcp: pluggedIn.mcp!.map((t) => (t.name === "link.add" ? { ...t, outputSchema: schema, _meta: { move: { key: "add", from: [], to: ["listed"], emits: "LinkAdded" } } } : t.name === "link.remove" ? { ...t, outputSchema: schema, _meta: { move: { key: "remove", from: ["listed"], to: ["removed"], emits: "LinkRemoved" } } } : t)) };
    expect(judge(OperationEvals.evals, "operation.mcp", "link.remove", named)).toEqual({ ok: true, why: [] });
    expect(judge(MachineEvals.evals, "machine.mcp", "link", named)).toEqual({ ok: true, why: [] });
    expect(judge(OperationEvals.evals, "operation.mcp", "link.remove", pluggedIn)).toEqual({ ok: true, why: [] });
    expect(judge(MachineEvals.evals, "machine.mcp", "link", pluggedIn).ok).toBe(false);
  });
});

describe("presentation forms: the same content written another way (#150 round four)", () => {
  const index = "generated/sdk/src/link/index.ts";
  const docsPath = "generated/docs/link/index.md";
  const machineDocs = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.docs", "link", e);
  const machineSdk = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.sdk", "link", e);
  const withMachine = (section: string) => editFile(pluggedIn, docsPath, (t) => t.replace(/## Machine[\s\S]*?(?=## Roles)/, section));

  it("machine.docs: emphasis, code and links in headers and cells are formatting, not part of the label", () => {
    const formatted = withMachine("## **Machine**\n\nStates: `listed`, `removed`. **LinkNotListed** (exit 31) is the refusal.\n\n| **Move** | _From_ | `To` | [Emits](emits.md) |\n|---|---|---|---|\n| **add** | (creates) | `listed` | **LinkAdded** |\n| `remove` | `listed` | `removed` | [LinkRemoved](x.md) |\n\n");
    expect(machineDocs(formatted)).toEqual({ ok: true, why: [] });
    expect(machineDocs(editFile(formatted, docsPath, (t) => t.replace("| `remove` | `listed` | `removed` |", "| `remove` | `listed` | `listed` |"))).why).toEqual(["the move table has no correct row for remove"]);
  });
  it("machine.docs: a cell with an escaped pipe stays one cell", () => {
    const piped = withMachine("## Machine\n\nStates: listed, removed. LinkNotListed (exit 31).\n\n| move | from | to | emits |\n|---|---|---|---|\n| add | (creates) | listed | LinkAdded \\| LinkAdded |\n| remove | listed | removed | LinkRemoved |\n\n");
    expect(machineDocs(piped)).toEqual({ ok: true, why: [] });
  });
  it("machine.docs: states are whole names: `un-listed` is not `listed`, and a state only inside a longer word is not named", () => {
    const hyphen = withMachine("## Machine\n\nStates: un-listed, removed. LinkNotListed (exit 31).\n\n| move | from | to | emits |\n|---|---|---|---|\n| add | (creates) | un-listed | LinkAdded |\n| remove | un-listed | removed | LinkRemoved |\n\n");
    expect(machineDocs(hyphen).why).toEqual(["the Machine section does not name the states listed", "the move table has no correct row for add", "the move table has no correct row for remove"]);
    const longer = withMachine("## Machine\n\nStates: listed, removed2. LinkNotListed (exit 31).\n\n| move | from | to | emits |\n|---|---|---|---|\n| add | (creates) | listed | LinkAdded |\n| remove | listed | removed2 | LinkRemoved |\n\n");
    expect(machineDocs(longer).ok).toBe(false);
  });
  it("machine.docs: a heading with formatting is still the Machine section", () => {
    const heading = editFile(pluggedIn, docsPath, (t) => t.replace("## Machine", "##  _Machine_  ##"));
    expect(machineDocs(heading)).toEqual({ ok: true, why: [] });
  });

  it("machine.sdk: an interface's `state` and an enum's values count like a type alias", () => {
    expect(machineSdk(editFile(pluggedIn, index, (t) => `${t}export interface Link { readonly state: "listed" | "removed" }\n`))).toEqual({ ok: true, why: [] });
    expect(machineSdk(editFile(pluggedIn, index, (t) => `${t}export enum LinkState { Listed = "listed", Removed = "removed" }\nexport type Link = { readonly state: LinkState }\n`))).toEqual({ ok: true, why: [] });
    expect(machineSdk(editFile(pluggedIn, index, (t) => `${t}export type Link = { state: "listed" | "removed" }\n`))).toEqual({ ok: true, why: [] });
  });
  it("machine.sdk: an interface whose state is missing a state, or another property's literals, is red", () => {
    expect(machineSdk(editFile(pluggedIn, index, (t) => `${t}export interface Link { readonly state: "listed"; readonly kind: "removed" }\n`)).ok).toBe(false);
    expect(machineSdk(editFile(pluggedIn, index, (t) => `${t}export enum LinkState { Listed = "listed" }\n`)).ok).toBe(false);
  });

  it("operation.sdk: a function declaration, or a re-export under any syntax, is the same export", () => {
    const check = (e: typeof pluggedIn) => judge(OperationEvals.evals, "operation.sdk", "link.remove", e);
    const fn = "generated/sdk/src/link/remove.ts";
    const described = pluggedIn.model.operations["link.remove"]!.description!;
    const asFunction = editFile(pluggedIn, fn, () => `/**\n * ${described}\n */\nexport function remove(payload: unknown) { return payload }\n`);
    expect(check(asFunction)).toEqual({ ok: true, why: [] });
    expect(check(editFile(asFunction, "generated/sdk/src/link/index.ts", () => 'export { remove as remove } from "./remove.ts"\nexport * from "./add.ts"\n'))).toEqual({ ok: true, why: [] });
    expect(check(editFile(asFunction, fn, (t) => t.replace(described, "Something else"))).why[0]).toMatch(/does not export remove under the doc comment/);
    expect(check(editFile(asFunction, "generated/sdk/src/link/index.ts", () => "// export { remove }\n")).why).toEqual(["the link group does not export remove from ./remove.ts"]);
  });
  it("operation.sdk: a re-export must come from the verb's own file, and the root must export the thing's own group", () => {
    const check = (group: string, root?: string) => {
      const base = editFile(pluggedIn, "generated/sdk/src/link/index.ts", () => group);
      return judge(OperationEvals.evals, "operation.sdk", "link.remove", root === undefined ? base : editFile(base, "generated/sdk/src/index.ts", () => root));
    };
    const real = 'export { remove } from "./remove.ts"\n';
    expect(check(real)).toEqual({ ok: true, why: [] });
    expect(check('export * from "./remove.ts"\n')).toEqual({ ok: true, why: [] });
    expect(check('export { remove as remove } from "./remove.ts"\n')).toEqual({ ok: true, why: [] });
    // The three planted defects: another file's name under the verb's name, another function renamed to it, another thing's group under this one's name.
    expect(check('export { remove } from "./order.ts"\n').why).toEqual(["the link group does not export remove from ./remove.ts"]);
    expect(check('export { add as remove } from "./add.ts"\n').why).toEqual(["the link group does not export remove from ./remove.ts"]);
    expect(check(real, 'export * as link from "./profile/index.ts"\n').why).toEqual(["the SDK does not export the link group as link from ./link/index.ts"]);
    expect(check(real, 'export * as link from "./link/index.ts"\n')).toEqual({ ok: true, why: [] });
  });
  it("machine.docs: a move-table cell lists exactly the model's names: an extra state or event is red", () => {
    const table = (to: string, emits: string, from = "listed") => judge(MachineEvals.evals, "machine.docs", "link", editFile(pluggedIn, docsPath, (t) => t.replace(/## Machine[\s\S]*?(?=## Roles)/, `## Machine\n\nStates: listed, removed. LinkNotListed (exit 31).\n\n| move | from | to | emits |\n|---|---|---|---|\n| add | (creates) | listed | LinkAdded |\n| remove | ${from} | ${to} | ${emits} |\n\n`)));
    expect(table("removed", "LinkRemoved")).toEqual({ ok: true, why: [] });
    expect(table("`removed`, nonexistent", "LinkRemoved").why).toEqual(["the move table has no correct row for remove"]);
    expect(table("removed", "LinkRemoved, Bogus").why).toEqual(["the move table has no correct row for remove"]);
    expect(table("removed", "LinkAdded, LinkRemoved").why).toEqual(["the move table has no correct row for remove"]);
    expect(table("removed", "LinkRemoved", "listed, removed").why).toEqual(["the move table has no correct row for remove"]);
    expect(table("removed", "LinkRemoved", "listed or removed").ok).toBe(false);
  });
  it("operation.portal and thing.portal: the heading is the whole name, not a prefix of a longer one", () => {
    const op = (h: (html: string) => string) => judge(OperationEvals.evals, "operation.portal", "link.remove", editPortal(pluggedIn, "/portal/operations/link.remove", h)).why;
    expect(op((h) => h.replace("<h1>link.remove</h1>", "<h1>link.remove.x</h1>"))).toContain("/portal/operations/link.remove has no heading link.remove");
    expect(op((h) => h.replace("<h1>link.remove</h1>", '<h1 id="t"><code>link.remove</code></h1>')).filter((w) => w.includes("heading"))).toEqual([]);
    const thing = (h: (html: string) => string) => judge(ThingEvals.evals, "thing.portal", "link", editPortal(pluggedIn, "/portal/things/link", h)).why;
    expect(thing((h) => h.replace("<h1>link</h1>", "<h1>linkage</h1>"))).toEqual(["/portal/things/link has no heading link"]);
  });
  it("machine.sdk: a union named for something else does not belong to the thing", () => {
    const check = (decl: string) => judge(MachineEvals.evals, "machine.sdk", "link", editFile(pluggedIn, index, (t) => `${t}${decl}\n`));
    expect(check('export type Linkage = "listed" | "removed"').ok).toBe(false);
    expect(check('export type LinkState = "listed" | "removed"\nexport type Link = { readonly state: LinkState }')).toEqual({ ok: true, why: [] });
    expect(check('export type LinkStatus = "listed" | "removed"\nexport type Link = { readonly state: LinkStatus }')).toEqual({ ok: true, why: [] });
    expect(check('export type Link = { state: "listed" | "removed" }')).toEqual({ ok: true, why: [] });
    expect(check('export interface Other { state: "listed" | "removed" }').ok).toBe(false);
  });
  it("operation.docs: a description that appears only inside a code fence does not count", () => {
    const description = pluggedIn.model.operations["link.remove"]!.description!;
    const check = (t: (text: string) => string) => judge(OperationEvals.evals, "operation.docs", "link.remove", editFile(pluggedIn, "generated/docs/link/remove.md", t));
    expect(check((t) => t.replace(`\n${description}\n`, `\n\`\`\`\n${description}\n\`\`\`\n`)).why).toEqual(["generated/docs/link/remove.md does not carry the description"]);
    expect(check((t) => t.replace(`\n${description}\n`, `\n_${description}_\n`))).toEqual({ ok: true, why: [] });
  });
  it("operation.api: the declaration's schemas in a comment are not the endpoint's", () => {
    const check = (t: (text: string) => string) => judge(OperationEvals.evals, "operation.api", "link.remove", editFile(pluggedIn, "generated/api/src/link/remove.ts", t));
    expect(check((t) => t.replace("payload: declaration.payloadSchema", "payload: Other.schema // declaration.payloadSchema")).why).toEqual(["generated/api/src/link/remove.ts's payload is not the declaration's own schema"]);
    expect(check((t) => t.replace("error: [LinkNotListed, NotAllowed]", "error: [\n    LinkNotListed,\n    NotAllowed,\n  ]"))).toEqual({ ok: true, why: [] });
  });
  it("operation.docs: formatting on a label (`**Budget:**` or none) is the same statement", () => {
    const check = (t: (text: string) => string) => judge(OperationEvals.evals, "operation.docs", "link.remove", editFile(pluggedIn, "generated/docs/link/remove.md", t));
    expect(check((t) => t.replace("**Budget:**", "Budget:").replace("**Who may call:**", "_Who may call:_").replace("# link.remove", "# `link.remove`"))).toEqual({ ok: true, why: [] });
    expect(check((t) => t.replace("**Budget:** p95 150ms.", "**Budget:** p95 999ms.")).ok).toBe(false);
  });

  it("machine.api: a refusal class laid out over several lines, with a comment that quotes the states, is judged on its code", () => {
    const check = (t: (text: string) => string) => judge(MachineEvals.evals, "machine.api", "link", editFile(pluggedIn, "generated/api/src/errors.ts", t));
    const multi = (state: string) => (text: string) => text.replace(/export class LinkNotListed .*\n/, `export class LinkNotListed extends Schema.TaggedError<LinkNotListed>()(\n  "LinkNotListed",\n  { code: Schema.Literal(refusals.LinkNotListed.code), ...{ state: ${state} } },\n  { httpApiStatus: refusals.LinkNotListed.status },\n) {\n  static readonly code = refusals.LinkNotListed.code;\n}\n`);
    expect(check(multi('Schema.Literals(["listed", "removed"])'))).toEqual({ ok: true, why: [] });
    expect(check((t) => `// "listed" "removed"\n${multi("Schema.String")(t)}`).ok).toBe(false);
  });
  it("error.api: the refusals table in any layout, and a class split over lines", () => {
    const check = (t: (text: string) => string) => judge(RefusalSourceEvals.evals, "error.api", "HandleTaken", editFile(pluggedIn, "generated/api/src/errors.ts", t));
    expect(check((t) => t.replace(/HandleTaken: \{ code: "HN-001", exit: 10, status: 422 \},/, "HandleTaken: {\n    code: 'HN-001',\n    exit: 10,\n    status: 422,\n  },"))).toEqual({ ok: true, why: [] });
    expect(check((t) => t.replace('code: "HN-001"', 'code: "HN-777"')).why).toEqual(["the table says HN-777, the model says HN-001"]);
  });
  it("thing.docs and thing.portal: a heading with formatting, a link in a type cell", () => {
    const check = (e: typeof pluggedIn) => judge(ThingEvals.evals, "thing.docs", "link", e);
    expect(check(editFile(pluggedIn, docsPath, (t) => t.replace("# link", "# **link**").replace("| title | LinkTitle |", "| title | [LinkTitle](x.md) |")))).toEqual({ ok: true, why: [] });
    expect(check(editFile(pluggedIn, docsPath, (t) => t.replace("| title | LinkTitle |", "| title | LinkTitleTwo |"))).ok).toBe(false);
  });
});

describe("machine.sdk: a type exported for the thing, not a string anywhere", () => {
  const check = (e: typeof pluggedIn) => judge(MachineEvals.evals, "machine.sdk", "link", e);
  const index = "generated/sdk/src/link/index.ts";
  it("stays green when the SDK has no semicolons, so one type's body ends where the next declaration starts", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t.replace(/;\n/g, "\n")}export type LinkState =\n  | "listed"\n  | "removed"\nexport type Other = "x"\nexport type Link = { readonly state: LinkState }\n`))).toEqual({ ok: true, why: [] });
  });
  it("is red when a neighbour's literals are swallowed, or a state is only in a comment inside the type", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = "listed"\nexport type Removed = "removed"\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = string /* "listed" | "removed" */\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = "listed" // or "removed"\n`)).ok).toBe(false);
  });
  it("stays green for a type with single quotes, spread over lines, or named for the thing in another file", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState =\n  | 'listed'\n  | 'removed';\nexport type Link = { readonly state: LinkState };\n`))).toEqual({ ok: true, why: [] });
    expect(check(editFile(editFile(pluggedIn, "generated/sdk/src/link/state.ts", () => 'export type LinkStatus = "removed" | "listed";\n'), index, (t) => `${t}export type Link = { readonly state: "listed" | "removed" };\n`))).toEqual({ ok: true, why: [] });
  });
  it("is red when the states are only strings in a comment, a function or another thing's type", () => {
    expect(check(editFile(pluggedIn, index, (t) => `${t}// "listed" and "removed"\nexport const states = ["listed", "removed"];\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, "generated/sdk/src/profile/index.ts", (t) => `${t}export type Other = "listed" | "removed";\n`)).ok).toBe(false);
    expect(check(editFile(pluggedIn, index, (t) => `${t}export type LinkState = "listed";\n`)).ok).toBe(false);
  });
});
