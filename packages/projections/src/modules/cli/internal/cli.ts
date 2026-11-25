// generated/cli: `<project> <thing> <verb> --<field> ...`, one command per operation, calling the SDK.
import type { Model, OperationModel } from "@orthograph/compiler";
import { flagCode, helpOf, refAny } from "#modules/names/service.js";
import { renderSessionCommands, sessionOperations } from "./session.ts";
import { GENERATED, camel, exportedAs, lines, local, opVar } from "#modules/names/service.js";
import type { RenderedFile } from "#modules/names/types.js";

const command = (op: OperationModel): RenderedFile => {
  const optional = Object.values(op.payload).some((f) => f.optional);
  const flags = Object.entries(op.payload).map(([k, f]) => `${k}: ${f.optional ? `Flag.optional(${flagCode(k, f)})` : flagCode(k, f)}`);
  return {
    path: `generated/cli/src/${op.thing}/${op.verb}.ts`,
    scaffold: false,
    content: lines(
      GENERATED,
      `import { Effect, Schema } from "effect";`,
      `import { Command, Flag } from "effect/cli";`,
      `import { declaration as Declaration } from "../../../api/src/${op.thing}/${op.verb}.ts";`,
      `import * as Sdk from "../../../sdk/src/index.ts";`,
      `import * as Output from "../output.ts"; // a namespace, so a verb named like a helper (answer) cannot clash`,
      "",
      `/** ${op.description} Each flag is handed on as text${Object.values(op.payload).some(refAny) ? " (any-thing references are JSON objects)" : ""}${Object.values(op.payload).some((f) => f.json !== undefined) ? " (lists and objects are JSON)" : ""}; the declaration decodes it${optional ? "; a flag left out is not sent" : ""}. \`--json\` prints the whole answer as JSON. */`,
      `export const ${local(camel(op.verb))} = Command.make(`,
      `  "${op.verb}",`,
      `  { ${[...flags, `json: Flag.Boolean("json").pipe(Flag.withDefault(false))`].join(", ")} },`,
      `  ({ json, ...flags }) => Schema.decodeUnknownEffect(Declaration.payloadSchema)(${optional ? "Output.supplied(flags)" : "flags"}).pipe(Effect.flatMap(Sdk.${camel(op.thing)}.${camel(op.verb)}), Output.answer(json)),`,
      `).pipe(Command.withDescription(${JSON.stringify(helpOf(op))}));`,
      exportedAs(op.verb),
    ),
  };
};

