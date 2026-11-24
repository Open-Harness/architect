// Check 23 (slice 6): the gate's table, cell by cell (GOAL17-stage-one, calls 7 and 8, from the prototype's `002`). `gate.of(trigger, thread,
// tickets, policy)` is pure, so every cell, and every pair of cells that decides which wins, is a case. The expected values come from the
// record, never from the gate. CONTROLS: `reference` is the record's table written again; it passes every case, and each planted wrong gate
// (two rows swapped, a row dropped, a cell read from the wrong place, a mode ignored) fails at least one. Beside the named cases, every
// combination of the inputs the table reads is judged against `reference` (#932).
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
  // Row 4 before row 5: a stranger who addresses the agent on a followed thread is a follow-up, not the row's unlisted cell (#932, 1).
  { name: "an unlisted person who addresses the agent on a followed thread is a follow-up: inferred, not the unlisted cell", t: trig(person("seen"), "mention"), tickets: [own()], p: policy(), want: "inferred", basis: "followup" },
  { name: "an unlisted person's addressed follow-up is none in off", t: trig(person("seen"), "mention"), tickets: [own()], p: policy("off"), want: "none", basis: "followup" },
  // Row 4 names `bound` with `own` and `attached` (#932, 2).
  { name: "a bound thread's follow-up counts", t: trig(person("seen"), undefined), tickets: [{ state: "open", mode: "bound", stoppedBy: undefined }], p: policy(), want: "inferred", basis: "followup" },
  { name: "a listed person's follow-up on a bound thread is explicit", t: trig(person("listed"), undefined), tickets: [{ state: "ended", mode: "bound", stoppedBy: undefined }], p: policy(), want: "explicit", basis: "followup" },
  // Row 4 is a person's: a message with no sender on a followed thread is row 7's, the unnamed cell (#932, 3).
  { name: "a message with no sender on a followed thread is no follow-up: the unnamed cell, none by default", t: trig(null, undefined), tickets: [own()], p: policy(), want: "none", basis: "admission" },
  { name: "a message with no sender on a followed thread, unnamed inferred, is inferred by admission", t: trig(null, undefined), tickets: [own()], p: policy("observe", [], { C1: { unnamed: "inferred" } }), want: "inferred", basis: "admission" },
  // No sender, addressing: never row 3 or row 5, which judge a person; the unnamed cell judges it (#932, 4, GOAL17-gate-no-sender).
  { name: "a message with no sender that addresses the agent is the unnamed cell: none by default", t: trig(null, "mention"), p: policy(), want: "none", basis: "admission" },
  { name: "a message with no sender that addresses the agent, unnamed inferred, is inferred", t: trig(null, "mention"), p: policy("observe", [], { C1: { unnamed: "inferred" } }), want: "inferred", basis: "admission" },
  { name: "a message with no sender that addresses the agent does not read the unlisted cell", t: trig(null, "direct"), p: policy("observe", [], { C1: { unlisted: "explicit" } }), want: "none", basis: "admission" },
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
    // Row 7: not listed and not addressing, or no sender at all, addressing or not (GOAL17-gate-no-sender).
    else if (t.observed) out = { strength: cell("unnamed", "none"), basis: "admission" };
    else out = { strength: "none", basis: "admission" };
    return p.mode === "off" && out.strength === "inferred" ? { ...out, strength: "none" } : out;
  },
};

/**
 * Every input the table reads, crossed (#932's second finding: the named cases alone let wrong gates through): the author (listed, seen,
 * unlisted, no sender, a bot on the list, a bot off it) × addressing (none, mention, direct) × `observed` × the thread's tickets (none, or one
 * of each mode × state × who stopped it) × the mode × the bot list (empty, or the first bot) × each of the row's three cells (unset, explicit, inferred, none). The expected answer is
 * `reference`'s: the record's table written again, never the gate under test.
 */
const everyCell = (() => {
  const authors: ReadonlyArray<Account | null> = [person("listed"), person("seen"), person("unlisted"), null, bot, { ...bot, external: "UB2" }];
  const tickets: ReadonlyArray<ReadonlyArray<TicketView>> = [[], ...(["own", "attached", "context", "bound"] as const).flatMap((mode) =>
    (["open", "ended", "stopped"] as const).flatMap((state) => ([undefined, "person"] as const).map((stoppedBy) => [{ state, mode, stoppedBy }])))];
  const cells: ReadonlyArray<Strength | undefined> = [undefined, "explicit", "inferred", "none"];
  const out: Array<readonly [TriggerView, ReadonlyArray<TicketView>, PolicyView]> = [];
  for (const author of authors) for (const addressed of [undefined, "mention", "direct"] as const) for (const observed of [true, false])
    for (const k of tickets) for (const mode of ["off", "observe", "auto"] as const) for (const bots of [[], ["UB1"]]) for (const listed of cells) for (const unlisted of cells) for (const unnamed of cells) {
      const row = { ...(listed ? { listed } : {}), ...(unlisted ? { unlisted } : {}), ...(unnamed ? { unnamed } : {}) };
      out.push([trig(author, addressed, observed), k, policy(mode, bots, { C1: row })]);
    }
  return out;
})();
const show = (t: TriggerView, k: ReadonlyArray<TicketView>, p: PolicyView) =>
  JSON.stringify({ author: t.author === null ? null : t.author.bot ? `bot ${t.author.external}` : t.author.state, addressed: t.addressed ?? null, observed: t.observed, tickets: k, mode: p.mode, bots: [...p.bots], row: p.admission["C1"] });
