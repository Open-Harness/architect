// Check 11 (M1.22): the type test. tsc reads one program that imports every generated `options` of Plugged In and of acme and holds each against
// agent-native 0.228.2's recorded field list and context (`agent-native-0.228.2.ts`: no agent-native package is installed), and the module's
// `ActionRefusal` against the recorded no-write error's fields. Each line of the program is one claim about one action, named in the failure.
//
// What it holds an action to: no field outside agent-native's own names (and our `name`); the flags typed `boolean` (never `true` for retrySafe);
// `schema` a Standard Schema; `run`'s first parameter the SDK call's own payload type and its answer the SDK call's own answer type (neither
// `any`); `run`'s context parameter one the recorded `ActionRunContext` is assignable to; and `ActionRefusal` carrying every recorded
// member at the recorded types. The runtime half (the same predicates agent-native applies, on a refusal a generated `run` returned) is check 12.
//
// Written before the projection exists: tsc fails on each import it cannot resolve, and every claim line is then named.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { isActionContractError, isNoWriteError, NO_WRITE_FIELDS } from "./agent-native-0.228.2.ts";
import { loadActions } from "./contract.ts";
import { EXAMPLES, actionFile, exampleRoot, modelAt, opsOf, repo } from "./projection.ts";

const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const dir = mkdtempSync(join(repo, "e2e/ui-layer/.types-"));
afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

const rel = (path: string) => { const r = relative(dir, path); return r.startsWith(".") ? r : `./${r}`; };

/** One claim per action, on its own line, as `export const <id>: <Claim<...>> = true`. The name of the claim is its identifier. */
const programOf = () => {
  const lines: Array<string> = [
    `import { Schema, type Effect } from "effect";`,
    `import type { ActionHost } from "orthograph/actions";`,
    `import { ActionRefusal } from "orthograph/actions";`,
    `import type { ActionRunContext, DefineActionFieldName, DefineActionInput, NoWriteError, StandardSchemaLike } from ${JSON.stringify(rel(join(repo, "e2e/ui-layer/agent-native-0.228.2.ts")))};`,
    ``,
    `type IsAny<T> = 0 extends 1 & T ? true : false;`,
    `type Mutual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;`,
    `type OptionsOf<F> = F extends (host: ActionHost<any>) => infer O ? O : never;`,
    `type Extra<O> = Exclude<keyof O, DefineActionFieldName | "name">;`,
    `type Known<O> = Extra<O> extends never ? true : false;`,
    `type RunOf<O> = O extends { readonly run: infer R } ? R : never;`,
    `type ArgsOf<O> = RunOf<O> extends (args: infer A, ...rest: never) => unknown ? A : never;`,
    `type AnswerOf<O> = RunOf<O> extends (...args: never) => Promise<infer R> ? R : never;`,
    `type FlagsAreBoolean<O> = O extends { readonly readOnly: infer R; readonly needsApproval: infer N; readonly agentTool: infer T } ? ([R, N, T] extends [boolean, boolean, boolean] ? true : false) : false;`,
    `type NoRetrySafeTrue<O> = O extends { readonly retrySafe: infer S } ? (true extends S ? false : true) : true;`,
    `type TakesTheRecordedContext<O> = [RunOf<O>] extends [(args: never, ctx?: ActionRunContext) => unknown] ? true : false;`,
    `type FitsAgentNative<O> = O extends { readonly description: infer D; readonly readOnly: infer RO; readonly needsApproval: infer NA; readonly agentTool: infer AT; readonly run: infer RUN } ? ({ description: D; readOnly: RO; needsApproval: NA; agentTool: AT; run: RUN } extends Omit<DefineActionInput<any, any>, "schema"> ? true : false) : false;`,
    `type SchemaOf<O> = O extends { readonly schema: infer S } ? S : never;`,
    `const standard = <S extends Schema.Codec<any, any>>(schema: S) => Schema.toStandardJSONSchemaV1(Schema.toStandardSchemaV1(schema));`,
    `type StandardOf<S> = S extends Schema.Codec<any, any> ? ReturnType<typeof standard<S>> : never;`,
    `type SchemaIsStandard<O> = [StandardOf<SchemaOf<O>>] extends [never] ? false : ([StandardOf<SchemaOf<O>>] extends [StandardSchemaLike<any, any>] ? true : false);`,
    `type Success<E> = E extends Effect.Effect<infer A, any, any> ? A : never;`,
    `type SdkAnswer<F> = F extends (...args: never) => infer E ? Success<E> : never;`,
    `type SdkPayload<F> = F extends (payload: infer P, ...rest: never) => unknown ? P : never;`,
    ``,
  ];
  for (const example of EXAMPLES) {
    const root = exampleRoot(example);
    const sdk = join(root, "generated/sdk/src/index.ts");
    lines.push(`import type * as Sdk_${camel(example)} from ${JSON.stringify(rel(sdk))};`);
    for (const op of opsOf(modelAt(root))) {
      const id = `${camel(example)}_${camel(op.name.replace(".", "_"))}`;
      const call = `typeof Sdk_${camel(example)}.${camel(op.thing)}.${camel(op.verb)}`;
      lines.push(
        `import { options as ${id} } from ${JSON.stringify(rel(join(root, actionFile(op))))};`,
        `type O_${id} = OptionsOf<typeof ${id}>;`,
        `export const ${id}__fields: Known<O_${id}> = true;`,
        `export const ${id}__flags: FlagsAreBoolean<O_${id}> = true;`,
        `export const ${id}__retrySafe: NoRetrySafeTrue<O_${id}> = true;`,
        `export const ${id}__standardSchema: SchemaIsStandard<O_${id}> = true;`,
        `export const ${id}__context: TakesTheRecordedContext<O_${id}> = true;`,
        `export const ${id}__agentNative: FitsAgentNative<O_${id}> = true;`,
        `export const ${id}__payloadIsTheSdks: Mutual<ArgsOf<O_${id}>, SdkPayload<${call}>> = true;`,
        `export const ${id}__answerIsTheSdks: Mutual<AnswerOf<O_${id}>, SdkAnswer<${call}>> = true;`,
        `export const ${id}__payloadNotAny: IsAny<ArgsOf<O_${id}>> = false;`,
        `export const ${id}__answerNotAny: IsAny<AnswerOf<O_${id}>> = false;`,
      );
    }
  }
  lines.push(
    ``,
    `export const refusal__isAnError: ActionRefusal extends Error ? true : false = true;`,
    `export const refusal__noWriteFields: InstanceType<typeof ActionRefusal> extends NoWriteError ? true : false = true;`,
    `export const refusal__actionContractError: Mutual<InstanceType<typeof ActionRefusal>["actionContractError"], true> = true;`,
    `export const refusal__noWrite: Mutual<InstanceType<typeof ActionRefusal>["noWrite"], true> = true;`,
    `export const refusal__errorCode: Mutual<InstanceType<typeof ActionRefusal>["errorCode"], string> = true;`,
    `export const refusal__statusCode: [InstanceType<typeof ActionRefusal>["statusCode"]] extends [number] ? true : false = true;`,
    `export const refusal__details: [InstanceType<typeof ActionRefusal>["details"]] extends [Readonly<Record<string, unknown>> | undefined] ? true : false = true;`,
    `export const refusal__detailsNotAny: IsAny<InstanceType<typeof ActionRefusal>["details"]> = false;`,
  );
  return lines.join("\n");
};

