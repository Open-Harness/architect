// Check 14 (#995 gap 4, G16-adapter-mounts call 5): an adapter's incoming event runs an app operation.
//
// The app is a copy of acme with two hand-written adapters, `@orthograph/kyc-feed` mounted as `bridge` and `@orthograph/side-feed`
// mounted as `side`. Each has Bridge's door (G16 call 2: `X-Webhook-Signature: t=<ms>,v0=<base64>`, RSA PKCS#1 v1.5 over
// SHA256("<t>.<body>"), the event's name at `event_category`) and Bridge's envelope. `bridge` includes `kycLink`, `transfer`, `note`,
// `statement` and `ping`; `side` includes `kycLink` and `note`. A thing `Applicant` (pending → approved) has these operations:
//   applicant.open     anyone; makes a pending applicant
//   applicant.approve  on bridge.ping and then bridge.kycLink, each with its own map, allowed only service(bridge); refuses
//                      `KycNotApproved` unless the status is approved, else keeps the link (the event's object id, `~`, and the
//                      `meta.source` its map was given) and moves to approved. A status `flaky:<ms>` dies while the world's clock
//                      is before <ms>, then approves. Its map throws on a status `boom`.
//   applicant.witness  on bridge.kycLink too, allowed anyone (Q4: anyone admits a service too); answers only when it runs as
//                      service(bridge), and dies otherwise
//   applicant.flag     on bridge.transfer, allowed anyone; always dies
//   applicant.hang     on bridge.note, allowed anyone; never ends
//   applicant.stall    on bridge.note too, allowed anyone; never ends
//   applicant.aside    on side.note, allowed only service(side); answers only when it runs as service(side)
// `statement` and `side.kycLink` are taken by no `on:`.
//
// The contract judged (M5-reach-out Q1 to Q5, G16-adapter-mounts call 5, GOAL17-check-harness call 3):
//  - a mount's `events` are its adapter's, and `Blueprint.on(<mount>.events.<name>, map)` on an operation's `on:` subscribes it;
//  - a delivery that fails the signature, or does not decode, is refused or ignored as before, and writes no outbox row;
//  - a delivery the door accepts writes one `_outbox` row per subscribing operation (`to` `op:<thing>.<verb>`, `event`
//    `<mount>:<the event's id>`) in the same batch; a repeat (`seen`) writes none; an event no `on:` takes writes none, and an
//    event of another mount never reaches a subscriber of this one;
//  - each operation runs once per event, as `service(<mount>)`, with the payload its own hop's `map` made from the event and
//    `meta` (`id` ends with the event's id, `source` is the mount, `at` an instant), in the trace of the door's request, retries included;
//  - a delivery due now is counted work from the door's commit: the world is not quiet until it has run, so a clock step of
//    zero (`POST /_world/clock/advance` with `0 seconds`, which `s.clock.settle()` is) answers only after it committed;
//  - a refusal is `refused` with its tag after one attempt and is never retried; a defect is retried on Q5's schedule (1 s,
//    doubling, never more than an hour between, 15 attempts), stepped by the world's clock, and is then `failed`; a settle
//    after one failed attempt answers at once, with the row `pending`; a `map` that throws, or makes a payload outside the
//    declaration, is a defect too;
//  - a delivery that never ends makes a settle refuse `NeverQuiet` within `ORTHO_QUIET_MS`, naming it, and the door still answers;
//  - `GET /_world/outbox` answers `rows` (GOAL17-check-harness call 3's `OutboxRow`: `event`, `to`, `state`, `attempts`, `outcome`);
//  - `ortho generate` refuses an `on:` naming an event its mount doesn't include, an operation whose `allowed` doesn't admit the
//    event's mount, and two `on:` entries of one operation taking one event, anywhere in the list (Q3.4); the same event name at
//    two mounts is two events, and an `allowed` admits the mount by any of its entries;
//  - a journey's `s.clock.settle()` is a step: it moves nothing and fires nothing.
//
// Known limits (from the planted builds on #995 gap 4's pull request):
//  - That a delivery is counted from the door's commit, not only from when its operation counts its own work, is judged by the
//    NeverQuiet refusal naming the delivery (its event and its operation) as the busy owner. A build that takes that token late,
//    after the claim's D1 round trip, is not seen: workerd runs the isolate on one thread, so no check can widen that gap.
//  - Contrived or unobservable, from the hostile pass: the role check skipped while the principal is right (the compiler already
//    guarantees `allowed` admits the mount); outbox rows written outside the journal's batch (needs fault injection); a retry
//    timed from an attempt's end (the same instant on a stepped clock); a hidden run after `failed` that touches no row; the
//    map's parameter types (a type test's, not this check's).
//  - The forced request key `on|<event id>|<operation>` is not judged: nothing here redelivers a delivered row, which needs
//    `POST /_world/outbox/redeliver` (M5.04, M5-reach-out Q5.3). M5.04's checks judge it.
// The world runs on a stepped clock (this copy's `local.ts`), as Capxul's does; every delivery is signed at the world's instant.
// Real workerd, a port from the OS. Written by the checks author; a builder never edits this file.
import { generateKeyPairSync, createHash, createSign, randomBytes, type KeyObject } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Exit, Scope } from "effect";
import { Worlds } from "@orthograph/prove";
import { afterAll, describe, expect, it } from "vitest";
import { acme, cli, copyOf, nothingRunning } from "../layer1/support.ts";
import { spawnSync } from "node:child_process";

// ---- the adapters ----