/** Where `gate` and the table part, at most five named: an empty list is a gate right on every cell. */
export const cellsWrong = (gate: Gate): ReadonlyArray<string> => {
  const wrong: Array<string> = [];
  for (const [t, k, p] of everyCell) {
    const want = reference.of(t, thread, k, p);
    const got = gate.of(t, thread, k, p);
    if (got.strength !== want.strength || got.basis !== want.basis) wrong.push(`${show(t, k, p)}: expected ${want.strength}/${want.basis}, got ${got.strength}/${got.basis}`);
    if (wrong.length >= 5) break;
  }
  return wrong;
};

describe("23 the gate: controls", () => {
  it("the reference table, written from the record, is right on every cell", () => {
    expect(problemsOf(reference)).toEqual([]);
  });

  it("the crossed inputs are every combination the table reads", () => {
    expect(everyCell.length).toBe(6 * 3 * 2 * 25 * 3 * 2 * 4 * 4 * 4);
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
    // #932: the four cells the first list missed, each a wrong gate that passed it.
    ["row 5 before row 4: a stranger's mention on a followed thread reads the unlisted cell", { of: (t, th, k, p) => (t.author !== null && !t.author.bot && t.author.state !== "listed" && t.addressed !== undefined ? reference.of(t, th, [], p) : reference.of(t, th, k, p)) }],
    ["a bound thread does not follow", { of: (t, th, k, p) => reference.of(t, th, k.filter((x) => x.mode !== "bound"), p) }],
    ["a message with no sender on a followed thread is a follow-up", { of: (t, th, k, p) => { const o = reference.of(t, th, k, p); return t.author === null && k.some((x) => x.mode !== "context" && x.state !== "stopped") ? { strength: p.mode === "off" ? "none" : "inferred", basis: "followup" } : o; } }],
    ["a message with no sender that addresses the agent is explicit", { of: (t, th, k, p) => (t.author === null && t.addressed !== undefined ? { strength: "explicit", basis: "addressed" } : reference.of(t, th, k, p)) }],
    ["a message with no sender that addresses the agent reads the unlisted cell", { of: (t, th, k, p) => (t.author === null && t.addressed !== undefined ? reference.of({ ...t, author: person("seen") }, th, [], p) : reference.of(t, th, k, p)) }],
    ["a message with no sender that addresses the agent is always none", { of: (t, th, k, p) => (t.author === null && t.addressed !== undefined ? { strength: "none", basis: "admission" } : reference.of(t, th, k, p)) }],
  ];
  it.each(planted)("a gate with %s is refused by the named cases", (_why, gate) => {
    expect(problemsOf(gate)).not.toEqual([]);
  });
  // The wrong gates the 🔍 of #940 found passing the named cases: each is refused by the crossed inputs (and the plants above are too).
  const crossed: ReadonlyArray<readonly [string, Gate]> = [
    ...planted,
    ["no sender, addressing, on a followed thread, read as a follow-up", { of: (t, th, k, p) => (t.author === null && t.addressed !== undefined && k.some((x) => x.mode !== "context" && x.state !== "stopped" && x.stoppedBy !== "person") ? { strength: p.mode === "off" ? "none" : "inferred", basis: "followup" } : reference.of(t, th, k, p)) }],
    ["no sender, addressing, reads the unnamed cell on a row that does not receive every message", { of: (t, th, k, p) => reference.of(t.author === null && t.addressed !== undefined ? { ...t, observed: true } : t, th, k, p) }],
    ["a stopped bound ticket still follows", { of: (t, th, k, p) => reference.of(t, th, k.map((x) => (x.mode === "bound" ? { ...x, state: "open", stoppedBy: undefined } : x)), p) }],
    ["no sender, addressing, ignores off", { of: (t, th, k, p) => (t.author === null && t.addressed !== undefined ? reference.of(t, th, k, { ...p, mode: "observe" }) : reference.of(t, th, k, p)) }],
    ["row 5 before row 4 except on own tickets", { of: (t, th, k, p) => (t.author !== null && !t.author.bot && t.author.state !== "listed" && t.addressed !== undefined && !k.some((x) => x.mode === "own") ? reference.of(t, th, [], p) : reference.of(t, th, k, p)) }],
    ["an ended ticket does not follow", { of: (t, th, k, p) => reference.of(t, th, k.filter((x) => x.state !== "ended"), p) }],
    ["a direct message is not addressing", { of: (t, th, k, p) => reference.of(t.addressed === "direct" ? { ...t, addressed: undefined } : t, th, k, p) }],
  ];
  it.each(crossed)("a gate with %s is refused on the crossed inputs", (_why, gate) => {
    expect(cellsWrong(gate)).not.toEqual([]);
  });
});

describe("23 the gate: the app's gate", () => {
  it("is right on every cell and every pair of cells that decides which wins", async () => {
    const mod = (await import(/* @vite-ignore */ pathToFileURL(join(superagent, "plugins/intake/src/modules/gate/service.ts")).href)) as { readonly gate: Gate };
    expect(problemsOf(mod.gate)).toEqual([]);
    expect(cellsWrong(mod.gate), "the app's gate against the table on every crossed input").toEqual([]);
  });
});
