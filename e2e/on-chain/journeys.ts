// What prove's report must say about the budgets journeys, judged step by step against a pin of the journey sources (sources.ts reads them,
// and a test holds this pin to them): every journey, step title, actor and operation, which operations are chain ones, and how many
// transactions each step sends. The report fields are the lead's answer to S-11: per journey `cast: { <name>: { account } }`, per step
// `actor`, `operation` and, for a chain operation, `signer: { actor, account }`, and `tx: { hash, by }` when a transaction was sent.
// Written by the checks author; a builder never edits this file (AGENTS.md, "Journeys and checks come first").
import type { SourceStep } from "./sources.ts";

export interface Pinned { readonly cast: ReadonlyArray<string>; readonly steps: ReadonlyArray<SourceStep> }
const step = (name: string, actor: string, operation: string, chain: boolean, sent: number): SourceStep => ({ name, actor, operation, chain, sent });

export const PIN: Readonly<Record<string, Pinned>> = {
  "a wrong signer is refused before anything is sent": { cast: ["bob", "olga"], steps: [
    step("bob signs a spend of olga's allowance: refused, and no transaction is sent", "bob", "allowance.spend", true, 0),
    step("an allowance that is not there is refused the same way, since the role reads the row (M6-chain item 6)", "bob", "allowance.spend", true, 0),
    step("a read of an allowance that is not there says so: get is open to anyone, so it gives AllowanceNotFound (M6-chain item 6)", "bob", "allowance.get", false, 0),
    step("nothing was spent", "bob", "allowance.get", false, 0),
    step("olga's own spend still goes through", "olga", "allowance.spend", true, 1),
  ] },
  "a Safe grants a member an allowance": { cast: ["ada", "olga", "reader"], steps: [
    step("ada grants olga 500 from the Safe", "ada", "allowance.grant", true, 1),
    step("anyone can read it: nothing is spent and it is active", "reader", "allowance.get", false, 0),
  ] },
  "only the Safe grants": { cast: ["ada", "bob", "olga"], steps: [
    step("bob names the Safe and grants himself 500: refused before anything is sent", "bob", "allowance.grant", true, 0),
    step("olga names the Safe and grants herself 500: refused the same way", "olga", "allowance.grant", true, 0),
    step("the same grant from the Safe goes through", "ada", "allowance.grant", true, 1),
  ] },
  "revoke then spend": { cast: ["ada", "olga"], steps: [
    step("olga can't revoke her own allowance: refused, and no transaction is sent", "olga", "allowance.revoke", true, 0),
    step("ada revokes it from the Safe", "ada", "allowance.revoke", true, 1),
    step("olga can't spend: the machine's own refusal, and no transaction is sent", "olga", "allowance.spend", true, 0),
    step("revoking it twice is refused by the machine too", "ada", "allowance.revoke", true, 0),
  ] },
  "a spend over the limit is refused": { cast: ["ada", "olga", "shop"], steps: [
    step("olga spends 501 of 500: AllowanceExceeded carries what is left, and nothing is sent", "olga", "allowance.spend", true, 0),
    step("nothing was spent", "olga", "allowance.get", false, 0),
    step("olga spends exactly 500: the allowance is exhausted and the Safe pays 500", "olga", "allowance.spend", true, 1),
    step("a spend of 1 more is refused by the machine: exhausted", "olga", "allowance.spend", true, 0),
    step("an exhausted allowance can still be revoked", "ada", "allowance.revoke", true, 1),
  ] },
  "a spend submitted twice lands once": { cast: ["olga", "shop"], steps: [
    step("olga spends 100, signed", "olga", "allowance.spend", true, 1),
    step("the same signed spend again is refused InvalidNonce (AR-004), and nothing is sent", "olga", "allowance.spend", true, 0),
    step("the spend was confirmed once: 100 spent", "olga", "allowance.get", false, 0),
    step("the same payload signed afresh is a new spend, so only the replay is refused", "olga", "allowance.spend", true, 1),
  ] },
  "a member spends within an allowance": { cast: ["olga", "shop"], steps: [
    step("olga spends 120, signing with her own wallet, and the Safe pays the token", "olga", "allowance.spend", true, 1),
    step("a second spend of 80 leaves 300, and the allowance is still active", "olga", "allowance.spend", true, 1),
    step("the row shows 200 spent", "olga", "allowance.get", false, 0),
  ] },
};
export const STEPS = Object.values(PIN).reduce((n, j) => n + j.steps.length, 0);

export interface ReportedStep {
  readonly name?: string; readonly verdict?: string; readonly actor?: string; readonly operation?: string;
  readonly signer?: { readonly actor?: string; readonly account?: string };
  readonly tx?: { readonly hash?: string; readonly by?: string };
}
export interface ReportedJourney { readonly name: string; readonly stopped?: string; readonly cast?: Readonly<Record<string, { readonly account?: string }>>; readonly steps: ReadonlyArray<ReportedStep> }

export const ACCOUNT = /^eip155:\d+:0x[0-9a-fA-F]{40}$/;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const parts = (account: string) => ({ chain: account.split(":")[1]!, address: account.split(":")[2]!.toLowerCase() });

