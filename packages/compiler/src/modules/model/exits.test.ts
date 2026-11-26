// An exit means one thing (K16 g, M1.47) and a declared `<Thing>NotFound` carries only the id (M1.46): the rules check 19
// doesn't reach — a machine's own exit, another thing's error named like a not-found, and a not-found with fields.
import { describe, expect, it } from "vitest";
import { exitClashes, notFoundShapes, operationExitClashes } from "./internal/exits.ts";

const app = { kind: "app" } as const;
const widget = (errors: Record<string, { exit: number; fields?: object }>, notFromExit?: number) => ({
  widget: {
    identifier: "Widget", from: app,
    errors: Object.fromEntries(Object.entries(errors).map(([n, e]) => [n, { exit: e.exit, fields: e.fields ?? {} }])),
    machine: notFromExit === undefined ? null : { notFrom: { error: "WidgetNotActive", exit: notFromExit } },
  },
});

describe("exits", () => {
  it("refuses a machine's own exit that is reserved or out of range, naming its machine.ts", () => {
    expect(exitClashes(widget({}, 3))).toEqual(["blueprint/things/widget/machine.ts: WidgetNotActive's exit 3 is NotAllowed's; pick another"]);
    expect(exitClashes(widget({}, 200))).toEqual(["blueprint/things/widget/machine.ts: WidgetNotActive's exit 200 is outside 5 to 119, which are the blueprint's; pick another"]);
    expect(exitClashes(widget({}, 40))).toEqual([]);
  });

  it("keeps 120 for IdempotencyConflict and 121 to 125 for the runtime, and lets a blueprint have 5 to 119 (G3)", () => {
    expect(exitClashes(widget({}, 120))).toEqual(["blueprint/things/widget/machine.ts: WidgetNotActive's exit 120 is IdempotencyConflict's; pick another"]);
    expect(exitClashes(widget({}, 122))).toEqual(["blueprint/things/widget/machine.ts: WidgetNotActive's exit 122 is the runtime's; pick another"]);
    expect(exitClashes(widget({}, 126))).toHaveLength(1);
    expect(exitClashes(widget({}, 5))).toEqual([]);
    expect(exitClashes(widget({}, 119))).toEqual([]);
  });

  it("lets only the thing's own <Thing>NotFound keep exit 4", () => {
    expect(exitClashes(widget({ WidgetNotFound: { exit: 4 } }))).toEqual([]);
    expect(exitClashes(widget({ GadgetNotFound: { exit: 4 } }))).toEqual(["blueprint/things/widget/errors.ts: GadgetNotFound's exit 4 is NotFound's; pick another"]);
  });

  it("refuses a declared <Thing>NotFound with any field but id", () => {
    expect(notFoundShapes(widget({ WidgetNotFound: { exit: 43, fields: { id: {} } } }))).toEqual([]);
    expect(notFoundShapes(widget({ WidgetNotFound: { exit: 43, fields: { id: {}, owner: {} } } }))).toEqual([
      "blueprint/things/widget/errors.ts: WidgetNotFound is the runtime's not-found refusal, which carries only the missing id; drop owner",
    ]);
  });

  // A generated adapter's four exits are one base set in its src/written.ts (G16-adapter-mounts call 1): only its refusals name
  // that setting; a hand-written adapter's and the app's still name their errors file.
  it("names a generated adapter's src/written.ts for its clashes, and nothing else's", () => {
    const plugin = (pkg: string, id: string, base: number) => ({ identifier: id, machine: null, from: { kind: "feature" as const, mount: pkg, package: `@orthograph/${pkg}`, version: "0.0.0", thing: pkg },
      errors: Object.fromEntries(["ApiFailure", "InputRefused", "AnswerRefused", "Unreachable"].map((e, i) => [`${id}${e}`, { exit: base + i }])) });
    const things = { ...widget({ WidgetGone: { exit: 82 } }), rates: plugin("rates", "Rates", 81), fx: plugin("fx", "Fx", 83), hand: plugin("hand", "Hand", 84) };
    const written = new Map([["rates", "@orthograph/rates/src/written.ts"], ["fx", "@orthograph/fx/src/written.ts"]]);
    const op = (errors: ReadonlyArray<string>) => ({ op: { file: "blueprint/things/widget/verbs/ask.ts", name: "widget.ask", errors, move: null, thing: "widget" } });
    const fit = "to a base whose four exits (base to base+3) miss every other exit widget.ask refuses, within 5 to 119";
    expect(operationExitClashes(things, op([...Object.keys(things.rates.errors), ...Object.keys(things.fx.errors)]), written)).toEqual([
      `blueprint/things/widget/verbs/ask.ts: widget.ask refuses errors of @orthograph/rates and @orthograph/fx at the same exits (83, 84): set \`exit\` in @orthograph/rates/src/written.ts or @orthograph/fx/src/written.ts ${fit}`,
    ]);
    expect(operationExitClashes(things, op(["WidgetGone", "RatesInputRefused"]), written)).toEqual([
      `blueprint/things/widget/verbs/ask.ts: widget.ask refuses errors of widget and @orthograph/rates at the same exit (82): set \`exit\` in @orthograph/rates/src/written.ts ${fit}, or pick others in blueprint/things/widget/errors.ts`,
    ]);
    expect(operationExitClashes(things, op(["RatesUnreachable", "HandApiFailure"]), written)).toEqual([
      `blueprint/things/widget/verbs/ask.ts: widget.ask refuses errors of @orthograph/rates and @orthograph/hand at the same exit (84): set \`exit\` in @orthograph/rates/src/written.ts ${fit}, or pick others in @orthograph/hand/blueprint/things/hand/errors.js`,
    ]);
    expect(operationExitClashes(things, op(["WidgetGone", "HandApiFailure", "HandInputRefused"]), written)).toEqual([]);
    expect(exitClashes({ fx: plugin("fx", "Fx", 117), hand: plugin("hand", "Hand", 117) }, written)).toEqual([
      "@orthograph/fx/blueprint/things/fx/errors.js: FxUnreachable's exit 120 is IdempotencyConflict's; set `exit` in @orthograph/fx/src/written.ts to a base whose four exits (base to base+3) fit 5 to 119",
      "@orthograph/hand/blueprint/things/hand/errors.js: HandUnreachable's exit 120 is IdempotencyConflict's; pick another",
    ]);
  });
});
