// The generated adapter's types (#1164, README.md "The mapping" and "The names"), judged by `tsc` on a file that uses them as a
// handler would: each type is held equal to the one the README gives for the fixture (exactly: a wider type, a missing or an
// extra member, a lost `readonly`, each fails), and each wrong use is an error `tsc` must report (`@ts-expect-error`).
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { probe, quiet, repo, written, type Written } from "../../../test/from-abi.ts";

const CHECK = `import { Effect } from "effect";
import type { Address, ChainError, ChainPort, DecodedEvent, EventSource, Hex, Signer, Submission } from "@orthograph/chain-evm/device";
import { Probe, Quiet } from "./src/generated/index.ts";
import adapter from "./src/index.ts";

type Eq<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const same = <A, B>(_proof: Eq<A, B>) => {};
type Ok<E> = E extends Effect.Effect<infer A, any, any> ? A : never;
type Err<E> = E extends Effect.Effect<any, infer X, any> ? X : never;
type Needs<E> = E extends Effect.Effect<any, any, infer R> ? R : never;

declare const port: ChainPort;
declare const signer: Signer;
declare const address: Address;
const chain: Probe.Chain = { port, address };
same<Probe.Chain, { readonly port: ChainPort; readonly address: Address; readonly from?: Address }>(true);
const c = Probe.at(chain);
type Fails = Probe.Refusal | ChainError;

// The mapping: uint and int are bigint, address Address, bool boolean, string string, bytes and bytesN Hex, arrays ReadonlyArray, tuples interfaces.
same<Probe.ConstructorArgs, { readonly start: bigint }>(true);
same<Probe.PeekAnswer, bigint>(true);
same<Probe.LIMITAnswer, bigint>(true);
same<Probe.FundedAnswer, bigint>(true);
same<Probe.OwnerAnswer, Address>(true);
same<Probe.PairArgs, { readonly a: bigint; readonly b: bigint }>(true);
same<Probe.PairAnswer, { readonly sum: bigint; readonly odd: boolean }>(true);
same<Probe.BoxedArgs, { readonly b: Probe.BoxedArgsB; readonly extra: ReadonlyArray<bigint> }>(true);
same<Probe.BoxedArgsB, { readonly width: bigint; readonly holder: Address; readonly inner: Probe.BoxedArgsBInner }>(true);
same<Probe.BoxedArgsBInner, { readonly sealed_: boolean; readonly tag: Hex }>(true);
same<Probe.BoxedAnswer, { readonly out: Probe.BoxedAnswerOut; readonly total: bigint }>(true);
same<Probe.BoxedAnswerOut, { readonly width: bigint; readonly holder: Address; readonly inner: Probe.BoxedAnswerOutInner }>(true);
same<Probe.BoxedAnswerOutInner, { readonly sealed_: boolean; readonly tag: Hex }>(true);
same<Probe.LabelArgs, { readonly data: Hex; readonly name: string }>(true);
same<Probe.LabelAnswer, Hex>(true);
same<Probe.PokeArgs, { readonly x: bigint }>(true);
same<Probe.PokeAnswer, boolean>(true);
same<Probe.DrainAnswer, void>(true);
same<Probe.RefuseAnswer, void>(true);
same<Probe.FundAnswer, void>(true);
same<Probe.Send_1Args, { readonly to: Address }>(true);
same<Probe.Send_2Args, { readonly to: Address; readonly value: bigint }>(true);
same<Probe.PokedEventArgs, { readonly who: Address; readonly x: bigint; readonly note: string }>(true);
same<Probe.FundedEventArgs, { readonly from: Address; readonly amount: bigint }>(true);
same<Probe.SentEventArgs, { readonly to: Address; readonly value: bigint }>(true);
same<Probe.TooBigFields, { readonly x: bigint; readonly limit: bigint }>(true);
same<Probe.Refusal, Probe.TooBig | Probe.Empty | Probe.Spent>(true);
// An unnamed input is named by its position.
same<Probe.MarksArgs, { readonly arg0: Hex }>(true);
same<Probe.MarksAnswer, bigint>(true);
same<Probe.MarkArgs, { readonly h: Hex }>(true);
same<Probe.MarkedEventArgs, { readonly arg0: Hex }>(true);
same<Probe.SpentFields, { readonly arg0: Hex }>(true);
same<Quiet.PingAnswer, string>(true);
same<Quiet.PairAnswer, { readonly a: bigint; readonly b: Address }>(true);
// An indexed string, bytes, array or tuple is the Hex of its topic; an indexed address is still an Address.
same<Quiet.TaggedEventArgs, { readonly label: Hex; readonly blob: Hex; readonly list: Hex; readonly box: Hex; readonly who: Address; readonly plain: string; readonly grid: ReadonlyArray<ReadonlyArray<bigint>> }>(true);
same<Quiet.Refusal, never>(true);

// A read answers its answer; a write the Submission; both fail with the contract's errors or the chain's, and need nothing.
same<Ok<ReturnType<typeof c.peek>>, bigint>(true);
same<Ok<ReturnType<typeof c.pair>>, Probe.PairAnswer>(true);
same<Ok<ReturnType<typeof c.boxed>>, Probe.BoxedAnswer>(true);
same<Ok<ReturnType<typeof c.refuse>>, void>(true);
same<Ok<ReturnType<typeof c.poke>>, Submission>(true);
same<Ok<ReturnType<typeof c.drain>>, Submission>(true);
same<Ok<ReturnType<typeof c.fund>>, Submission>(true);
same<Ok<ReturnType<typeof c.send_2>>, Submission>(true);
same<Err<ReturnType<typeof c.peek>>, Fails>(true);
same<Err<ReturnType<typeof c.poke>>, Fails>(true);
same<Needs<ReturnType<typeof c.peek>>, never>(true);
same<Needs<ReturnType<typeof c.poke>>, never>(true);
same<Ok<ReturnType<typeof Quiet.at>["pair"] extends () => infer E ? E : never>, Quiet.PairAnswer>(true);

// Their arguments.
c.peek();
c.pair({ a: 3n, b: -4n });
c.boxed({ b: { width: 1n, holder: address, inner: { sealed_: true, tag: "0x00" } }, extra: [2n] });
c.poke({ x: 5n }, signer);
c.drain(signer);
c.fund(signer);
c.fund(signer, { value: 1n });
c.send_1({ to: address }, signer);
c.send_2({ to: address, value: 9n }, signer);
c.marks({ arg0: "0x00" });
c.mark({ h: "0x00" }, signer);
// @ts-expect-error a read with no inputs takes no argument
c.peek({});
// @ts-expect-error a uint is a bigint, never a number
c.pair({ a: 3, b: -4n });
// @ts-expect-error every input is required
c.pair({ a: 3n });
// @ts-expect-error a write needs its signer
c.poke({ x: 5n });
// @ts-expect-error only a payable write takes a value
c.poke({ x: 5n }, signer, { value: 1n });
// @ts-expect-error an overloaded name has no call of its own
c.send({ to: address }, signer);
// @ts-expect-error an address is a 0x string
c.send_1({ to: "alice" }, signer);

// Events: a typed source per event.
const poked = Probe.events.Poked(address, 0n);
same<typeof poked, EventSource<DecodedEvent & { readonly eventName: "Poked"; readonly args: Probe.PokedEventArgs }>>(true);
// @ts-expect-error an event's source needs its block
Probe.events.Poked(address);

// Errors: a tagged class each.
const big = new Probe.TooBig({ x: 1n, limit: 2n });
same<typeof big._tag, "TooBig">(true);
same<typeof big.x, bigint>(true);
new Probe.Empty();
// @ts-expect-error an error's fields are required
new Probe.TooBig({ x: 1n });

// The stand-in: deploy with the constructor's arguments, answering the address.
same<Ok<ReturnType<typeof Probe.deploy>>, Address>(true);
same<Err<ReturnType<typeof Probe.deploy>>, Fails>(true);
Probe.deploy(port, signer, { start: 7n });
// @ts-expect-error the constructor's arguments are required
Probe.deploy(port, signer);
// @ts-expect-error a contract with no bytecode has no deploy
Quiet.deploy;
// @ts-expect-error a contract with no error declares no classes
Quiet.TooBig;

// The descriptor.
same<typeof adapter.kind, "adapter">(true);
adapter.calls.Probe.poke;
adapter.calls.Quiet.ping;
// @ts-expect-error an overloaded name has no call of its own
adapter.calls.Probe.send;
`;

