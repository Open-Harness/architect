// #1034: the generated CLI hands a flag whose field is a list or a struct to the declaration as JSON, not as text, so
// `capxul journal-entry create --lines '[...]'` decodes. Judged by running the command `renderCli` writes for an operation
// of a scratch blueprint, compiled by the real compiler (so a build may teach the compiler, the renderer or the command
// which fields are lists or structs), beside a stand-in SDK that records what it is given and the real `output.ts`.
//
// The operation's payload is capxul's `lines` (`Blueprint.value(Schema.Array(Line))`, its rows a struct holding a 128-bit
// whole number), a `Blueprint.list` of text, and a `Blueprint.value(Schema.Struct(...))`, each red on main, where each stays
// a string and is refused before the SDK. The controls: a thing's text field and a raw `Schema.String` value are still
// taken as written (`[1]` stays the text `[1]`), and a `Blueprint.refAny()` still takes its JSON.
//
//  1. Two lines decode to two rows, in order, their amounts whole numbers; a list of text and a struct decode too.
//  2. Malformed JSON, or JSON of the wrong shape, is refused before the SDK is called: a message on stderr that names the
//     flag's field, no stack trace, and a non-zero exit (the CLI's own `SchemaError` exits 2; effect/cli's refusal of a
//     flag's value is also accepted). Which words say why are the build's.
//  3. `--help` says the flag takes JSON (in its metavar or its description), and a text flag's line does not.
//
// Not judged: an optional list or struct left out (as today, not sent), a list or struct in an answer, and whether a
// refusal's message repeats the value given.
// Written by #1034's checks author. The red cases are listed in packages/projections/expected-failing/list-and-struct-flags.txt (G11).
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { type Context, Effect, FileSystem, Layer, Path, Stdio, Terminal } from "effect";
import { Command } from "effect/cli";
import { ChildProcessSpawner } from "effect/process";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { Model } from "@orthograph/compiler";
import { renderCli } from "./internal/cli.ts";

