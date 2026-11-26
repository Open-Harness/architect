// The stub `ortho add journey "<title>"` writes has a blank cast and blank steps. It crashed the compiler
// (`Cannot read properties of undefined (reading 'service')` in internal/allowed.ts), and with it check, brief and prove.
// A blank is listed as a blank: the journey is in the model with what is still to write, and nothing is read from it.
import { Blueprint } from "orthograph";
import { describe, expect, it } from "vitest";
import { allowedOf } from "./internal/allowed.ts";
import { storiesOf } from "./internal/journeys.ts";

const stories = (declaration: unknown) => {
  const layout = { things: new Map(), mounts: new Map(), journeys: new Map([["journeys/a.ts", { declaration, sourceHash: undefined }]]), startingWorlds: new Map() } as never;
  const problems: Array<string> = [];
  return { ...storiesOf(layout, {}, allowedOf(layout, new Map(), problems), problems), problems };
};

describe("a journey stub's blanks", () => {
  it("lists a blank cast and blank steps, as `ortho add journey` writes them, and reads the journey as empty", () => {
    const said = stories(Blueprint.journey("a visitor shares a page", {
      cast: Blueprint.todo("who is in it, by role"),
      steps: () => Blueprint.todo("the steps, each a call and its checks"),
    }));
    expect(said.problems).toEqual([]);
    expect(said.journeyBlanks).toEqual({ "journeys/a.ts": ["who is in it, by role", "the steps, each a call and its checks"] });
    expect(said.journeys["journeys/a.ts"]).toMatchObject({ name: "a visitor shares a page", cast: {}, steps: [], blanks: ["who is in it, by role", "the steps, each a call and its checks"] });
  });

  it("lists one cast member left blank beside a cast one, and keeps the one that is cast", () => {
    const said = stories(Blueprint.journey("half cast", {
      cast: { visitor: Blueprint.anyone, owner: Blueprint.todo("the page's owner") },
      steps: () => [],
    }));
    expect(said.problems).toEqual([]);
    expect(said.journeyBlanks).toEqual({ "journeys/a.ts": ["the page's owner"] });
    expect(said.journeys["journeys/a.ts"]?.cast).toEqual({ visitor: { kind: "anyone" } });
  });

  it("reads the steps a blank cast member is already written into, and one step left blank among written ones", () => {
    const run = (actor: string) => ({ kind: "call", actor, operation: {}, payload: {}, request: undefined }) as never;
    const said = stories(Blueprint.journey("half written", {
      cast: { visitor: Blueprint.anyone, owner: Blueprint.todo("the page's owner") },
      steps: (s) => [
        s.step("the owner does something", (s as unknown as { readonly owner: { readonly run: (...args: ReadonlyArray<unknown>) => never } }).owner.run({ kind: "operation" }, {})),
        Blueprint.todo("the next step"),
        s.step("a visitor looks", run("visitor")),
      ],
    }));
    expect(said.problems).toEqual([]);
    expect(said.journeyBlanks).toEqual({ "journeys/a.ts": ["the page's owner", "the next step"] });
    expect(said.journeys["journeys/a.ts"]?.steps.map((step) => step.title)).toEqual(["the owner does something", "a visitor looks"]);
  });

  it("lists a starting world's blank cast under the world's file, and reads the world as empty", () => {
    const layout = {
      things: new Map(), mounts: new Map(), journeys: new Map(),
      startingWorlds: new Map([["w", { file: "starting-worlds/w.ts", declaration: Blueprint.startingWorld("w", { cast: Blueprint.todo("who is in the world"), makes: () => [], gives: () => ({}) }), sourceHash: undefined }]]),
    } as never;
    const problems: Array<string> = [];
    const said = storiesOf(layout, {}, allowedOf(layout, new Map(), problems), problems);
    expect(problems).toEqual([]);
    expect(said.journeyBlanks).toEqual({ "starting-worlds/w.ts": ["who is in the world"] });
    expect(said.startingWorlds["w"]).toMatchObject({ cast: {}, makes: [], gives: {} });
  });
});