// Generated, written and typechecked once, by the first test that runs, so each test fails on its own when the generator can't make it.
let w: Written | undefined;
let ran: Promise<{ readonly status: number | null; readonly out: string }> | undefined;
const typechecked = () => (ran ??= (async () => {
  w = await written([probe, quiet]);
  writeFileSync(join(w.dir, "check.ts"), CHECK);
  writeFileSync(join(w.dir, "tsconfig.json"), JSON.stringify({ extends: join(repo, "tsconfig.base.json"), compilerOptions: { typeRoots: [join(repo, "node_modules/@types")] }, include: ["**/*.ts"], exclude: ["node_modules"] }));
  const r = spawnSync(join(repo, "node_modules/.bin/tsc"), ["-p", w.dir, "--noEmit", "--pretty", "false"], { cwd: w.dir, encoding: "utf8" });
  return { status: r.status, out: `${r.stdout}${r.stderr}` };
})());
afterAll(() => w?.remove());

it("typechecks: every generated type is the README's for the fixture, and every wrong use is refused", { timeout: 120_000 }, async () => {
  const run = await typechecked();
  expect(run.out).toBe("");
  expect(run.status).toBe(0);
});

it("the generated files themselves typecheck under the repository's strict settings", { timeout: 120_000 }, async () => {
  // The same run covers them (include **/*.ts); a generated file's own error names its path.
  const run = await typechecked();
  expect(run.out).not.toMatch(/src\/generated\//);
  expect(run.out).not.toMatch(/src\/index\.ts/);
  expect(run.status).toBe(0);
});
