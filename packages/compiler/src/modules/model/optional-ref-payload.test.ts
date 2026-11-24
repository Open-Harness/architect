// #976: an optional reference in an operation's payload (`Blueprint.optional(Shift.fields.id)`, as Capxul's attendance
// names its shift). The model keeps the field optional, and still lists the referenced thing's `<Thing>NotFound` for the
// field where no role check reads it: a caller who gives an id that names nothing is refused that way, and one who leaves
// the field out is not (the runtime's half is language-effect's `handler/optional-ref-payload.test.ts`). Where a role
// check reads the field on every way in (the role, `.of` it, `.via` it), a miss stays `NotAllowed`, as for a required
// reference; where any way in reads it without one, it is `<Thing>NotFound`. Each is keyed by the payload's name for it.
// Green when written, on main with #974: a guard. Its rows come from a hostile pass as well as the issue.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { Effect, Exit } from "effect";
import { afterAll, describe, expect, it } from "vitest";
import { nodeSource } from "#modules/source/service.js";
import { Compiler } from "./service.ts";

// Under the package, so `orthograph` resolves from the temporary project the way a project's own imports do.
const scratch = resolve(import.meta.dirname, "../../../.ortho/optional-ref-payload");
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

const project = (files: Record<string, string>): string => {
  mkdirSync(scratch, { recursive: true });
  const root = mkdtempSync(join(scratch, "p-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};
const verb = (allowed: string, key = "shift") => `import { Blueprint } from "orthograph";
import { Attendance } from "../thing.ts";
import { lead } from "../../shift/roles.ts";
export default Blueprint.operation(Attendance, {
  description: "Note who was there.",
  payload: { ${key}: Attendance.fields.shift, who: Attendance.fields.who },
  answer: { who: Attendance.fields.who },
  allowed: [${allowed}],
});
`;
const root = () => project({
  "blueprint/things/shift/thing.ts": `import { Blueprint } from "orthograph";
export const Shift = Blueprint.thing({ description: "A shift.", code: "SH", fields: { id: Blueprint.id("shf"), lead: Blueprint.id("per") } });
`,
  "blueprint/things/shift/roles.ts": `import { Blueprint } from "orthograph";
import { Shift } from "./thing.ts";
export const lead = Blueprint.role(Shift, { rule: (s, who) => s.lead === who.person });
`,
  "blueprint/things/attendance/thing.ts": `import { Blueprint } from "orthograph";
import { Shift } from "../shift/thing.ts";
export const Attendance = Blueprint.thing({ description: "Someone was there.", code: "AT", fields: { id: Blueprint.id("att"), shift: Blueprint.optional(Shift.fields.id), who: Blueprint.text() } });
`,
  "blueprint/things/attendance/verbs/note.ts": verb("Blueprint.signedIn"),
  "blueprint/things/attendance/verbs/lead-note.ts": verb("lead"),
  "blueprint/things/attendance/verbs/mixed-note.ts": verb("Blueprint.signedIn, lead"),
  "blueprint/things/attendance/verbs/lead-first-note.ts": verb("lead, Blueprint.signedIn"),
  "blueprint/things/attendance/verbs/via-open-note.ts": verb(`lead, Blueprint.signedIn.via("session")`),
  "blueprint/things/attendance/verbs/of-note.ts": verb(`lead.of("shift")`),
  "blueprint/things/attendance/verbs/via-note.ts": verb(`lead.via("session")`),
  "blueprint/things/attendance/verbs/at-note.ts": verb("Blueprint.signedIn", "at"),
  "blueprint/things/attendance/verbs/at-lead-note.ts": verb("lead", "at"),
});

type Op = { readonly payload: Record<string, { readonly optional?: boolean }>; readonly notFound?: Record<string, string>; readonly refusals: ReadonlyArray<string> };
const operations = async (): Promise<Record<string, Op>> => {
  const exit = await Effect.runPromiseExit(Effect.provide(Compiler.model, nodeSource(root())));
  if (Exit.isFailure(exit)) throw new Error(`the blueprint did not load: ${JSON.stringify(exit.cause)}`);
  return (exit.value as unknown as { readonly operations: Record<string, Op> }).operations;
};

describe("An optional reference in an operation's payload", () => {
  it("is kept optional, and a miss no role check reads is refused <Thing>NotFound", async () => {
    const note = (await operations())["attendance.note"]!;
    expect(note.payload["shift"]?.optional, "the field may be left out").toBe(true);
    expect(note.payload["who"]?.optional ?? false, "the control: a required field").toBe(false);
    expect(note.notFound).toEqual({ shift: "ShiftNotFound" });
    expect([...note.refusals].sort()).toEqual(["NotAllowed", "ShiftNotFound"]);
  });

  it("a miss a role check reads stays NotAllowed, as for a required reference: the role, .of it and .via it", async () => {
    const ops = await operations();
    for (const name of ["attendance.lead-note", "attendance.of-note", "attendance.via-note"]) {
      const op = ops[name]!;
      expect(op.payload["shift"]?.optional, name).toBe(true);
      expect(op.notFound ?? {}, name).toEqual({});
      expect(op.refusals, name).toEqual(["NotAllowed"]);
    }
  });

  it("a miss that some way in reads without a role check is still refused <Thing>NotFound", async () => {
    const ops = await operations();
    // The open way in first, last, and narrowed: a narrowed way in is still a way in.
    for (const name of ["attendance.mixed-note", "attendance.lead-first-note", "attendance.via-open-note"]) {
      const op = ops[name]!;
      expect(op.notFound, name).toEqual({ shift: "ShiftNotFound" });
      expect([...op.refusals].sort(), name).toEqual(["NotAllowed", "ShiftNotFound"]);
    }
  });

  it("is keyed by the payload's own name for the field, not the thing's", async () => {
    const at = (await operations())["attendance.at-note"]!;
    expect(at.payload["at"]?.optional).toBe(true);
    expect(at.notFound).toEqual({ at: "ShiftNotFound" });
    const atLead = (await operations())["attendance.at-lead-note"]!;
    expect(atLead.notFound ?? {}, "the role reads it under that name too").toEqual({});
    expect(atLead.refusals).toEqual(["NotAllowed"]);
  });
});
