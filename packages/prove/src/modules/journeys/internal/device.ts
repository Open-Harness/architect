// A call to a plugin's operation that runs on the device (M1.29): prove has no device, so it runs the plugin's `world` entry
// in its own process, as the generated SDK runs the `node` or `browser` one, under the app's mount, as an anonymous caller.
// The call is recorded as a served one is: a status, a body in the declaration's wire form, the trace it made.
import { randomBytes } from "node:crypto";
import { Cause, Effect, Exit, Schema, Tracer } from "effect";
import type { Operation, Read } from "orthograph";
import { Device, DeviceWorld, Mount } from "@orthograph/language-effect/device";
import type { Handler } from "@orthograph/language-effect";
import { resolveFrom, type OperationModel } from "@orthograph/compiler";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { PROVE_SPAN_PREFIX } from "#modules/telemetry/types.js";
import type { DeviceHost, Project } from "../types.ts";

type Codec = Schema.Codec<Record<string, unknown>, Record<string, unknown>>;
type Served = ReturnType<typeof Device.serve<Operation | Read, DeviceWorld>>;

/** A declared refusal's answer is 422 with `{ _tag, code, ...fields }`, as the generated server sends it. */
const DECLARED = 422;

/** Whether this operation runs on a device, and so is called here rather than on the world's server. */
export const onDevice = (op: OperationModel | undefined): op is OperationModel & { readonly runs: "client" } =>
  op !== undefined && op.runs === "client" && op.from.kind !== "app";

const served = new WeakMap<Project, Map<string, Served>>();

const load = (specifier: string) =>
  Effect.tryPromise({ try: () => import(specifier) as Promise<Record<string, unknown>>, catch: (e) => new Error(`${specifier} couldn't be loaded: ${String(e)}`) }).pipe(Effect.orDie);

/** The operation served by its plugin's `world` entry, under the app's mount: made once for the project. */
const serving = (project: Project, model: OperationModel & { readonly runs: "client" }, declaration: Operation | Read) =>
  Effect.gen(function* () {
    const known = served.get(project)?.get(model.name);
    if (known) return known;
    const from = model.from;
    if (from.kind === "app") return yield* Effect.die(new Error(`${model.name} is the app's own and has no world entry`));
    const root = resolve(project.root);
    const entry = (yield* load(resolveFrom(root, `${from.package}/src/${from.thing}/${model.verb}.world.js`)))["default"];
    const mount = project.model.mounts?.[from.mount];
    const wrapped = mount ? (yield* load(pathToFileURL(resolve(root, mount.file)).href))["default"] : undefined;
    const handler = (wrapped ? Mount.serving(wrapped as never, entry as never) : entry) as Handler<never, DeviceWorld>;
    const device = Device.serve<Operation | Read, DeviceWorld>({ name: model.name, operation: declaration, handler: handler as never });
    const mine = served.get(project) ?? new Map<string, Served>();
    mine.set(model.name, device);
    served.set(project, mine);
    return device;
  });

const tagOf = (e: unknown): string | undefined =>
  typeof e === "object" && e !== null && typeof (e as { _tag?: unknown })._tag === "string" ? (e as { _tag: string })._tag : undefined;

/** A refusal's fields as the wire carries them: what the class holds, but its tag and its message. */
const fieldsOf = (e: object) => Object.fromEntries(Object.entries(e).filter(([k]) => k !== "_tag" && k !== "message"));

export const callDevice = (
  project: Project, host: DeviceHost, name: string, declaration: Operation | Read, payload: Record<string, unknown>,
) =>
  Effect.gen(function* () {
    const model = project.model.operations[name] as OperationModel & { readonly runs: "client" };
    const wire = yield* Schema.encodeUnknownEffect(declaration.payloadSchema as unknown as Codec)(payload).pipe(Effect.orElseSucceed(() => payload));
    const trace = randomBytes(16).toString("hex");
    const parent = `${PROVE_SPAN_PREFIX}${randomBytes(4).toString("hex")}`;
    const device = yield* serving(project, model, declaration);
    const exit = yield* device.run(payload as never, { otlp: host.otlp, service: host.service }).pipe(
      Effect.provideService(DeviceWorld, host.world),
      // The call's own span is the child of the one the journey made for it, in the trace prove will read back.
      Effect.withParentSpan(Tracer.externalSpan({ traceId: trace, spanId: parent, sampled: true })),
      Effect.exit,
    );
    const base = { wire, trace, parent, journal: [] as const };
    if (Exit.isSuccess(exit)) {
      const body = yield* Schema.encodeUnknownEffect(declaration.answerSchema as unknown as Codec)(exit.value as Record<string, unknown>).pipe(Effect.orElseSucceed(() => exit.value as unknown));
      return { ...base, status: 200, body };
    }
    const failure = Cause.hasDies(exit.cause) ? undefined : Cause.squash(exit.cause);
    const tag = tagOf(failure);
    if (failure === undefined || tag === undefined || !model.errors.includes(tag)) {
      return { ...base, status: 500, body: null as unknown };
    }
    const code = project.model.refusals[tag];
    return { ...base, status: DECLARED, body: { _tag: tag, ...(code === undefined ? {} : { code }), ...fieldsOf(failure as object) } as unknown };
  });
