// What the model says about an operation, sorted the way K29 section 3 sorts it: a read, a move or a write; which payload fields are
// inputs and which are the thing the piece is about; and which things a read shows.
import type { FieldModel, Model, OperationModel } from "@orthograph/compiler";
import { pascal } from "#modules/names/service.js";

export type Kind = "read" | "move" | "write";

/** A read has no `move` and only `load` steps (WEB-actions-projection call 1, the same rule `readOnly` follows); a `move` is a move; the rest write. */
export const kindOf = (op: OperationModel): Kind => (op.move ? "move" : Object.keys(op.steps).every((step) => step === "load") ? "read" : "write");

/** The fields of a payload, in the order declared. */
export const payloadOf = (op: OperationModel): ReadonlyArray<readonly [string, FieldModel]> => Object.entries(op.payload);

/** The payload fields holding some thing's id: not inputs but the piece's subject, which the page gives. */
export const subjectOf = (op: OperationModel): ReadonlyArray<string> => payloadOf(op).filter(([, f]) => f.value.type === "id").map(([key]) => key);

/** The payload fields a person fills in. */
export const inputsOf = (op: OperationModel): ReadonlyArray<readonly [string, FieldModel]> => payloadOf(op).filter(([, f]) => f.value.type !== "id");

/** Whether the answer hands its caller a secret once (`Blueprint.issued`: a session, a key): the piece never shows it, and an agent never reads it (K29, "Risks"). */
export const issues = (op: OperationModel): boolean => Object.values(op.answer).some((f) => f.issued === true);

/** The label of a field: its key with a capital (K29 section 3.2). */
export const labelOf = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);

/** What a piece is called to a person and to an agent: `Claim handle`, from the verb and the thing. */
export const nameOf = (op: OperationModel) => `${labelOf(op.verb).replaceAll("-", " ")} ${op.thing.replaceAll("-", " ")}`;

/** The export of a piece: `handle.claim` is `HandleClaim`. */
export const exportOf = (op: OperationModel) => `${pascal(op.thing)}${pascal(op.verb)}`;

/** The thing a field refers to (`link.id` is `link`), when it does. */
const thingOfRef = (ref: string | undefined) => ref?.split(".")[0];

/**
 * The things whose writes make a read load again: its own thing, every thing that refers to it, and every thing it refers to
 * (its thing's fields, its payload and its answer). `profile.get` shows a profile, a link refers to its profile, and a profile to its handle.
 */
export const reloadsOn = (model: Model, op: OperationModel): ReadonlyArray<string> => {
  const own = model.things[op.thing];
  const referrers = Object.values(model.things).filter((t) => t.name !== op.thing && Object.values(t.fields).some((f) => thingOfRef(f.ref) === op.thing)).map((t) => t.name);
  const referred = [...Object.values(own?.fields ?? {}), ...Object.values(op.payload), ...Object.values(op.answer)].flatMap((f) => thingOfRef(f.ref) ?? []);
  return [...new Set([op.thing, ...referrers, ...referred])];
};

/** A sentence in a doc comment: its own comment end would close the comment early. */
export const comment = (text: string) => text.replace(/\*\//g, "*\\/").replace(/\s*\n\s*/g, " ");
