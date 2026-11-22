// What a defect writes on the span it ends as an error: the first line of its cause (`defect`), and the error's tag (`error.tag`, M1.49), which is what an
// issue is grouped by (K18). The first line of a cause is `Error: ...` and names no tag; the tag is the error's `_tag`, else its constructor's name, else `Error`.
// A value, a statement or a payload never reaches it: the tag is a name, and the line is what it always was.
import { Cause } from "effect";

const tagOf = (error: unknown): string => {
  if (typeof error !== "object" || error === null) return "Error";
  const tag = (error as { _tag?: unknown })._tag;
  if (typeof tag === "string" && tag !== "") return tag;
  const name = (error as { constructor?: { name?: unknown } }).constructor?.name;
  return typeof name === "string" && name !== "" && name !== "Object" ? name : "Error";
};

export const defectAttributes = (cause: Cause.Cause<unknown>): Record<string, string> => ({
  defect: Cause.pretty(cause).split("\n")[0] ?? "",
  "error.tag": tagOf(Cause.squash(cause)),
});

/** The tag alone, for the span a defect passes through (a step's, a commit's): it is what lets a reader tell the step that carried this call's failure from one that errored and was recovered. */
export const defectTag = (cause: Cause.Cause<unknown>): Record<string, string> => ({ "error.tag": tagOf(Cause.squash(cause)) });