describe("11 M1.22: every generated options(host) against agent-native 0.228.2's recorded fields", () => {
  it("tsc holds each action's fields, flags, schema, run and context, and the refusal's members, to the record; no line is red", () => {
    mkdirSync(dir, { recursive: true });
    const program = programOf();
    writeFileSync(join(dir, "main.ts"), program);
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify({
      extends: join(repo, "e2e/tsconfig.json"),
      compilerOptions: { noEmit: true, types: ["node"], lib: ["es2024", "dom", "dom.iterable"], typeRoots: [join(repo, "node_modules/@types")] },
      include: ["main.ts"],
    }));
    const checked = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json"), "--pretty", "false"], { cwd: repo, encoding: "utf8", timeout: 400_000, maxBuffer: 64 * 1024 * 1024 });
    const lines = program.split("\n");
    const errors = (checked.stdout + checked.stderr).split("\n").flatMap((line) => {
      const at = /main\.ts\((\d+),\d+\): error (TS\d+): (.*)$/.exec(line);
      if (at === null) return [];
      const source = lines[Number(at[1]) - 1] ?? "";
      const claim = /^export const (\w+):/.exec(source)?.[1];
      const imported = /^import \{ options as (\w+) \} from "([^"]+)"/.exec(source);
      if (imported !== null) return [`${imported[1]}: ${imported[2]} is not an action module (${at[2]})`];
      return [claim === undefined ? `${at[2]}: ${at[3]!.slice(0, 160)} (line ${at[1]}: ${source.slice(0, 100)})` : `${claim}`];
    });
    expect([...new Set(errors)], "each entry is `<example>_<operation>__<claim>`, a claim the action's type does not meet").toEqual([]);
    expect(checked.status, checked.stdout.slice(0, 2000)).toBe(0);
  }, 450_000);

  it("the record itself: agent-native's refusal predicates accept what ActionRefusal makes, and refuse a plain Error (the runtime half of the recorded fields)", async () => {
    const { ActionRefusal } = await loadActions();
    const refusal = new ActionRefusal("Someone else holds this name", "HN-001", { remaining: 0 });
    expect(isActionContractError(refusal)).toBe(true);
    expect(isNoWriteError(refusal)).toBe(true);
    expect(NO_WRITE_FIELDS.map((field) => field in refusal)).toEqual([true, true, true, true, true]);
    expect(isNoWriteError(new Error("boom"))).toBe(false);
    expect(isActionContractError(Object.assign(new Error("x"), { actionContractError: true }))).toBe(false);
  });
});