const repo = resolve(import.meta.dirname, "../../../../..");
// Under the package, so `effect` and `orthograph` resolve from the scratch project the way generated code's imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/list-and-struct-flags");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const THING = `import { Blueprint } from "orthograph";
export const Entry = Blueprint.thing({ description: "An entry.", fields: { id: Blueprint.id("ent"), memo: Blueprint.text({ max: 100 }) }, code: "EN" });
`;
// capxul's journal-entry create, cut down: its \`lines\` as capxul declares it.
const VERB = `import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { Entry } from "../thing.ts";
const Line = Schema.Struct({ account: Schema.String, debit: Blueprint.uint(128).schema });
export default Blueprint.operation(Entry, {
  description: "Post an entry.",
  payload: {
    memo: Entry.fields.memo,
    lines: Blueprint.described(Blueprint.value(Schema.Array(Line).check(Schema.isMaxLength(50))), "Its lines, in order."),
    tags: Blueprint.list(Blueprint.text({ max: 20 })),
    where: Blueprint.value(Schema.Struct({ city: Schema.String })),
    name: Blueprint.value(Schema.String.check(Schema.isMaxLength(30))),
    about: Blueprint.refAny(),
  },
  answer: { entry: Entry.fields.id },
  allowed: [Blueprint.anyone],
});
`;
// The controls' own verb: no list or struct, so main takes it as it is.
const NOTE = `import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { Entry } from "../thing.ts";
export default Blueprint.operation(Entry, {
  description: "Note an entry.",
  payload: { memo: Entry.fields.memo, name: Blueprint.value(Schema.String.check(Schema.isMaxLength(30))), about: Blueprint.refAny(), blob: Blueprint.value(Schema.fromJsonString(Schema.Struct({ n: Schema.Number }))) },
  answer: { entry: Entry.fields.id },
  allowed: [Blueprint.anyone],
});
`;
// The edges: an optional list given, and a struct that may be null (a union where it travels).
const FILE = `import { Blueprint } from "orthograph";
import { Schema } from "effect";
import { Entry } from "../thing.ts";
export default Blueprint.operation(Entry, {
  description: "File an entry.",
  payload: {
    memo: Entry.fields.memo,
    opt: Blueprint.optional(Blueprint.list(Blueprint.text({ max: 20 }))),
    maybe: Blueprint.value(Schema.NullOr(Schema.Struct({ city: Schema.String }))),
  },
  answer: { entry: Entry.fields.id },
  allowed: [Blueprint.anyone],
});
`;
const api = (verb: string) => `import declaration from "../../../../blueprint/things/entry/verbs/${verb}.ts";
export { declaration };
`;
const SDK = `import { Effect } from "effect";
export const Errors = { refusals: {}, codes: {}, declared: {} };
export const given: Array<unknown> = [];
const take = (payload: unknown) => Effect.sync(() => { given.push(payload); return { entry: "ent_1" }; });
export const entry = { post: take, note: take, file: take };
`;

type ExitCodeKey = Context.Key<unknown, { readonly set: (code: number) => Effect.Effect<void> }>;
type Verb = Command.Command<string, unknown, unknown, unknown, unknown>;
type Project = { readonly ExitCode: ExitCodeKey; readonly post: Verb; readonly note: Verb; readonly file: Verb; readonly given: Array<unknown> };

const write = (root: string, path: string, content: string) => {
  mkdirSync(join(root, path, ".."), { recursive: true });
  writeFileSync(join(root, path), content);
};
let project: Promise<Project> | undefined;
const load = (): Promise<Project> => (project ??= (async () => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  write(root, "blueprint/things/entry/thing.ts", THING);
  write(root, "blueprint/things/entry/verbs/post.ts", VERB);
  write(root, "blueprint/things/entry/verbs/note.ts", NOTE);
  write(root, "blueprint/things/entry/verbs/file.ts", FILE);
  // The model as `ortho generate` reads it: the compiler, in a fresh process.
  const model = JSON.parse(execFileSync(process.execPath, [resolve(repo, "packages/compiler/src/main.ts"), root], { encoding: "utf8" })) as Model;
  // Every file it writes, so a build may put the flags' helper in a file of its own.
  for (const file of renderCli(model, "books")) write(root, file.path, file.content);
  write(root, "generated/api/src/entry/post.ts", api("post"));
  write(root, "generated/api/src/entry/note.ts", api("note"));
  write(root, "generated/api/src/entry/file.ts", api("file"));
  write(root, "generated/sdk/src/index.ts", SDK);
  const output = (await import(join(root, "generated/cli/src/output.ts"))) as Pick<Project, "ExitCode">;
  const command = { ...(await import(join(root, "generated/cli/src/entry/post.ts"))), ...(await import(join(root, "generated/cli/src/entry/note.ts"))), ...(await import(join(root, "generated/cli/src/entry/file.ts"))) } as Pick<Project, "post" | "note" | "file">;
  const sdk = (await import(join(root, "generated/sdk/src/index.ts"))) as Pick<Project, "given">;
  return { ...output, ...command, ...sdk };
})());

// The environment a command runs in, as effect/cli's own tests make it (and `decimal-doors.test.ts`): nothing on disk, no terminal, no child process.
const CliTest = Layer.mergeAll(
  FileSystem.layerNoop({}),
  Path.layer,
  Stdio.layerTest({}),
  Layer.succeed(Terminal.Terminal, Terminal.make({
    columns: Effect.succeed(120), rows: Effect.succeed(24), size: Effect.die("unused"),
    readInput: Effect.die("unused"), readLine: Effect.die("unused"), display: () => Effect.void,
  })),
  Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, ChildProcessSpawner.make(() => Effect.die("unused"))),
);

/** `books entry <verb> <args>`: what it writes, stdout and stderr apart, the exit code it sets, and what reached the SDK. */
const ran = async (args: ReadonlyArray<string>, verb: "post" | "note" | "file" = "post") => {
  const p = await load();
  p.given.length = 0;
  const out: Array<string> = [];
  const err: Array<string> = [];
  const keep = (to: Array<string>) => (...a: Array<unknown>) => void to.push(a.map(String).join(" "));
  const log = vi.spyOn(console, "log").mockImplementation(keep(out));
  const error = vi.spyOn(console, "error").mockImplementation(keep(err));
  let code: number | undefined;
  let failed = false;
  try {
    const exit = Layer.succeed(p.ExitCode as never, { set: (c: number) => Effect.sync(() => void (code = c)) } as never) as Layer.Layer<never>;
    const result = await Effect.runPromise(Effect.exit((Command.runWith(p[verb] as never, { version: "0.0.0" })(args) as Effect.Effect<unknown, unknown, never>).pipe(Effect.provide(Layer.merge(CliTest, exit)))));
    failed = result._tag === "Failure";
  } finally {
    log.mockRestore();
    error.mockRestore();
  }
  return { stdout: out.join("\n"), stderr: err.join("\n"), code, failed, given: [...p.given] as Array<Record<string, unknown>> };
};

const LINES = '[{"account":"acc_1","debit":"15"},{"account":"acc_2","debit":"340282366920938463463374607431768211455"}]';
const ABOUT = '{"declaration":"entry","id":"ent_9"}';
const base = { memo: "rent", lines: LINES, tags: '["red","blue"]', where: '{"city":"Lagos"}', name: "ada", about: ABOUT };
const argv = (over: Partial<Record<keyof typeof base, string>> = {}) => Object.entries({ ...base, ...over }).flatMap(([k, v]) => [`--${k}`, v]);

describe("1. A list or struct flag is taken as JSON and decodes", () => {
  it("two lines decode to two rows, in order, their amounts whole numbers; the tags and the struct decode too", async () => {
    const r = await ran(argv());
    expect(r.stderr).toBe("");
    expect(r.given).toEqual([{ memo: "rent", lines: [{ account: "acc_1", debit: 15n }, { account: "acc_2", debit: 340282366920938463463374607431768211455n }], tags: ["red", "blue"], where: { city: "Lagos" }, name: "ada", about: { declaration: "entry", id: "ent_9" } }]);
    expect(r.code ?? 0).toBe(0);
  });

  it("one line, and an empty list of tags, decode", async () => {
    const r = await ran(argv({ lines: '[{"account":"acc_3","debit":"0"}]', tags: "[]" }));
    expect(r.given.map((g) => [g["lines"], g["tags"]])).toEqual([[[{ account: "acc_3", debit: 0n }], []]]);
  });

  it("JSON with spaces and new lines, as a person types it, decodes", async () => {
    const r = await ran(argv({ lines: '[\n  { "account": "acc_1", "debit": "15" }\n]', where: ' { "city" : "Lagos" } ' }));
    expect(r.given.map((g) => [g["lines"], g["where"]])).toEqual([[[{ account: "acc_1", debit: 15n }], { city: "Lagos" }]]);
  });
});

// Each refused before the SDK: a message on stderr naming the field, no stack, a non-zero exit.
// The last column: the JSON itself is malformed, so the message says it is JSON that is wrong, not only that a list was expected.
const REFUSED: ReadonlyArray<readonly [string, Partial<Record<keyof typeof base, string>>, string, boolean]> = [
  ["malformed JSON in --lines", { lines: '[{"account":"acc_1",' }, "lines", true],
  ["text that is not JSON in --lines", { lines: "acc_1 15" }, "lines", true],
  ["an object where --lines wants a list", { lines: '{"account":"acc_1","debit":"15"}' }, "lines", false],
  ["a row missing its debit", { lines: '[{"account":"acc_1"}]' }, "lines", false],
  ["51 lines, over the limit", { lines: JSON.stringify(Array.from({ length: 51 }, (_, i) => ({ account: `acc_${i}`, debit: "1" }))) }, "lines", false],
  ["malformed JSON in --where", { where: '{"city":' }, "where", true],
  ["a list of numbers where --tags wants text", { tags: "[1,2]" }, "tags", false],
  ["text after the JSON in --where", { where: '{"city":"Lagos"} oops' }, "where", true],
];

describe("2. Malformed or misshapen JSON is refused with a message, before the SDK", () => {
  for (const [why, over, field, malformed] of REFUSED) {
    it(`${why}: refused, naming ${field}, nothing sent`, async () => {
      const r = await ran(argv(over));
      expect(r.given, "nothing reaches the SDK").toEqual([]);
      const said = `${r.stderr}\n${r.stdout}`;
      expect(said, "names the field").toMatch(new RegExp(`\\b${field}\\b`));
      if (malformed) expect(r.stderr, "says the JSON is what is wrong").toMatch(/json/i);
      expect(said, "no stack trace").not.toMatch(/\n\s+at .+[:(]\d+/);
      expect(r.code !== undefined && r.code !== 0 ? r.code : r.failed ? "failed" : 0, "a non-zero exit").not.toBe(0);
    });
  }
});

describe("1. The edges: an optional list given, and a struct that may be null", () => {
  const file = ["--memo", "m", "--maybe", '{"city":"Lagos"}'];

  it("an optional list, when given, is taken as JSON", async () => {
    const r = await ran([...file, "--opt", '["a","b"]'], "file");
    expect([r.stderr, r.given.map((g) => g["opt"])]).toEqual(["", [["a", "b"]]]);
  });

  it("a struct that may be null takes its JSON object, and null", async () => {
    const some = await ran(file, "file");
    const none = await ran(["--memo", "m", "--maybe", "null"], "file");
    expect([some.stderr, some.given.map((g) => g["maybe"]), none.stderr, none.given.map((g) => g["maybe"])]).toEqual(["", [{ city: "Lagos" }], "", [null]]);
  });
});

// A field that already travels as a JSON string (`Schema.fromJsonString`) is text where it travels: handed on as written, parsed once.
describe("The controls, on a verb with no list or struct: text flags are still taken as written", () => {
  it("a thing's text field and a raw Schema.String value take `{}` and `[1]` as text, never as JSON; a refAny takes its JSON object", async () => {
    const r = await ran(["--memo", "{}", "--name", "[1]", "--about", '{"declaration":"entry","id":"ent_2"}', "--blob", '{"n":1}'], "note");
    expect(r.given).toEqual([{ memo: "{}", name: "[1]", about: { declaration: "entry", id: "ent_2" }, blob: { n: 1 } }]);
  });

  it("a raw Schema.String value takes `\"quoted\"` and `42` as written", async () => {
    const r = await ran(["--memo", "42", "--name", '"quoted"', "--about", ABOUT, "--blob", '{"n":2}'], "note");
    expect(r.given.map((g) => [g["memo"], g["name"]])).toEqual([["42", '"quoted"']]);
  });
});

