// The piece: how a call's end lands in the state the page and UI SDK's bridge read, what a form sends, and when a read loads.
import { describe, expect, it } from "vitest";
import type { Outcome, PieceWiring } from "#modules/host/types.js";
import { piece } from "./service.ts";
import { answerText, landed, refusedText } from "./internal/state.ts";
import type { PieceContext, PieceOptions, PieceState } from "./types.ts";

const refusal = { name: "HandleTaken", code: "HN-001", message: "", known: true } as const;

describe("state", () => {
  it("a refusal is written where the page reads it and where the bridge reads it", () => {
    expect(landed({ ok: false, refusal })).toEqual({ pending: false, refusal, error: "HandleTaken (HN-001)", done: false, value: null });
    expect(refusedText({ ...refusal, message: "Someone else holds it." })).toBe("HandleTaken (HN-001): Someone else holds it.");
    expect(refusedText({ name: "ActionFailed", code: "", message: "The action failed.", known: false })).toBe("ActionFailed: The action failed.");
  });

  it("an answer is landed as the value the agent's snapshot shows, and said on one line", () => {
    expect(landed({ ok: true, answer: { handle: "hdl_x" } })).toEqual({ pending: false, refusal: null, error: null, done: true, value: { handle: "hdl_x" } });
    expect(answerText({ handle: "hdl_x" })).toBe("handle: hdl_x");
    expect(answerText({})).toBe("Done");
  });

  it("a read starts pending and a move does not", () => {
    expect([piece.state().pending, piece.readState().pending]).toEqual([false, true]);
  });
});

/** The part of UI SDK's context a piece's api uses, with the host's callback in its options. */
const fake = <Answer>(options: PieceOptions<Answer>, form?: Record<string, string>) => {
  let state = piece.state() as PieceState<Answer>;
  let current = options;
  const listeners: Array<(next: PieceOptions<Answer>) => void> = [];
  const context = {
    store: { get: () => state, set: (next: Partial<PieceState<Answer>>) => void (state = { ...state, ...next }) },
    options: () => current,
    onOptions: (listener: (next: PieceOptions<Answer>) => void) => void listeners.push(listener),
    element: () => (form === undefined ? undefined : { form }),
  };
  return { context: context as unknown as PieceContext<Answer>, state: () => state, change: (next: PieceOptions<Answer>) => { current = next; listeners.forEach((l) => l(next)); } };
};

describe("write", () => {
  const sends: Array<{ readonly payload: unknown; readonly key: string | undefined }> = [];
  const wired = (outcome: Outcome<{ readonly handle: string }>): Pick<PieceWiring, "onSend"> => ({
    onSend: (payload, details) => (sends.push({ payload, key: details.requestKey }), details.settle(Promise.resolve(outcome as Outcome<never>))),
  });

  it("sends the subject the page gave, shows pending until the outcome, then the answer, and calls onDone once", async () => {
    let done: unknown;
    const rig = fake<{ readonly handle: string }>({ ...wired({ ok: true, answer: { handle: "hdl_x" } }), onDone: (answer) => void (done = answer), handle: "hdl_1" });
    const api = piece.api(rig.context, { fields: [], subject: ["handle"] });
    const pressed = api.submit();
    expect(rig.state().pending).toBe(true);
    await pressed;
    expect(sends.at(-1)).toMatchObject({ payload: { handle: "hdl_1" } });
    expect(rig.state()).toMatchObject({ pending: false, done: true, value: { handle: "hdl_x" } });
    expect(done).toEqual({ handle: "hdl_x" });
  });

  it("does not send a second time while the first is out", async () => {
    const before = sends.length;
    const rig = fake<{ readonly handle: string }>({ ...wired({ ok: true, answer: { handle: "hdl_x" } }) });
    const api = piece.api(rig.context, { fields: [] });
    const first = api.submit();
    void api.submit();
    await first;
    expect(sends.length - before).toBe(1);
  });

  it("keeps its request key while the outcome is not known, and makes a new one once it is", async () => {
    sends.length = 0;
    const unknown = fake<{ readonly handle: string }>(wired({ ok: false, refusal: { ...refusal, known: false } }));
    const api = piece.api(unknown.context, { fields: [] });
    await api.submit();
    await api.submit();
    expect(sends[0]!.key).toBe(sends[1]!.key);
    sends.length = 0;
    const known = fake<{ readonly handle: string }>(wired({ ok: false, refusal }));
    const again = piece.api(known.context, { fields: [] });
    await again.submit();
    await again.submit();
    expect(sends[0]!.key).not.toBe(sends[1]!.key);
    expect(known.state()).toMatchObject({ refusal, error: "HandleTaken (HN-001)", value: null });
  });
});

describe("read", () => {
  const rig = (value: string) => {
    const loads: Array<unknown> = [];
    const onSend: PieceWiring["onSend"] = (payload, details) => (loads.push(payload), details.settle(Promise.resolve({ ok: true, answer: { value } } as Outcome<never>)));
    const finished: Array<() => void> = [];
    const host = { onFinished: (_things: ReadonlyArray<string>, listener: () => void) => (finished.push(listener), () => void finished.splice(finished.indexOf(listener), 1)) } as unknown as PieceWiring["host"];
    return { loads, finished, ...fake<{ readonly value: string }>({ host, onSend, handle: "ada" }) };
  };

  it("loads when it appears, again when a write on its things finishes, and again when its payload changes", async () => {
    const r = rig("a");
    const api = piece.readApi(r.context, { fields: ["handle"], reloadsOn: ["profile"] });
    const stop = api.start();
    await Promise.resolve();
    expect(r.loads).toEqual([{ handle: "ada" }]);
    r.finished.forEach((listener) => listener());
    expect(r.loads.length).toBe(2);
    r.change({ ...r.context.options(), handle: "bob" });
    expect(r.loads.at(-1)).toEqual({ handle: "bob" });
    expect(r.loads.length).toBe(3);
    stop();
    expect(r.finished).toEqual([]);
  });

  it("reloads for an agent, and shows the answer as its value", async () => {
    const r = rig("b");
    const api = piece.readApi(r.context, { fields: ["handle"], reloadsOn: [] });
    await api.reload();
    expect(r.state()).toMatchObject({ pending: false, value: { value: "b" } });
  });
});
