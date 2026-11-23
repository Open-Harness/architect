// The SDK's types judged by what they resolve to. The real file is what the generator writes for Plugged In's link (M1.42); each attack is that file with one thing changed.
import { describe, expect, it } from "vitest";
import { evidenceOf } from "../project-evidence/testing.ts";
import { SdkTypes } from "./service.ts";
import { LINK_TYPES as REAL, typesText } from "./testing.ts";

const pluggedIn = await evidenceOf("plugged-in");
const acme = await evidenceOf("acme");
const link = pluggedIn.model.things["link"]!;
const path = "generated/sdk/src/link/types.ts";



const judged = (text: string, model = pluggedIn.model) => {
  const files = { ...pluggedIn.files, [path]: text };
  const input = { files, model, thing: model.things["link"]!, path };
  return { fields: SdkTypes.fieldProblems(input), state: SdkTypes.stateProblems({ ...input, states: ["listed", "removed"] }) };
};
const change = (from: string, to: string) => REAL.replace(from, to);
const OF = "type Of<F> = F extends { readonly value: { readonly schema: { readonly Type: infer T } } } ? T : F extends { readonly schema: { readonly Type: infer T } } ? T : never;";

describe("the real file", () => {
  it("is green: every member resolves to what the model says, and the state is exactly the machine's", () => {
    expect(judged(REAL)).toEqual({ fields: [], state: [] });
  });
});

describe("a tampered helper type makes every member that uses it resolve wrong", () => {
  it.each([
    ["Of<F> = never", change(OF, "type Of<F> = never;")],
    ["Of<F> = F", change(OF, "type Of<F> = F;")],
    ["Declared = any", change(/type Declared = .*;/.exec(REAL)![0], "type Declared = any;")],
  ])("red: %s", (_name, text) => {
    const { fields } = judged(text);
    expect(fields.length).toBe(5);
    expect(fields[0]).toMatch(/^generated\/sdk\/src\/link\/types\.ts's Link\.id /);
  });
});

describe("a member typed as something that holds no usable value", () => {
  const member = (type: string, field = "title") => change(`readonly "${field}": Of<Declared["${field}"]>;`, `readonly "${field}": ${type};`);
  it.each(["Record<string, unknown>", "Number", "String", "string | Promise<void>", "any", "unknown", "never", "undefined", "string[]", "string | null", "{}", "object", "number", "true", "() => string"])("red: title typed %s", (type) => {
    expect(judged(member(type)).fields, type).toHaveLength(1);
  });
  it("red: an index signature on the type", () => {
    expect(judged(change('readonly "state": LinkState;', 'readonly "state": LinkState; readonly [key: string]: unknown;')).fields[0]).toMatch(/has an index signature/);
  });
  it("green: the primitive the model's kind is, spelled out; red: a literal or a union of them (narrowing is not the field's type)", () => {
    expect(judged(member("string")).fields).toEqual([]);
    for (const narrowed of ['"a" | "b"', '"a"']) expect(judged(member(narrowed)).fields, narrowed).toHaveLength(1);
  });
});

describe("optionality matches the model", () => {
  const field = "title";
  const optional = { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...link, fields: { ...link.fields, [field]: { ...link.fields[field]!, optional: true } } } } };
  it("red: a required field written optional or with undefined", () => {
    expect(judged(change('readonly "title": Of', 'readonly "title"?: Of')).fields).toEqual([`${path}'s Link.title is optional or may be undefined, but every call carries it`]);
    expect(judged(change('readonly "title": Of<Declared["title"]>;', 'readonly "title": Of<Declared["title"]> | undefined;')).fields).toEqual([`${path}'s Link.title is optional or may be undefined, but every call carries it`]);
  });
  it("red: an optional field spelled out as required; green: spelled optional", () => {
    expect(judged(change('readonly "title": Of<Declared["title"]>;', 'readonly "title": string;'), optional).fields).toEqual([`${path}'s Link.title is not optional, but the model says a call may leave it out`]);
    expect(judged(change('readonly "title": Of<Declared["title"]>;', 'readonly "title"?: string;'), optional).fields).toEqual([]);
  });
  it("green: a derived type follows the declaration's own optionality", () => {
    expect(judged(REAL, optional).fields).toEqual([]);
  });
});