/** A flag's entry in `--help`: its metavar, and its description (with any lines it wraps onto). */
const helpFor = (help: string, flag: string): { readonly metavar: string; readonly description: string } => {
  const at = help.search(new RegExp(`\\n\\s*--${flag}\\b`));
  if (at < 0) return { metavar: "", description: "" };
  const rest = help.slice(at + 1);
  const next = rest.search(/\n\s*(--[a-z]|\n|[A-Z]{3,})/);
  const entry = (next < 0 ? rest : rest.slice(0, next)).trim().replace(/\s+/g, " ");
  const [, metavar = "", description = ""] = /^--\S+ (\S+) (.*)$/.exec(entry) ?? [];
  return { metavar, description };
};

describe("3. --help says a list or struct flag takes JSON, in its metavar and its description", () => {
  for (const flag of ["lines", "tags", "where"]) {
    it(`--${flag} says JSON in both`, async () => {
      const h = helpFor((await ran(["--help"])).stdout, flag);
      expect([h.metavar, h.description]).toEqual([expect.stringMatching(/json/i), expect.stringMatching(/json/i)]);
    });
  }

  it("--lines says it takes a list (or array), and --where an object (or record, or struct)", async () => {
    const help = (await ran(["--help"])).stdout;
    expect([helpFor(help, "lines").description, helpFor(help, "where").description]).toEqual([expect.stringMatching(/\b(list|array)\b/i), expect.not.stringMatching(/\b(list|array)\b/i)]);
    expect(helpFor(help, "where").description).toMatch(/\b(object|record|struct)\b/i);
  });

  it("--lines keeps its own description, and says it no longer takes text", async () => {
    const h = helpFor((await ran(["--help"])).stdout, "lines");
    expect(h.description).toContain("Its lines, in order.");
    expect(h.description).not.toMatch(/\bText\./);
  });

  it("--memo and --name say text, not JSON (the control)", async () => {
    const help = (await ran(["--help"], "note")).stdout;
    const said = [helpFor(help, "memo"), helpFor(help, "name")];
    expect(said.map((h) => [h.metavar, /json/i.test(h.description)])).toEqual([["text", false], ["text", false]]);
  });
});