const output = (): RenderedFile => ({
  path: "generated/cli/src/output.ts",
  scaffold: false,
  content: lines(
    GENERATED,
    `import { BigDecimal, Console, Context, Effect, Option } from "effect";`,
    `import { decimalText } from "orthograph/server";`,
    `import { Errors } from "../../sdk/src/index.ts";`,
    "",
    "/** Set by the entry, so commands never touch the process. */",
    `export class ExitCode extends Context.Service<ExitCode, { readonly set: (code: number) => Effect.Effect<void> }>()("cli/ExitCode") {}`,
    "",
    "/** The flags the caller gave: an optional flag left out is `None`, and is not sent at all. */",
    "export const supplied = (flags: Readonly<Record<string, unknown>>) =>",
    "  Object.fromEntries(Object.entries(flags).flatMap(([k, v]) => (Option.isOption(v) ? (Option.isSome(v) ? [[k, v.value]] : []) : [[k, v]])));",
    "",
    "/** A value as it travels: a bigint as its digits, a decimal as its text (`1.50`, never an exponent). */",
    "const wire = (v: unknown): unknown => (typeof v === \"bigint\" ? v.toString() : BigDecimal.isBigDecimal(v) ? decimalText(v) : v);",
    "// A decimal is read from its holder, since JSON.stringify has already called its toJSON; every other value keeps what its own toJSON made of it.",
    "// An `Option.some` keeps its own shape but hands back what it holds, so a decimal inside it is read from its holder too.",
    "const text = (x: unknown) =>",
    "  JSON.stringify(x, function (this: Readonly<Record<string, unknown>>, k: string, v: unknown) {",
    "    const raw = this[k];",
    "    return BigDecimal.isBigDecimal(raw) ? decimalText(raw) : Option.isOption(raw) && Option.isSome(raw) ? { ...(v as object), value: raw.value } : wire(v);",
    "  });",
    "const exitOf = (tag: unknown): number =>",
    "  typeof tag === \"string\" && tag in Errors.refusals ? Errors.refusals[tag as keyof typeof Errors.refusals].exit : tag === \"SchemaError\" ? 2 : 1;",
    "",
    "/** `AL-002 Name { a: 1, b: x }`: a refusal's code, its name, and the values of its declared fields that the server sent (it cut them for this caller). */",
    "const said = (tag: unknown, code: unknown, fields: Readonly<Record<string, unknown>>) => {",
    "  // Only the project's own refusals have a code. Anything else (the CLI's own `NotSignedIn`) is told as it always was.",
    "  if (typeof tag !== \"string\" || !(tag in Errors.codes)) return `${String(tag ?? \"Error\")}: ${text(fields)}`;",
    "  const declared = (Errors.declared as Readonly<Record<string, { readonly fields: Readonly<Record<string, unknown>> }>>)[tag];",
    "  const shown = Object.entries(fields).filter(([k]) => declared === undefined || Object.hasOwn(declared.fields, k)).map(([k, v]) => `${k}: ${typeof v === \"object\" && !BigDecimal.isBigDecimal(v) ? text(v) : String(wire(v))}`);",
    "  return `${typeof code === \"string\" ? `[${code}] ` : \"\"}${tag}${shown.length > 0 ? ` { ${shown.join(\", \")} }` : \"\"}`;",
    "};",
    "",
    "/** A refusal prints its code, name and public fields to stderr and exits with its exit code. */",
    "export const refused = <A, E, R>(effect: Effect.Effect<A, E, R>) =>",
    "  effect.pipe(",
    "    Effect.catch((e: unknown) => {",
    "      const tag = typeof e === \"object\" && e !== null ? (e as { readonly _tag?: unknown })._tag : undefined;",
    "      const { _tag: _, code, ...fields } = (typeof e === \"object\" && e !== null ? e : {}) as Record<string, unknown>;",
    "      const line = tag === \"SchemaError\" ? `SchemaError: ${String((e as { readonly message?: unknown }).message)}` : said(tag, code, fields);",
    "      return Console.error(line).pipe(",
    "        Effect.andThen(Effect.flatMap(ExitCode, (exit) => exit.set(exitOf(tag)))),",
    "      );",
    "    }),",
    "  );",
    "",
    "/** A one-field answer prints its value, or with `json` the whole answer as JSON. */",
    "export const answer = (json: boolean) => <A extends object, E, R>(effect: Effect.Effect<A, E, R>) =>",
    "  effect.pipe(Effect.flatMap((a) => Console.log(!json && Object.keys(a).length === 1 ? String(wire(Object.values(a)[0])) : text(a))), refused);",
  ),
});

const main = (model: Model, name: string): RenderedFile => {
  const ops = Object.values(model.operations);
  const things = [...new Set(ops.map((o) => o.thing))];
  const env = name.toUpperCase().replace(/-/g, "_");
  return {
    path: "generated/cli/src/main.ts",
    scaffold: false,
    content: lines(
      "#!/usr/bin/env node",
      GENERATED,
      `// \`${name} <thing> <verb> --<field> <value>\`. Talks to ${env}_URL, signed in with ${env}_TOKEN when set.`,
      `import { NodeRuntime, NodeServices } from "@effect/platform-node";`,
      `import { Effect, Layer } from "effect";`,
      `import { CliOutput, Command } from "effect/cli";`,
      `import * as Sdk from "../../sdk/src/index.ts";`,
      `import { ExitCode } from "./output.ts";`,
      ops.map((o) => `import { ${camel(o.verb)} as ${opVar(o)} } from "./${o.thing}/${o.verb}.ts";`),
      "",
      "// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.",
      "declare const ORTHO_VERSION: string | undefined;",
      "",
      things.map((t) => {
        const subs = ops.filter((o) => o.thing === t).map(opVar);
        return `const ${local(camel(t))} = Command.make("${t}").pipe(Command.withSubcommands([${subs.join(", ")}]));`;
      }),
      "",
      `Command.make("${name}").pipe(`,
      `  Command.withSubcommands([${things.map((t) => local(camel(t))).join(", ")}]),`,
      `  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),`,
      "  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),",
      `  Effect.provide(Sdk.layer(process.env["${env}_URL"] ?? "http://127.0.0.1:8787", process.env["${env}_TOKEN"])),`,
      "  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),",
      "  Effect.provide(NodeServices.layer),",
      "  NodeRuntime.runMain,",
      ");",
    ),
  };
};

export const renderCli = (model: Model, name: string): ReadonlyArray<RenderedFile> => {
  const session = sessionOperations(model);
  const plain = Object.values(model.operations).filter((o) => o !== session?.signIn && o !== session?.show);
  return [main(model, name), output(), ...plain.map(command), ...renderSessionCommands(model, name)];
};