/** What is wrong with a journey's cast: exactly the declared names, each with a CAIP-10 account, one chain id, no address shared. */
const castProblems = (at: string, declared: ReadonlyArray<string>, cast: ReportedJourney["cast"]): ReadonlyArray<string> => {
  if (cast === undefined || typeof cast !== "object") return [`${at}: the report has no cast`];
  const names = Object.keys(cast).sort();
  const good = Object.entries(cast).filter(([, c]) => typeof c?.account === "string" && ACCOUNT.test(c.account));
  return [
    ...(JSON.stringify(names) === JSON.stringify([...declared].sort()) ? [] : [`${at}: the report's cast is [${names}], the journey declares [${[...declared].sort()}]`]),
    ...Object.entries(cast).filter(([, c]) => !(typeof c?.account === "string" && ACCOUNT.test(c.account))).map(([n, c]) => `${at}: cast member ${n} has account ${JSON.stringify(c?.account)}, not eip155:<chain>:0x<40 hex>`),
    ...good.filter(([, c], i) => good.findIndex(([, d]) => parts(d.account!).address === parts(c.account!).address) !== i).map(([n]) => `${at}: cast member ${n} shares an address with another`),
    ...(new Set(good.map(([, c]) => parts(c.account!).chain)).size > 1 ? [`${at}: the cast is on more than one chain id`] : []),
  ];
};

/**
 * What is wrong with the report's journeys, empty when it is right: exactly the pinned journeys, each step pinned (title, actor, operation,
 * verdict `pass`); the cast as declared; and for each step that runs a chain operation, the signer (actor and account, the cast member's own)
 * and, when the step sends a transaction, a `tx` whose `by` is that same account (and no `tx` when it sends none). A read is not judged for a
 * signer. Each problem names the journey and, for a step, its number and title.
 */
export const reportProblems = (journeys: ReadonlyArray<ReportedJourney>): ReadonlyArray<string> => {
  const names = journeys.map((j) => j.name);
  const hashes = journeys.flatMap((j) => j.steps.flatMap((s, i) => typeof s.tx?.hash === "string" ? [{ hash: s.tx.hash.toLowerCase(), at: `journey "${j.name}", step ${i + 1}` }] : []));
  return [
    ...hashes.filter((h, i) => hashes.findIndex((o) => o.hash === h.hash) !== i).map((h) => `${h.at}: tx.hash ${h.hash.slice(0, 12)}… is the hash of an earlier step too (one transaction per step: hashes are distinct across the run)`),
    ...Object.keys(PIN).filter((n) => !names.includes(n)).map((n) => `journey "${n}" did not run`),
    ...names.filter((n) => !(n in PIN)).map((n) => `unexpected journey "${n}"`),
    ...names.filter((n, i) => names.indexOf(n) !== i).map((n) => `journey "${n}" ran twice`),
    ...journeys.filter((j) => j.name in PIN).flatMap((j) => {
      const pin = PIN[j.name]!;
      const cast = j.cast ?? {};
      return [
        ...(j.stopped !== undefined ? [`journey "${j.name}" stopped: ${j.stopped}`] : []),
        ...castProblems(`journey "${j.name}"`, pin.cast, j.cast),
        ...(j.steps.length === pin.steps.length ? [] : [`journey "${j.name}" ran ${j.steps.length} steps, expected ${pin.steps.length}`]),
        ...pin.steps.flatMap((want, i) => {
          const got = j.steps[i];
          const at = `journey "${j.name}", step ${i + 1} (${want.name})`;
          if (got === undefined) return [`${at}: did not run`];
          const own = cast[want.actor]?.account;
          const mine = typeof own === "string" && ACCOUNT.test(own) ? own.toLowerCase() : undefined;
          const signed = got.signer?.account;
          return [
            ...(got.verdict === "pass" ? [] : [`${at}: verdict ${JSON.stringify(got.verdict)}, not pass`]),
            ...(got.name === want.name ? [] : [`${at}: the report calls it ${JSON.stringify(got.name)}`]),
            ...(got.actor === want.actor ? [] : [`${at}: run by ${JSON.stringify(got.actor)}, not ${want.actor}`]),
            ...(got.operation === want.operation ? [] : [`${at}: ran ${JSON.stringify(got.operation)}, not ${want.operation}`]),
            ...(!want.chain ? [] : [
              ...(got.signer === undefined ? [`${at}: no \`signer\` in the report`] : [
                ...(got.signer.actor === want.actor ? [] : [`${at}: signed by actor ${JSON.stringify(got.signer.actor)}, not ${want.actor}`]),
                ...(mine !== undefined && typeof signed === "string" && signed.toLowerCase() === mine ? [] : [`${at}: signed by account ${JSON.stringify(signed)}, not ${want.actor}'s ${JSON.stringify(own)}`]),
              ]),
              ...(want.sent === 0
                ? (got.tx === undefined ? [] : [`${at}: sends no transaction, but the report has a \`tx\``])
                : got.tx === undefined ? [`${at}: sends a transaction, but the report has no \`tx\``] : [
                  ...(typeof got.tx.hash === "string" && HASH.test(got.tx.hash) ? [] : [`${at}: tx.hash ${JSON.stringify(got.tx.hash)} is not a 32-byte hash`]),
                  ...(mine !== undefined && typeof got.tx.by === "string" && got.tx.by.toLowerCase() === mine ? [] : [`${at}: tx.by ${JSON.stringify(got.tx.by)} is not ${want.actor}'s ${JSON.stringify(own)}`]),
                ]),
            ]),
          ];
        }),
      ];
    }),
  ];
};
