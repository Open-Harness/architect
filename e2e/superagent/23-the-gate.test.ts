// Check 23 (slice 6): the gate's table, cell by cell (GOAL17-stage-one, calls 7 and 8, from the prototype's `002`). `gate.of(trigger, thread,
// tickets, policy)` is pure, so every cell, and every pair of cells that decides which wins, is a case. The expected values come from the
// record, never from the gate. CONTROLS: `reference` is the record's table written again; it passes every case, and each planted wrong gate
// (two rows swapped, a row dropped, a cell read from the wrong place, a mode ignored) fails at least one.
// The app's gate is `gate` from `plugins/intake/src/modules/gate/service.ts`; until slice 7 writes it, the file is not there and the one test that
// reads it fails on that.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { superagent } from "./app.ts";

type Strength = "explicit" | "inferred" | "none";
type Mode = "off" | "observe" | "auto";
type Cell = "listed" | "unlisted" | "unnamed";
interface Account { readonly state: "seen" | "listed" | "unlisted"; readonly bot: boolean; readonly external: string }
interface TriggerView { readonly addressed: "mention" | "direct" | undefined; readonly author: Account | null; readonly row: string; readonly observed: boolean }
interface TicketView { readonly state: "open" | "ended" | "stopped"; readonly mode: "own" | "attached" | "context" | "bound"; readonly stoppedBy: "person" | undefined }
interface PolicyView { readonly mode: Mode; readonly bots: ReadonlySet<string>; readonly admission: Readonly<Record<string, Partial<Record<Cell, Strength>>>> }
interface Out { readonly strength: Strength; readonly basis: "addressed" | "followup" | "admission" | "bot" }
type Gate = { readonly of: (t: TriggerView, thread: { readonly key: string }, tickets: ReadonlyArray<TicketView>, p: PolicyView) => Out };

const thread = { key: "C1:1.1" };
const person = (state: Account["state"]): Account => ({ state, bot: false, external: "U1" });
const bot: Account = { state: "seen", bot: true, external: "UB1" };
const trig = (author: Account | null, addressed: TriggerView["addressed"], observed = true): TriggerView => ({ author, addressed, row: "C1", observed });
const policy = (mode: Mode = "observe", bots: ReadonlyArray<string> = [], admission: PolicyView["admission"] = {}): PolicyView => ({ mode, bots: new Set(bots), admission });
const botTrig = (addressed: TriggerView["addressed"], observed = true): TriggerView => trig(bot, addressed, observed);
const own = (state: TicketView["state"] = "open", stoppedBy: TicketView["stoppedBy"] = undefined): TicketView => ({ state, mode: "own", stoppedBy });

