// Goal 17 slice 9: a list read with `first` puts the rows holding one value ahead of the rest, each group oldest first, in one page and no cursor
// (GOAL17-slice9-build call 2). It is how `assignment.waiting` reads a person's message before a launch.
import { Cause, Effect, Exit } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Reads } from "#modules/handler/service.js";
import { storeMemory } from "./service.ts";

const Line = Blueprint.thing({ description: "One in a line.", fields: { id: Blueprint.id("lin"), why: Blueprint.oneOf(["launch", "person", "input"]) } });
const who = { kind: "person", person: "per_olga", via: "session" } as const;
const rows = [["a", "launch"], ["b", "person"], ["c", "input"], ["d", "person"], ["e", "launch"]] as const;
const stocked = () => storeMemory(rows.map(([n, why]) => [Line, { id: `lin_${n}`, why }] as never));
const ids = async (page: number, order: "oldest" | "newest" = "oldest") => {
  const served = Reads.serve({ name: "line.waiting", read: Blueprint.read(Line, { where: ["why"], order, page, first: { why: "person" }, allowed: [Blueprint.signedIn] }) });
  const exit = await Effect.runPromiseExit(served.run({}, who).pipe(Effect.provide(stocked().layer)));
  if (Exit.isFailure(exit)) throw new Error(String(Cause.squash(exit.cause)));
  const answer = exit.value as { items: Array<{ id: string }>; next: string | null };
  return { ids: answer.items.map((i) => i.id.slice(4)), next: answer.next };
};

describe("a list read with first", () => {
  it("answers the person's rows, then the rest, each oldest first, and no cursor", async () => {
    expect(await ids(255)).toEqual({ ids: ["b", "d", "a", "c", "e"], next: null });
  });
  it("keeps the order of a newest read inside each group", async () => {
    expect((await ids(255, "newest")).ids).toEqual(["d", "b", "e", "c", "a"]);
  });
  it("stops at the page size, the first group first", async () => {
    expect((await ids(3)).ids).toEqual(["b", "d", "a"]);
    expect((await ids(1)).ids).toEqual(["b"]);
  });
});