const adapterOf = (pkg: string) => `// An adapter written by check 14: Bridge's envelope and door, and four events.
import { Schema } from "effect";
import { Blueprint, type AdapterDoor } from "orthograph";

const envelope = (category, object) => Schema.Struct({
  event_id: Schema.String,
  event_category: Schema.Literal(category),
  event_object: object,
  event_created_at: Schema.String,
});
const identity = {
  id: (raw) => raw.event_id,
  actor: () => ({ id: ${JSON.stringify(pkg)}, name: ${JSON.stringify(pkg)}, bot: true }),
  object: (raw) => raw.event_object,
};

export const webhookSigning = Blueprint.secret.stored();

export const door: AdapterDoor = {
  signing: webhookSigning,
  verify: { scheme: "rsa-pkcs1-sha256", header: "x-webhook-signature", within: 600 },
  event: { path: ["event_category"] },
};

export default Blueprint.adapter({
  description: "Check 14's ${pkg}: Bridge's envelope and signature.",
  events: {
    kycLink: Blueprint.incoming(envelope("kyc_link", Schema.Struct({ id: Schema.String, customer_id: Schema.String, kyc_status: Schema.String })), identity),
    transfer: Blueprint.incoming(envelope("transfer", Schema.Struct({ id: Schema.String, customer_id: Schema.String, state: Schema.String })), identity),
    note: Blueprint.incoming(envelope("note", Schema.Struct({ id: Schema.String, customer_id: Schema.String })), identity),
    statement: Blueprint.incoming(envelope("statement", Schema.Struct({ id: Schema.String, customer_id: Schema.String })), identity),
    ping: Blueprint.incoming(envelope("ping", Schema.Struct({ id: Schema.String, customer_id: Schema.String })), identity),
  },
  door,
});
`;
const manifestOf = (pkg: string) => JSON.stringify({
  name: `@orthograph/${pkg}`, version: "0.0.0", private: true, type: "module",
  orthograph: { kind: "adapter", blueprint: "blueprint" },
  exports: { ".": "./src/index.ts" },
}, null, 2);

const ADAPTERS = {
  "kyc-feed": { mount: "bridge", include: ["kycLink", "transfer", "note", "statement", "ping"] },
  "side-feed": { mount: "side", include: ["kycLink", "note"] },
} as const;
const mountOf = (pkg: string, include: ReadonlyArray<string>) => `import { Blueprint } from "orthograph";
import adapter from "@orthograph/${pkg}";

export default Blueprint.use(adapter, (a) => [${include.map((e) => `a.include(a.events.${e})`).join(", ")}]);
`;

// ---- the app ----

