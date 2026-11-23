// The parts of a piece. The root says it is pending the way UI SDK prints a state (`aria-busy`, and `data-pending` only when true);
// the refusal is a part that is there only while the piece is refused; the submit is a button that presses through the api.
import type { SlotFactory } from "@ui-sdk/core";
import type { Refusal } from "#modules/host/types.js";
import type { PieceState, ReadApi, WriteApi } from "../types.ts";
import { answerText, refusedText } from "./state.ts";

const busy = (state: { readonly pending: boolean }) => ({ "aria-busy": state.pending ? "true" : undefined, "data-pending": state.pending ? "" : undefined });

/** What the refusal part hands its children: the refusal, and the sentence a person and an agent read of it. */
interface Refused { readonly refusal: Refusal | null; readonly text: string }
const refusalSlot = <Api>(slot: SlotFactory<PieceState<any> & object, Api>) =>
  slot<{}, Refused>({
    present: (state) => state.refusal !== null,
    role: "alert",
    state: (state) => ({ refusal: state.refusal, text: state.refusal === null ? "" : refusedText(state.refusal) }),
  });

/** A move or a write: the form, its refusal, its answer and its one button. */
export const writeSlots = <Answer>(slot: SlotFactory<PieceState<Answer> & object, WriteApi>) => ({
  root: slot({
    attrs: (state) => ({ ...busy(state), "data-done": state.done ? "" : undefined }),
    on: { submit: (event, { api }) => { event.preventDefault(); void api.submit(event); } },
  }),
  refusal: refusalSlot(slot),
  answer: slot<{}, { readonly answer: Answer | null; readonly text: string }>({
    present: (state) => state.value !== null,
    state: (state) => ({ answer: state.value, text: state.value === null ? "" : answerText(state.value) }),
  }),
  submit: slot({
    role: "button",
    focus: "native",
    press: ({ api }, event) => { event?.preventDefault(); void api.submit(event); },
    attrs: (state) => ({ type: "submit", "data-slot": "button", "data-variant": "solid", disabled: state.pending ? "" : undefined }),
  }),
});

/** A read: its root loads when it appears and hands its children the value; the refusal shows when the read was refused. */
export const readSlots = <Answer>(slot: SlotFactory<PieceState<Answer> & object, ReadApi>) => ({
  root: slot<{}, { readonly value: Answer | null; readonly pending: boolean }>({
    attrs: (state) => busy(state),
    state: (state) => ({ value: state.value, pending: state.pending }),
    bind: (_element, part) => part.api.start(),
  }),
  refusal: refusalSlot(slot),
});