interface Case { readonly name: string; readonly t: TriggerView; readonly tickets?: ReadonlyArray<TicketView>; readonly p: PolicyView; readonly want: Strength; readonly basis?: Out["basis"] }
const onList = policy("observe", ["UB1"]);
const C: ReadonlyArray<Case> = [
  { name: "a listed person addressing the agent is explicit", t: trig(person("listed"), "mention"), p: policy(), want: "explicit", basis: "addressed" },
  { name: "a listed person's direct message is explicit", t: trig(person("listed"), "direct"), p: policy(), want: "explicit", basis: "addressed" },
  { name: "explicit works in off", t: trig(person("listed"), "mention"), p: policy("off"), want: "explicit" },
  { name: "explicit works in auto", t: trig(person("listed"), "mention"), p: policy("auto"), want: "explicit" },
  { name: "a stranger addressing the agent is the row's unlisted cell: none by default", t: trig(person("seen"), "mention"), p: policy(), want: "none", basis: "admission" },
  { name: "an unlisted person addressing the agent is none by default", t: trig(person("unlisted"), "mention"), p: policy(), want: "none" },
  { name: "the unlisted cell set to explicit admits a stranger's mention", t: trig(person("seen"), "mention"), p: policy("observe", [], { C1: { unlisted: "explicit" } }), want: "explicit", basis: "admission" },
  { name: "the unlisted cell set to explicit works in off", t: trig(person("seen"), "mention"), p: policy("off", [], { C1: { unlisted: "explicit" } }), want: "explicit" },
  { name: "the unlisted cell set to inferred is inferred in observe", t: trig(person("seen"), "mention"), p: policy("observe", [], { C1: { unlisted: "inferred" } }), want: "inferred" },
  { name: "the unlisted cell set to inferred is none in off", t: trig(person("seen"), "mention"), p: policy("off", [], { C1: { unlisted: "inferred" } }), want: "none" },
  { name: "another row's cell does not apply", t: trig(person("seen"), "mention"), p: policy("observe", [], { C2: { unlisted: "explicit" } }), want: "none" },
  { name: "a listed person's plain message is the listed cell: inferred by default", t: trig(person("listed"), undefined), p: policy(), want: "inferred", basis: "admission" },
  { name: "a listed person's plain message is none in off", t: trig(person("listed"), undefined), p: policy("off"), want: "none" },
  { name: "a listed person's plain message is inferred in auto", t: trig(person("listed"), undefined), p: policy("auto"), want: "inferred" },
  { name: "the listed cell set to ignore stops it", t: trig(person("listed"), undefined), p: policy("observe", [], { C1: { listed: "none" } }), want: "none" },
  { name: "a plain message on a row that does not receive every message is none", t: trig(person("listed"), undefined, false), p: policy(), want: "none" },
  { name: "a stranger's plain message is the unnamed cell: none by default", t: trig(person("seen"), undefined), p: policy(), want: "none" },
  { name: "the unnamed cell set to inferred admits it in observe", t: trig(person("seen"), undefined), p: policy("observe", [], { C1: { unnamed: "inferred" } }), want: "inferred" },
  { name: "a message with no sender is the unnamed cell: none by default", t: trig(null, undefined), p: policy(), want: "none" },
  { name: "a message with no sender, unnamed inferred, is inferred in observe", t: trig(null, undefined), p: policy("observe", [], { C1: { unnamed: "inferred" } }), want: "inferred", basis: "admission" },
  { name: "a message with no sender, unnamed inferred, is none in off", t: trig(null, undefined), p: policy("off", [], { C1: { unnamed: "inferred" } }), want: "none" },
  { name: "a message with no sender, unnamed inferred, on a row that does not receive every message is none", t: trig(null, undefined, false), p: policy("observe", [], { C1: { unnamed: "inferred" } }), want: "none" },
  { name: "a person's follow-up on a thread with an open ticket: a listed person's is explicit", t: trig(person("listed"), undefined), tickets: [own()], p: policy(), want: "explicit", basis: "followup" },
  { name: "an unlisted person's follow-up is inferred", t: trig(person("seen"), undefined), tickets: [own()], p: policy(), want: "inferred", basis: "followup" },
  { name: "an unlisted person's follow-up is none in off", t: trig(person("seen"), undefined), tickets: [own()], p: policy("off"), want: "none" },
  { name: "an unlisted person's follow-up where the unlisted cell is explicit stays explicit, even in off", t: trig(person("seen"), "mention"), tickets: [own()], p: policy("off", [], { C1: { unlisted: "explicit" } }), want: "explicit" },
  { name: "a follow-up on an ended ticket that no person stopped still counts", t: trig(person("listed"), undefined), tickets: [own("ended")], p: policy(), want: "explicit", basis: "followup" },
  { name: "a thread whose ticket a person stopped takes the ordinary path: a listed plain message is inferred", t: trig(person("listed"), undefined), tickets: [own("stopped", "person")], p: policy(), want: "inferred", basis: "admission" },
  { name: "a thread followed only for context grants no follow-up strength", t: trig(person("seen"), undefined), tickets: [{ state: "open", mode: "context", stoppedBy: undefined }], p: policy(), want: "none" },
  { name: "an attached thread's follow-up counts", t: trig(person("seen"), undefined), tickets: [{ state: "open", mode: "attached", stoppedBy: undefined }], p: policy(), want: "inferred", basis: "followup" },
  { name: "a bot on the list that addresses the agent is inferred", t: botTrig("mention"), p: onList, want: "inferred", basis: "bot" },
  { name: "a bot on the list on a row that receives every message is inferred without addressing", t: botTrig(undefined, true), p: onList, want: "inferred" },
  { name: "a bot on the list, unaddressed, on a row that does not receive every message is none", t: botTrig(undefined, false), p: onList, want: "none" },
  { name: "a bot on the list is none in off", t: botTrig("mention"), p: policy("off", ["UB1"]), want: "none" },
  { name: "a bot on the list is inferred in auto", t: botTrig("mention"), p: policy("auto", ["UB1"]), want: "inferred" },
  { name: "a bot not on the list is none, even addressing", t: botTrig("mention"), p: policy(), want: "none", basis: "bot" },
  { name: "a bot is never explicit, even where the unlisted cell is explicit", t: botTrig("mention"), p: policy("observe", ["UB1"], { C1: { unlisted: "explicit" } }), want: "inferred" },
  { name: "a bot's message on a thread with a ticket is still a bot's: inferred at most", t: botTrig("mention"), tickets: [own()], p: onList, want: "inferred" },
];

export const problemsOf = (gate: Gate, cases: ReadonlyArray<Case> = C): ReadonlyArray<string> =>
  cases.flatMap((k) => {
    const got = gate.of(k.t, thread, k.tickets ?? [], k.p);
    const basisOk = k.basis === undefined || got.basis === k.basis;
    return got.strength === k.want && basisOk ? [] : [`${k.name}: expected ${k.want}${k.basis ? `/${k.basis}` : ""}, got ${got.strength}/${got.basis}`];
  });