const LOCAL = `import { Blueprint, Cloud, Identity, Telemetry } from "orthograph";

export default Blueprint.environment({
  runs: "on this machine",
  identity: Identity.testPrincipals,
  database: Cloud.d1.local(),
  telemetry: [Telemetry.sink.local()],
  clock: Blueprint.clock.stepped({ starts: "2026-12-01T09:00:00.000Z" }),
});
`;
const THING = `import { Blueprint } from "orthograph";

export const Applicant = Blueprint.thing({
  description: "Someone whose KYC an outside service decides.",
  fields: { id: Blueprint.id("apl"), link: Blueprint.text({ max: 80 }) },
  code: "AQ",
});
`;
const EVENTS = `import { Blueprint } from "orthograph";
import { Applicant } from "./thing.ts";

export const ApplicantOpened = Blueprint.event({ id: Applicant.fields.id });
export const ApplicantApproved = Blueprint.event({ id: Applicant.fields.id, link: Applicant.fields.link });
`;
const MACHINE = `import { Blueprint } from "orthograph";
import { Applicant } from "./thing.ts";
import * as Events from "./events.ts";

export const machine = Blueprint.machine(Applicant, {
  states: ["pending", "approved"],
  moves: { open: { from: [], to: "pending", emits: Events.ApplicantOpened }, approve: { from: ["pending"], to: "approved", emits: Events.ApplicantApproved } },
  notFrom: { exit: 72 },
});
`;
const ERRORS = `import { Blueprint } from "orthograph";

export class KycNotApproved extends Blueprint.error({ status: Blueprint.text({ max: 40 }) }, { exit: 71 }) {}
`;
const ROLES = `import { Blueprint } from "orthograph";
import { Applicant } from "./thing.ts";
import bridge from "../../adapters/bridge.ts";
import side from "../../adapters/side.ts";

export const bridgeFeed = Blueprint.role(Applicant, { service: bridge });
export const sideFeed = Blueprint.role(Applicant, { service: side });
`;
const OPEN = `import { Blueprint } from "orthograph";
import { Applicant } from "../thing.ts";
import { machine } from "../machine.ts";

export default Blueprint.operation(Applicant, {
  description: "Open an applicant, pending until the feed decides.",
  payload: {},
  answer: { applicant: Applicant.fields.id },
  move: machine.moves.open,
  allowed: [Blueprint.anyone],
  steps: { insert: Blueprint.step.database() },
});
`;
/** `approve`, with its `on:` and `allowed` as a variant says. */
const approveOf = (on: string, allowed: string) => `import { Blueprint } from "orthograph";
import { Applicant } from "../thing.ts";
import { machine } from "../machine.ts";
import { KycNotApproved } from "../errors.ts";
import { bridgeFeed, sideFeed } from "../roles.ts";
import bridge from "../../../adapters/bridge.ts";
import side from "../../../adapters/side.ts";

const map = (e, meta) => {
  if (e.event_object.kyc_status === "boom") throw new Error("the map threw");
  // Q3.1's meta names the event, its source and when; and the map is given the decoded event, which has no undeclared key.
  if (typeof meta?.id !== "string" || !meta.id.endsWith(e.event_id) || Number.isNaN(Date.parse(meta?.at))) throw new Error("meta lacks id or at");
  if ("debug" in e.event_object) throw new Error("the map was given the body, not the decoded event");
  return { applicant: e.event_object.customer_id, link: \`\${e.event_object.id}~\${meta?.source}\`, status: e.event_object.kyc_status };
};
// Never sent: an operation with two hops runs each event through its own hop's map.
const ping = (e) => ({ applicant: e.event_object.customer_id, link: "ping", status: "pinged" });

export default Blueprint.operation(Applicant, {
  description: "Approve an applicant when the feed says their KYC passed.",
  payload: { applicant: Applicant.fields.id, link: Applicant.fields.link, status: Blueprint.text({ max: 40 }) },
  answer: {},
  move: machine.moves.approve,
  errors: [KycNotApproved],
  allowed: [${allowed}],
  on: [${on}],
  steps: { update: Blueprint.step.database() },
});
`;
const APPROVE = approveOf("Blueprint.on(bridge.events.ping, ping), Blueprint.on(bridge.events.kycLink, map)", "bridgeFeed");
const onlyOn = (event: string, verb: string, description: string, mount = "bridge", allowed = "Blueprint.anyone") => `import { Blueprint } from "orthograph";
import { Applicant } from "../thing.ts";
import { sideFeed } from "../roles.ts";
import ${mount} from "../../../adapters/${mount}.ts";

export default Blueprint.operation(Applicant, {
  description: ${JSON.stringify(description)},
  payload: { applicant: Applicant.fields.id },
  answer: {},
  allowed: [${allowed}],
  on: [Blueprint.on(${mount}.events.${event}, (e) => ({ applicant: e.event_object.customer_id }))],
});
`;
const loose = (verb: string, body: string) => `import { Clock, Effect } from "effect";
import { Records } from "@orthograph/language-effect";
import { Applicant } from "../../blueprint/things/applicant/thing.ts";
import { KycNotApproved } from "../../blueprint/things/applicant/errors.ts";

// Typed loosely, so the check does not pin the generated handler's type.
const ${verb} = ((payload: any, ctx: any) => ${body}) as any;
export default ${verb};
`;
const HANDLERS: Readonly<Record<string, string>> = {
  open: loose("open", `Effect.gen(function* () {
  const records = yield* Records;
  yield* ctx.steps.insert(records.insert(Applicant, { id: ctx.id, link: "none" }));
  yield* ctx.move("pending");
  return { applicant: ctx.id };
})`),
  approve: loose("approve", `Effect.gen(function* () {
  if (payload.status.startsWith("flaky:") && (yield* Clock.currentTimeMillis) < Number(payload.status.slice(6))) return yield* Effect.die(new Error("flaky, not yet"));
  if (payload.status !== "approved" && !payload.status.startsWith("flaky:")) return yield* new KycNotApproved({ status: payload.status });
  const records = yield* Records;
  yield* ctx.steps.update(records.update(Applicant, payload.applicant, { link: payload.link }));
  yield* ctx.move("approved");
  return {};
})`),
  flag: loose("flag", `Effect.die(new Error("flag always fails"))`),
  stall: loose("stall", `Effect.never`),
  witness: loose("witness", `ctx.principal.kind === "service" && ctx.principal.mount === "bridge" ? Effect.succeed({}) : Effect.die(new Error("witness ran as " + JSON.stringify(ctx.principal)))`),
  aside: loose("aside", `ctx.principal.kind === "service" && ctx.principal.mount === "side" ? Effect.succeed({}) : Effect.die(new Error("aside ran as " + JSON.stringify(ctx.principal)))`),
  hang: loose("hang", `Effect.never`),
};

interface App { readonly root: string; readonly remove: () => void }
const apps: Array<App> = [];

const ortho = (root: string, ...args: ReadonlyArray<string>) => {
  const said = spawnSync(process.execPath, [cli, ...args, "--root", root], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 240_000 });
  return { status: said.status, out: `${said.stdout}${said.stderr}` };
};
const generates = (root: string) => {
  const said = ortho(root, "generate");
  expect(said.status, `ortho generate:\n${said.out}`).toBe(0);
};