describe("the thing's state is exactly the machine's states", () => {
  it.each([
    ["string", 'readonly "state": string;'],
    ["a derived type", 'readonly "state": Of<Declared["state"]>;'],
    ["another type", 'readonly "state": LinkAdded;'],
    ["one state", 'readonly "state": "listed";'],
    ["an extra literal", 'readonly "state": LinkState | "ghost";'],
    ["optional", 'readonly "state": LinkState | undefined;'],
  ])("red: Link.state as %s, while LinkState stays exact", (_name, line) => {
    const { state } = judged(change('readonly "state": LinkState;', line));
    expect(state.length).toBeGreaterThan(0);
    expect(state[0]).toMatch(/^generated\/sdk\/src\/link\/types\.ts's Link\.state resolves to /);
  });
  it("red: an exported LinkState with a value that is not a state, even when Link.state is exact", () => {
    expect(judged(change('"listed" | "removed";', '"listed" | "removed" | number;')).state.some((w) => /LinkState resolves to/.test(w))).toBe(true);
  });
  it("red: no state member at all", () => {
    expect(judged(change('  readonly "state": LinkState;\n', '')).state).toEqual([`${path}'s Link has no state member: a caller's state is not typed`]);
  });
});

describe("the kinds the old parser tests planted, now judged by what they resolve to", () => {
  const member = (type: string, field = "title") => REAL.replace(`readonly "${field}": Of<Declared["${field}"]>;`, `readonly "${field}": ${type};`);
  it("green: the type written as an interface or an alias, with a parenthesised primitive", () => {
    const body = (types: string) => `export interface Link { ${types} }\n`;
    const members = ["id", "profile", "owner", "title", "url"].map((f) => `readonly ${JSON.stringify(f)}: ${f === "url" ? 'Of<Declared["url"]>' : "string"};`).join(" ");
    const head = REAL.slice(0, REAL.indexOf("/** A title and web address"));
    expect(judged(`${head}${body(`${members} readonly "state": LinkState;`)}`).fields).toEqual([]);
    expect(judged(member("(string)")).fields).toEqual([]);
  });
  it.each(["string | number", 'Of<Declared["title"]>[]', 'Of<Declared["title"]> | number', 'Of<Declared["title"]> | null', "string | boolean"])("red: title typed %s", (type) => {
    expect(judged(member(type)).fields, type).toHaveLength(1);
  });
  it("red: a uint typed true, a string or a boolean; green: bigint, number, or both", () => {
    const counted = { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...link, fields: { ...link.fields, title: { ...link.fields["title"]!, value: { type: "uint", bits: 32 } } } } } };
    for (const bad of ["true", "string", "boolean", "5n", "1", "number | bigint"]) expect(judged(member(bad), counted).fields, bad).toHaveLength(1);
    for (const ok of ["bigint", "number"]) expect(judged(member(ok), counted).fields, ok).toEqual([]);
  });
});

describe("the type as a whole: its members are the model's fields and what the generator adds, nothing else", () => {
  const extra = (line: string) => judged(change('  readonly "state": LinkState;\n', `  readonly "state": LinkState;\n  ${line}\n`)).fields;
  it.each([
    ["a required extra", "readonly wrong: number;", "wrong"],
    ["an optional extra", "wrong?: string;", "wrong"],
    ["an extra method", "wrong(): void;", "wrong"],
    ["an extra readonly literal", 'readonly "kind": "link";', "kind"],
  ])("red: %s", (_name, line, member) => {
    expect(extra(line)).toEqual([`${path}'s Link has the member ${member}, which is not one of the thing's fields`]);
  });
  it("red: a call signature, a construct signature, a union with another type, an intersection with a non-object", () => {
    expect(extra("(): number;")).toEqual([`${path}'s Link has a call signature, so it is callable`]);
    expect(extra("new (): Link;")).toEqual([`${path}'s Link has a construct signature, so it can be constructed`]);
    expect(judged(change("export type Link = {", "export type Link = string | {")).fields).toContain(`${path}'s Link is a union, not one object type`);
    expect(judged(change("export type Link = {", "export type Link = number & {").replace('"state": LinkState;\n};', '"state": LinkState;\n};')).fields.some((w) => /is not an object type|is a union/.test(w))).toBe(true);
  });
  it("red: the exported LinkState with a call or construct signature, or an index signature, intersected in", () => {
    for (const extra of ["{ (): number }", "{ new (): Link }", "{ [k: string]: unknown }"]) {
      expect(judged(change('"listed" | "removed";', `("listed" | "removed") & ${extra};`)).state.length, extra).toBeGreaterThan(0);
    }
  });
  it("red: a state member on a thing with no machine", () => {
    const noMachine = { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: { ...link, machine: null } } };
    expect(judged(REAL, noMachine).fields).toEqual([`${path}'s Link has the member state, which is not one of the thing's fields`]);
  });
  it("green: the real Link, and acme's allowance and organization, whose `state` the generator adds", () => {
    expect(judged(REAL).fields).toEqual([]);
    for (const name of ["allowance", "organization", "membership"]) {
      const thing = acme.model.things[name]!;
      const file = `generated/sdk/src/${name}/types.ts`;
      expect(SdkTypes.fieldProblems({ files: { ...acme.files, [file]: typesText(thing) }, model: acme.model, thing, path: file }), name).toEqual([]);
    }
  });
});