/** The record's table (GOAL17-stage-one call 8), written again. */
const reference: Gate = {
  of: (tv, _thread, tickets, p) => {
    const t = tv;
    const a = t.author;
    const row = p.admission[t.row] ?? {};
    const cell = (c: Cell, dflt: Strength): Strength => row[c] ?? dflt;
    const addressed = t.addressed !== undefined;
    const followed = tickets.some((k) => k.mode !== "context" && k.state !== "stopped" && k.stoppedBy !== "person");
    let out: Out;
    if (a?.bot) {
      const listed = p.bots.has(a.external);
      out = listed && (addressed || t.observed) ? { strength: "inferred", basis: "bot" } : { strength: "none", basis: "bot" };
    } else if (a?.state === "listed" && addressed) out = { strength: "explicit", basis: "addressed" };
    else if (a !== null && followed) out = { strength: a.state === "listed" || row.unlisted === "explicit" ? "explicit" : "inferred", basis: "followup" };
    else if (a?.state !== "listed" && a !== null && addressed) out = { strength: cell("unlisted", "none"), basis: "admission" };
    else if (a?.state === "listed" && t.observed) out = { strength: cell("listed", "inferred"), basis: "admission" };
    else if (t.observed) out = { strength: cell("unnamed", "none"), basis: "admission" };
    else out = { strength: "none", basis: "admission" };
    return p.mode === "off" && out.strength === "inferred" ? { ...out, strength: "none" } : out;
  },
};

describe("23 the gate: controls", () => {
  it("the reference table, written from the record, is right on every cell", () => {
    expect(problemsOf(reference)).toEqual([]);
  });

  const planted: ReadonlyArray<readonly [string, Gate]> = [
    ["a listed person's mention is inferred", { of: (t, th, k, p) => { const o = reference.of(t, th, k, p); return o.basis === "addressed" ? { ...o, strength: "inferred" } : o; } }],
    ["every inferred is admitted in off", { of: (t, th, k, p) => reference.of(t, th, k, { ...p, mode: "observe" }) }],
    ["off drops explicit too", { of: (t, th, k, p) => { const o = reference.of(t, th, k, p); return p.mode === "off" && o.strength === "explicit" ? { ...o, strength: "none" } : o; } }],
    ["the unlisted cell is read from another row", { of: (t, th, k, p) => reference.of({ ...t, row: "C2" }, th, k, p) }],
    ["a stranger's mention is explicit", { of: (t, th, k, p) => { const o = reference.of(t, th, k, p); return o.basis === "admission" && t.addressed !== undefined && t.author?.state !== "listed" && t.author !== null && !t.author.bot ? { ...o, strength: "explicit" } : o; } }],
    ["a bot is admitted though it is not on the list", { of: (t, th, k, p) => reference.of(t, th, k, { ...p, bots: new Set(["UB1"]) }) }],
    ["a bot is explicit when the unlisted cell is", { of: (t, th, k, p) => { const o = reference.of(t, th, k, p); return t.author?.bot && (p.admission[t.row]?.unlisted === "explicit") && o.strength === "inferred" ? { ...o, strength: "explicit" } : o; } }],
    ["a followed thread is ignored", { of: (t, th, _k, p) => reference.of(t, th, [], p) }],
    ["a stopped ticket still follows", { of: (t, th, k, p) => reference.of(t, th, k.map((x) => ({ ...x, state: "open", stoppedBy: undefined })), p) }],
    ["a context thread follows", { of: (t, th, k, p) => reference.of(t, th, k.map((x) => ({ ...x, mode: "own" })), p) }],
    ["an unlisted follow-up is explicit", { of: (t, th, k, p) => { const o = reference.of(t, th, k, p); return o.basis === "followup" ? { ...o, strength: "explicit" } : o; } }],
    ["a listed person's plain message is explicit", { of: (t, th, k, p) => { const o = reference.of(t, th, k, p); return o.basis === "admission" && t.author?.state === "listed" && o.strength === "inferred" ? { ...o, strength: "explicit" } : o; } }],
    ["a row that does not receive every message admits plain messages", { of: (t, th, k, p) => reference.of({ ...t, observed: true }, th, k, p) }],
    ["a message with no sender is read as a listed person's", { of: (t, th, k, p) => reference.of(t.author === null ? { ...t, author: person("listed") } : t, th, k, p) }],
    ["the listed cell is ignored", { of: (t, th, k, p) => reference.of(t, th, k, { ...p, admission: {} }) }],
    ["everything is none", { of: () => ({ strength: "none", basis: "admission" }) }],
  ];
  it.each(planted)("a gate with %s is refused", (_why, gate) => {
    expect(problemsOf(gate)).not.toEqual([]);
  });
});

describe("23 the gate: the app's gate", () => {
  it("is right on every cell and every pair of cells that decides which wins", async () => {
    const mod = (await import(/* @vite-ignore */ pathToFileURL(join(superagent, "plugins/intake/src/modules/gate/service.ts")).href)) as { readonly gate: Gate };
    expect(problemsOf(mod.gate)).toEqual([]);
  });
});