/** The app, with `approve.ts` as given (a variant for the refusals). `generate` false: the caller runs it and judges the answer. */
const app = (approve = APPROVE, generate = true): App => {
  const copy = copyOf(acme);
  apps.push(copy);
  const { root } = copy;
  const scope = join(root, "node_modules/@orthograph");
  rmSync(scope);
  mkdirSync(scope);
  for (const entry of readdirSync(join(acme, "node_modules/@orthograph"))) symlinkSync(join(acme, "node_modules/@orthograph", entry), join(scope, entry));
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { dependencies: Record<string, string> };
  mkdirSync(join(root, "blueprint/adapters"), { recursive: true });
  for (const [name, { mount, include }] of Object.entries(ADAPTERS)) {
    const plugin = join(root, "plugins", name);
    mkdirSync(join(plugin, "src"), { recursive: true });
    mkdirSync(join(plugin, "blueprint"), { recursive: true });
    writeFileSync(join(plugin, "package.json"), manifestOf(name));
    writeFileSync(join(plugin, "src/index.ts"), adapterOf(name));
    symlinkSync(plugin, join(scope, name));
    pkg.dependencies[`@orthograph/${name}`] = "0.0.0";
    writeFileSync(join(root, `blueprint/adapters/${mount}.ts`), mountOf(name, include));
  }
  writeFileSync(join(root, "package.json"), JSON.stringify(pkg, null, 2));
  writeFileSync(join(root, "blueprint/environments/local.ts"), LOCAL);
  const thing = join(root, "blueprint/things/applicant");
  mkdirSync(join(thing, "verbs"), { recursive: true });
  writeFileSync(join(thing, "thing.ts"), THING);
  writeFileSync(join(thing, "events.ts"), EVENTS);
  writeFileSync(join(thing, "machine.ts"), MACHINE);
  writeFileSync(join(thing, "errors.ts"), ERRORS);
  writeFileSync(join(thing, "roles.ts"), ROLES);
  writeFileSync(join(thing, "verbs/open.ts"), OPEN);
  writeFileSync(join(thing, "verbs/approve.ts"), approve);
  writeFileSync(join(thing, "verbs/flag.ts"), onlyOn("transfer", "flag", "Flag an applicant when the feed reports a transfer."));
  writeFileSync(join(thing, "verbs/hang.ts"), onlyOn("note", "hang", "Read a note the feed sends, forever."));
  writeFileSync(join(thing, "verbs/stall.ts"), onlyOn("note", "stall", "Wait on a note the feed sends, forever."));
  writeFileSync(join(thing, "verbs/witness.ts"), onlyOn("kycLink", "witness", "See every KYC decision the feed sends."));
  writeFileSync(join(thing, "verbs/aside.ts"), onlyOn("note", "aside", "Read a note the side feed sends.", "side", "sideFeed"));
  mkdirSync(join(root, "src/applicant"), { recursive: true });
  for (const [verb, text] of Object.entries(HANDLERS)) writeFileSync(join(root, `src/applicant/${verb}.ts`), text);
  if (generate) generates(root);
  return copy;
};

// ---- the world, and what a check says to it ----

interface Keys { readonly bridge: KeyObject; readonly side: KeyObject }
interface World { readonly url: string; readonly root: string; readonly keys: Keys; readonly close: () => Promise<void> }
const pairOf = () => generateKeyPairSync("rsa", { modulusLength: 2048 });

/** The app in a world on its stepped clock; each door's public key is the mount's signing secret. */
const open = async (): Promise<World> => {
  const { root } = app();
  const bridge = pairOf();
  const side = pairOf();
  const scope = Effect.runSync(Scope.make());
  const started = await Effect.runPromise(Worlds.start({
    root, port: 0, name: `inbound-on-${randomBytes(3).toString("hex")}`,
    secretEnv: {
      BRIDGE_WEBHOOK_SIGNING: bridge.publicKey.export({ type: "spki", format: "pem" }).toString(),
      SIDE_WEBHOOK_SIGNING: side.publicKey.export({ type: "spki", format: "pem" }).toString(),
    },
  }).pipe(Effect.onError(() => Scope.close(scope, Exit.void)), Scope.provide(scope)));
  return { url: started.url, root, keys: { bridge: bridge.privateKey, side: side.privateKey }, close: () => Effect.runPromise(Scope.close(scope, Exit.void)) };
};

interface Answer { readonly status: number; readonly body: Record<string, unknown>; readonly text: string }
const answer = async (response: Response): Promise<Answer> => {
  const text = await response.text();
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text) as Record<string, unknown>; } catch { body = {}; }
  return { status: response.status, body, text };
};
const get = (url: string) => fetch(url).then(answer);
const post = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), ...(signal ? { signal } : {}) }).then(answer);

/** The world's instant, in epoch milliseconds: a delivery is signed at the world's time. */
const nowOf = async (w: World) => {
  const clock = await get(`${w.url}/_world/clock`);
  expect(clock.status, clock.text).toBe(200);
  return Date.parse(clock.body["now"] as string);
};
/** Bridge's signature (G16 call 2), by hand from its published scheme. */
const signed = (key: KeyObject, t: number, raw: string) => {
  const digest = createHash("sha256").update(`${t}.${raw}`).digest();
  return `t=${t},v0=${createSign("sha256").update(digest).sign(key, "base64")}`;
};
const trace = () => { const id = randomBytes(16).toString("hex"); return { id, header: `00-${id}-${randomBytes(8).toString("hex")}-01` }; };