describe("a member derived from another field of the same kind is red", () => {
  const allowance = acme.model.things["allowance"]!;
  const check = (model: typeof acme.model, thing: typeof allowance, members: Record<string, string>, file = `generated/sdk/src/${thing.name}/types.ts`) =>
    SdkTypes.fieldProblems({ files: { ...acme.files, [file]: typesText(thing, members) }, model, thing, path: file });

  it("green: acme's allowance as the generator writes it", () => {
    expect(check(acme.model, allowance, {})).toEqual([]);
  });
  it("red: organization derived from member (both ids)", () => {
    expect(check(acme.model, allowance, { organization: 'Of<Declared["member"]>' })).toEqual([`generated/sdk/src/allowance/types.ts's Allowance.organization resolves to string & { readonly __field: "allowance.member"; }, which is derived from allowance.member, not from allowance.organization`]);
  });
  it("red: limit derived from spent (both uints)", () => {
    expect(check(acme.model, allowance, { limit: 'Of<Declared["spent"]>' })[0]).toMatch(/Allowance\.limit resolves to .*derived from allowance\.spent, not from allowance\.limit$/);
  });
  it("red: two members swapped", () => {
    expect(check(acme.model, allowance, { limit: 'Of<Declared["spent"]>', spent: 'Of<Declared["limit"]>' })).toHaveLength(2);
  });
  it("red: a member derived from another thing's field", () => {
    expect(check(acme.model, allowance, { member: 'Of<Declared["id"]>' })[0]).toMatch(/derived from allowance\.id, not from allowance\.member$/);
  });
  it("red: two named-schema fields swapped", () => {
    const extra = { ...link, fields: { ...link.fields, alt: { ...link.fields["url"]! } } };
    const model = { ...pluggedIn.model, things: { ...pluggedIn.model.things, link: extra } };
    const file = "generated/sdk/src/link/types.ts";
    const run = (members: Record<string, string>) => SdkTypes.fieldProblems({ files: { ...pluggedIn.files, [file]: typesText(extra, members) }, model, thing: extra, path: file });
    expect(run({})).toEqual([]);
    expect(run({ url: 'Of<Declared["alt"]>', alt: 'Of<Declared["url"]>' })).toHaveLength(2);
  });
  it("red: a derived type intersected with something that takes any key, or is a Promise", () => {
    const not = (field: string) => new RegExp(`Link\\.${field} resolves to .*(which is not the type the declaration gives link\\.${field}|an index signature and so takes any key)$`);
    for (const extra of ["Record<string, any>", "Number", "{ extra: 1 }", "{ readonly wrong: number }", '"x"', "Promise<void>"]) {
      expect(judged(change('"title": Of<Declared["title"]>', `"title": Of<Declared["title"]> & ${extra}`)).fields[0], `title & ${extra}`).toMatch(not("title"));
      expect(judged(change('"url": Of<Declared["url"]>', `"url": Of<Declared["url"]> & ${extra}`)).fields[0], `url & ${extra}`).toMatch(not("url"));
    }
    expect(judged(change('"title": Of<Declared["title"]>', '"title": Of<Declared["title"]> | number')).fields).toHaveLength(1);
  });
});