type Category = "kyc_link" | "transfer" | "note" | "statement";
const eventOf = (id: string, category: Category, object: Record<string, string>) => ({
  event_id: id, event_category: category, event_object: object, event_created_at: "2026-12-01T09:00:00.000Z",
});
/** POST one signed delivery to `/_in/<mount>`, in the trace given. */
const send = async (w: World, mount: "bridge" | "side", event: object, t: { readonly header: string }, signal?: AbortSignal) => {
  const raw = JSON.stringify(event);
  const response = await fetch(`${w.url}/_in/${mount}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-signature": signed(w.keys[mount], await nowOf(w), raw), traceparent: t.header },
    body: raw,
    ...(signal ? { signal } : {}),
  });
  return answer(response);
};
/** A zero step of the world's clock: `s.clock.settle()` (GOAL17-check-harness call 3). */
const settle = (w: World, signal?: AbortSignal) => post(`${w.url}/_world/clock/advance`, { span: "0 seconds" }, signal);
const advance = async (w: World, span: string) => {
  const said = await post(`${w.url}/_world/clock/advance`, { span });
  expect(said.status, `advance ${span}: ${said.text}`).toBe(200);
};

interface Row { readonly event: string; readonly to: string; readonly state: string; readonly attempts: number; readonly outcome: string | null }
/** `GET /_world/outbox`'s rows, as the fields this check judges. */
const rowsOf = async (w: World, event?: string): Promise<ReadonlyArray<Row>> => {
  const said = await get(`${w.url}/_world/outbox`);
  expect(said.status, `GET /_world/outbox: ${said.text}`).toBe(200);
  expect(Array.isArray(said.body["rows"]), `GET /_world/outbox answers rows: ${said.text}`).toBe(true);
  const rows = (said.body["rows"] as ReadonlyArray<Row>).map((r) => ({ event: r.event, to: r.to, state: r.state, attempts: r.attempts, outcome: r.outcome }));
  return event === undefined ? rows : rows.filter((r) => r.event === event);
};
const byTo = (rows: ReadonlyArray<Row>) => [...rows].sort((a, b) => a.to.localeCompare(b.to));
const applicantOf = async (w: World, id: string) => (await get(`${w.url}/_world/facts/record?table=applicant&id=${id}`)).body as { readonly state?: string; readonly link?: string };
interface JournalRow { readonly operation: string; readonly subject: string; readonly fields: Record<string, unknown> }
const journalOf = async (w: World, traceId: string) => (await get(`${w.url}/_world/facts/journal?trace=${traceId}`)).body as unknown as ReadonlyArray<JournalRow>;
const openApplicant = async (w: World) => {
  const said = await post(`${w.url}/applicant/open`, {});
  expect(said.status, `applicant.open: ${said.text}`).toBe(200);
  return said.body["applicant"] as string;
};
const uid = (p: string) => `${p}_${randomBytes(6).toString("hex")}`;
const ACCEPTED = { status: 200, body: { accepted: true } };

let opened: Promise<World> | undefined;
const world = () => (opened ??= open());
afterAll(async () => {
  const w = opened === undefined ? undefined : await opened.catch(() => undefined);
  await w?.close();
  if (w) nothingRunning(w.root);
  for (const a of apps.splice(0)) a.remove();
});

describe("14 an adapter's incoming event runs an app operation", () => {
  it("a signed kyc_link runs applicant.approve once, after the door answers, with what its map made, in the door request's trace; a zero clock step waits for it", { timeout: 300_000 }, async () => {
    const w = await world();
    const a = await openApplicant(w);
    const event = uid("evt");
    const link = uid("kyl");
    const t = trace();
    const sent = await send(w, "bridge", eventOf(event, "kyc_link", { id: link, customer_id: a, kyc_status: "approved" }), t);
    expect({ status: sent.status, body: sent.body }, sent.text).toEqual(ACCEPTED);
    const settled = await settle(w);
    expect(settled.status, `the zero step: ${settled.text}`).toBe(200);
    expect(await applicantOf(w, a), "approved, keeping the link the kycLink hop's map made from the event and meta.source").toMatchObject({ state: "approved", link: `${link}~bridge` });
    expect(byTo(await rowsOf(w, `bridge:${event}`)), "one row per subscribing operation, each delivered once (witness answers only as service(bridge))").toEqual([
      { event: `bridge:${event}`, to: "op:applicant.approve", state: "delivered", attempts: 1, outcome: null },
      { event: `bridge:${event}`, to: "op:applicant.witness", state: "delivered", attempts: 1, outcome: null },
    ]);
    const journal = await journalOf(w, t.id);
    expect(journal.map((r) => r.operation).filter((o) => o === "applicant.approve" || o === "in:bridge").sort(), "the door's row and the delivery's, in the door request's trace").toEqual(["applicant.approve", "in:bridge"]);
    // A second applicant's event: a build that is right only for the first delivery, or the first event, is seen.
    const a2 = await openApplicant(w);
    const event2 = uid("evt");
    expect((await send(w, "bridge", eventOf(event2, "kyc_link", { id: "kyl_two", customer_id: a2, kyc_status: "approved", debug: "an undeclared key the decode drops" }), trace())).body).toEqual({ accepted: true });
    expect((await settle(w)).status).toBe(200);
    expect(await applicantOf(w, a2)).toMatchObject({ state: "approved", link: "kyl_two~bridge" });
    expect(byTo(await rowsOf(w, `bridge:${event2}`)).map((r) => [r.to, r.state, r.attempts])).toEqual([["op:applicant.approve", "delivered", 1], ["op:applicant.witness", "delivered", 1]]);
    expect(journal.find((r) => r.operation === "applicant.approve")?.subject, "the delivery moved the applicant the map named").toBe(a);
  });

  it("a delivery sent twice runs once; two events run twice", { timeout: 300_000 }, async () => {
    const w = await world();
    const [b, c] = [await openApplicant(w), await openApplicant(w)];
    const [eb, ec] = [uid("evt"), uid("evt")];
    const first = trace();
    const again = trace();
    const other = trace();
    const of = (id: string, who: string) => eventOf(id, "kyc_link", { id: `kyl_${who}`, customer_id: who, kyc_status: "approved" });
    expect((await send(w, "bridge", of(eb, b), first)).body).toEqual({ accepted: true });
    expect((await send(w, "bridge", of(ec, c), other)).body).toEqual({ accepted: true });
    expect((await settle(w)).status).toBe(200);
    expect((await send(w, "bridge", of(eb, b), again)).body, "the repeat").toEqual({ seen: true });
    expect((await settle(w)).status).toBe(200);
    const once = [["op:applicant.approve", "delivered", 1], ["op:applicant.witness", "delivered", 1]];
    expect(byTo(await rowsOf(w, `bridge:${eb}`)).map((r) => [r.to, r.state, r.attempts]), "one row per operation for the event, each delivered once").toEqual(once);
    expect(byTo(await rowsOf(w, `bridge:${ec}`)).map((r) => [r.to, r.state, r.attempts])).toEqual(once);
    expect(await journalOf(w, again.id), "a repeat runs nothing and writes nothing").toEqual([]);
    expect((await journalOf(w, first.id)).filter((r) => r.operation === "applicant.approve").map((r) => r.subject)).toEqual([b]);
    expect((await journalOf(w, other.id)).filter((r) => r.operation === "applicant.approve").map((r) => r.subject)).toEqual([c]);
    expect((await applicantOf(w, b)).state).toBe("approved");
    expect((await applicantOf(w, c)).state).toBe("approved");
  });

  it("an event no on: takes, and the same event at another mount's door, are accepted, write no outbox row and run nothing", { timeout: 300_000 }, async () => {
    const w = await world();
    const d = await openApplicant(w);
    const [atSide, statement] = [uid("evt"), uid("evt")];
    const ts = trace();
    const tt = trace();
    // side's kycLink has the shape bridge's approve takes: a build that subscribes by the event's name alone runs it.
    expect(await send(w, "side", eventOf(atSide, "kyc_link", { id: "kyl_side", customer_id: d, kyc_status: "approved" }), ts).then((s) => ({ status: s.status, body: s.body }))).toEqual(ACCEPTED);
    expect(await send(w, "bridge", eventOf(statement, "statement", { id: "stm_1", customer_id: d }), tt).then((s) => ({ status: s.status, body: s.body }))).toEqual(ACCEPTED);
    expect((await settle(w)).status).toBe(200);
    expect(await rowsOf(w, `side:${atSide}`), "side's event has no subscriber").toEqual([]);
    expect(await rowsOf(w, `bridge:${statement}`), "nothing takes bridge's statement").toEqual([]);
    expect((await journalOf(w, ts.id)).map((r) => r.operation)).toEqual(["in:side"]);
    expect((await journalOf(w, tt.id)).map((r) => r.operation)).toEqual(["in:bridge"]);
    expect((await applicantOf(w, d)).state, "nothing moved the applicant").toBe("pending");
  });

  it("a delivery the operation refuses is refused with its tag after one attempt, never retried, and the thing is unchanged", { timeout: 300_000 }, async () => {
    const w = await world();
    const e = await openApplicant(w);
    const event = uid("evt");
    expect((await send(w, "bridge", eventOf(event, "kyc_link", { id: "kyl_no", customer_id: e, kyc_status: "rejected" }), trace())).body).toEqual({ accepted: true });
    expect((await settle(w)).status).toBe(200);
    const rows = [
      { event: `bridge:${event}`, to: "op:applicant.approve", state: "refused", attempts: 1, outcome: "KycNotApproved" },
      { event: `bridge:${event}`, to: "op:applicant.witness", state: "delivered", attempts: 1, outcome: null },
    ];
    expect(byTo(await rowsOf(w, `bridge:${event}`)), "approve's refusal is its own row's; witness's delivery stands").toEqual(rows);
    await advance(w, "2 hours");
    expect(byTo(await rowsOf(w, `bridge:${event}`)), "two hours on: still one attempt").toEqual(rows);
    expect(await applicantOf(w, e)).toMatchObject({ state: "pending", link: "none" });
  });

  it("a delivery that dies is retried on the stepped clock, 1 s doubling to at most an hour, and is failed after 15 attempts; a settle never waits for a retry", { timeout: 600_000 }, async () => {
    const w = await world();
    const f = await openApplicant(w);
    const event = uid("evt");
    const row = async () => {
      const rows = await rowsOf(w, `bridge:${event}`);
      expect(rows.map((r) => r.to), JSON.stringify(rows)).toEqual(["op:applicant.flag"]);
      return rows[0]!;
    };
    expect((await send(w, "bridge", eventOf(event, "transfer", { id: "trf_1", customer_id: f, state: "payment_processed" }), trace())).body).toEqual({ accepted: true });
    const began = Date.now();
    expect((await settle(w)).status, "a settle after one failed attempt").toBe(200);
    expect(Date.now() - began, "answered at once, not after the retries").toBeLessThan(15_000);
    const one = await row();
    expect([one.state, one.attempts], "pending after the first attempt").toEqual(["pending", 1]);
    expect(one.outcome ?? "", "the defect's first line").toContain("flag always fails");
    // Attempt k is due 1 + 2 + … + 2^(k-2) seconds after the first, never more than an hour between: 12 by the hour (2047 s),
    // 13 at 4095 s, 14 at 7695 s (the 4096 s wait capped at 3600), 15 at 11295 s. Both sides of 7695 s pin the cap at an hour.
    await advance(w, "1 hour");
    expect([(await row()).state, (await row()).attempts], "an hour on").toEqual(["pending", 12]);
    await advance(w, "4094 seconds");
    expect([(await row()).state, (await row()).attempts], "7694 s on: the 14th is a second away").toEqual(["pending", 13]);
    await advance(w, "1 second");
    expect([(await row()).state, (await row()).attempts], "7695 s on: an hour after the 13th").toEqual(["pending", 14]);
    await advance(w, "6705 seconds");
    const last = await row();
    expect([last.state, last.attempts], "four hours on: the last attempt has failed").toEqual(["failed", 15]);
    expect(last.outcome ?? "").toContain("flag always fails");
    await advance(w, "2 hours");
    expect((await row()).attempts, "and it is not tried again").toBe(15);
  });

  it("an anonymous caller cannot run an operation only bridge's service role admits", { timeout: 300_000 }, async () => {
    const w = await world();
    const g = await openApplicant(w);
    const said = await post(`${w.url}/applicant/approve`, { applicant: g, link: "kyl_person", status: "approved" });
    expect(said.status, said.text).not.toBe(200);
    expect((await applicantOf(w, g)).state).toBe("pending");
  });

  it("a delivery that never ends makes a settle refuse NeverQuiet within ORTHO_QUIET_MS, naming it; the door still answers", { timeout: 300_000 }, async () => {
    // A world of its own: this one is never quiet again.
    const w = await open();
    try {
      const h = await openApplicant(w);
      // A delivery first, settled: a build that counts only the first delivery in a world is seen.
      expect((await send(w, "bridge", eventOf(uid("evt"), "kyc_link", { id: "kyl_first", customer_id: h, kyc_status: "approved" }), trace())).body).toEqual({ accepted: true });
      expect((await settle(w)).status).toBe(200);
      const event = uid("evt");
      const sent = await send(w, "bridge", eventOf(event, "note", { id: "nte_1", customer_id: h }), trace(), AbortSignal.timeout(15_000));
      expect({ status: sent.status, body: sent.body }, "the door answers without waiting for the delivery").toEqual(ACCEPTED);
      const began = Date.now();
      const said = await settle(w, AbortSignal.timeout(60_000));
      expect(Date.now() - began, "within ORTHO_QUIET_MS (5 s) and some slack").toBeLessThan(30_000);
      expect(said.status, said.text).toBe(409);
      expect(said.body["_tag"], said.text).toBe("NeverQuiet");
      expect(said.text, "names the delivery: its event and its operation").toContain(`bridge:${event}`);
      expect(said.text).toContain("applicant.hang");
      // Each subscriber's delivery is counted under its own name: both of note's operations are still busy.
      const busy = (said.body["busy"] ?? []) as ReadonlyArray<string>;
      for (const op of ["applicant.hang", "applicant.stall"]) expect(busy.some((b) => b.includes(`bridge:${event}`) && b.includes(op)), `a busy owner naming bridge:${event} and ${op}: ${said.text}`).toBe(true);
    } finally {
      await w.close();
      nothingRunning(w.root);
    }
  });

  it("a delivery signed with another key is refused 401, and one that does not decode is ignored: neither writes an outbox row", { timeout: 300_000 }, async () => {
    const w = await world();
    const a = await openApplicant(w);
    const [bad, undecoded] = [uid("evt"), uid("evt")];
    const raw = JSON.stringify(eventOf(bad, "kyc_link", { id: "kyl_bad", customer_id: a, kyc_status: "approved" }));
    const refused = await fetch(`${w.url}/_in/bridge`, { method: "POST", headers: { "content-type": "application/json", "x-webhook-signature": signed(w.keys.side, await nowOf(w), raw), traceparent: trace().header }, body: raw }).then(answer);
    expect([refused.status, refused.body], refused.text).toEqual([401, { _tag: "BadSignature" }]);
    const ignored = await send(w, "bridge", eventOf(undecoded, "kyc_link", { id: "kyl_undec", customer_id: a }), trace());
    expect([ignored.status, ignored.body], ignored.text).toEqual([200, { ignored: true }]);
    expect((await settle(w)).status).toBe(200);
    expect(await rowsOf(w, `bridge:${bad}`)).toEqual([]);
    expect(await rowsOf(w, `bridge:${undecoded}`)).toEqual([]);
    expect((await applicantOf(w, a)).state).toBe("pending");
  });

  it("each mount's subscriber runs as its own mount: side's note runs applicant.aside as service(side)", { timeout: 300_000 }, async () => {
    const w = await world();
    const a = await openApplicant(w);
    const event = uid("evt");
    expect((await send(w, "side", eventOf(event, "note", { id: "nte_side", customer_id: a }), trace())).body).toEqual({ accepted: true });
    expect((await settle(w)).status).toBe(200);
    expect(await rowsOf(w, `side:${event}`), "aside answers only as service(side)").toEqual([{ event: `side:${event}`, to: "op:applicant.aside", state: "delivered", attempts: 1, outcome: null }]);
  });

  it("a map that throws, or makes a payload outside the declaration, is a defect: pending after one attempt, never refused", { timeout: 300_000 }, async () => {
    const w = await world();
    const [a, b] = [await openApplicant(w), await openApplicant(w)];
    const [threw, wide, long] = [uid("evt"), uid("evt"), uid("evt")];
    const c = await openApplicant(w);
    expect((await send(w, "bridge", eventOf(threw, "kyc_link", { id: "kyl_boom", customer_id: a, kyc_status: "boom" }), trace())).body).toEqual({ accepted: true });
    // The link the map makes is the object's id and "~bridge": 81 characters and more, past the field's 80.
    expect((await send(w, "bridge", eventOf(wide, "kyc_link", { id: `kyl_${"x".repeat(80)}`, customer_id: b, kyc_status: "approved" }), trace())).body).toEqual({ accepted: true });
    // A status of 41 characters, past the payload's 40, that the handler would approve: only decoding the map's output refuses it.
    expect((await send(w, "bridge", eventOf(long, "kyc_link", { id: "kyl_long", customer_id: c, kyc_status: `flaky:${"0".repeat(35)}` }), trace())).body).toEqual({ accepted: true });
    expect((await settle(w)).status).toBe(200);
    for (const [event, who] of [[threw, a], [wide, b], [long, c]] as const) {
      const approve = (await rowsOf(w, `bridge:${event}`)).filter((r) => r.to === "op:applicant.approve");
      expect(approve.map((r) => [r.state, r.attempts]), `${event}: a defect, to be retried`).toEqual([["pending", 1]]);
      expect(approve[0]!.outcome ?? "", "the defect's first line is said").not.toBe("");
      expect((await applicantOf(w, who)).state).toBe("pending");
    }
  });

  it("a retry runs in the door request's trace too, and a delivery that succeeds on its second attempt is delivered", { timeout: 300_000 }, async () => {
    const w = await world();
    const a = await openApplicant(w);
    const event = uid("evt");
    const t = trace();
    // Dies until half a second after now on the world's clock; the retry, a second later, approves.
    const until = (await nowOf(w)) + 500;
    expect((await send(w, "bridge", eventOf(event, "kyc_link", { id: "kyl_flaky", customer_id: a, kyc_status: `flaky:${until}` }), t)).body).toEqual({ accepted: true });
    expect((await settle(w)).status).toBe(200);
    const approve = async () => (await rowsOf(w, `bridge:${event}`)).filter((r) => r.to === "op:applicant.approve").map((r) => [r.state, r.attempts]);
    expect(await approve(), "the first attempt died").toEqual([["pending", 1]]);
    expect((await applicantOf(w, a)).state).toBe("pending");
    await advance(w, "1 second");
    expect(await approve(), "the second attempt approved").toEqual([["delivered", 2]]);
    expect(await applicantOf(w, a)).toMatchObject({ state: "approved", link: "kyl_flaky~bridge" });
    expect((await journalOf(w, t.id)).map((r) => r.operation).filter((o) => o === "applicant.approve" || o === "in:bridge").sort(), "the retry's commit is in the door request's trace").toEqual(["applicant.approve", "in:bridge"]);
  });

  describe("ortho generate refuses an on: it cannot deliver", () => {
    const refused = (approve: string, ...named: ReadonlyArray<string>) => {
      const { root } = app(approve, false);
      const said = ortho(root, "generate");
      expect(said.status, said.out).not.toBe(0);
      // The operation by its name or its file, as the compiler's problems name it, and what it got wrong.
      expect(said.out, "the refusal names the operation").toMatch(/applicant\.approve|applicant\/verbs\/approve\.ts/);
      for (const n of named) expect(said.out, `the refusal names ${n}`).toContain(n);
      expect(said.out, "a refusal, not a blueprint that does not load").not.toMatch(/can't load|TypeError/);
      // The control below generates the same app with a deliverable on:, so this refusal is the on:'s and nothing else's.
      expect(said.out, "no other problem").not.toMatch(/refusal codes|blueprint folder/);
    };
    it("an event its mount doesn't include (side doesn't include transfer)", { timeout: 300_000 }, () =>
      refused(approveOf("Blueprint.on(side.events.transfer, map)", "Blueprint.anyone"), "side", "transfer"));
    it("an operation whose allowed doesn't admit the event's mount", { timeout: 300_000 }, () =>
      refused(approveOf("Blueprint.on(bridge.events.kycLink, map)", "sideFeed"), "bridge"));
    it("two on: entries of one operation taking one event", { timeout: 300_000 }, () =>
      refused(approveOf("Blueprint.on(bridge.events.kycLink, map), Blueprint.on(bridge.events.kycLink, map)", "bridgeFeed"), "kycLink"));
    it("two on: entries taking one event with another between them", { timeout: 300_000 }, () =>
      refused(approveOf("Blueprint.on(bridge.events.kycLink, map), Blueprint.on(bridge.events.ping, ping), Blueprint.on(bridge.events.kycLink, map)", "bridgeFeed"), "kycLink"));
    it("control: one event name at two mounts is two events, admitted by two roles in either order", { timeout: 300_000 }, () => {
      app(approveOf("Blueprint.on(bridge.events.kycLink, map), Blueprint.on(side.events.kycLink, map)", "bridgeFeed, sideFeed"));
      app(approveOf("Blueprint.on(bridge.events.kycLink, map)", "sideFeed, bridgeFeed"));
    });
    it("control: an on: of an included event, allowed anyone, generates", { timeout: 300_000 }, () => {
      app(approveOf("Blueprint.on(bridge.events.kycLink, map)", "Blueprint.anyone"));
    });
  });

  it("a journey's s.clock.settle() is a step that moves nothing and fires nothing", { timeout: 300_000 }, () => {
    const { root } = app();
    writeFileSync(join(root, "journeys/the-clock-settles.ts"), `import { Blueprint, expect } from "orthograph";

export default Blueprint.journey("the clock settles", {
  cast: { visitor: Blueprint.anyone },
  steps: (s) => [
    s.step("settle", s.clock.settle(), expect((a) => a.fired).toEqual([]), expect((a) => a.now).toBe("2026-12-01T09:00:00.000Z")),
    s.step("and again", s.clock.settle(), expect((a) => a.now).toBe("2026-12-01T09:00:00.000Z")),
  ],
});
`);
    generates(root);
    const said = ortho(root, "prove", "--env", "local", "--port", "0", "--only", "the clock settles");
    expect(said.out.split("\n").filter((l) => l.startsWith("journey the clock settles ")), said.out).toEqual(["journey the clock settles ✔ 2/2 steps"]);
    nothingRunning(root);
  });
});
