// M1.35 review, P1: the SDK and the CLI reach `Device.serve` directly, so the one visibility rule applies on that path too.
// A device has no roles to hold, so its caller is a stranger to every private field, and a secret that was not issued never leaves.
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { Device } from "./service.ts";
import type { Handler } from "./types.ts";

const Org = Blueprint.thing({ description: "A group.", fields: { id: Blueprint.id("org") } });
const owner = Blueprint.role(Org, { rule: () => true });
const Note = Blueprint.thing({
  description: "A note kept on the device.",
  fields: {
    id: Blueprint.id("nte"),
    label: Blueprint.text({ max: 40 }),
    body: Blueprint.visibility.private(Blueprint.text({ max: 40 }), owner),
    pin: Blueprint.visibility.secret(Blueprint.text({ max: 40 })),
    key: Blueprint.issued(Blueprint.visibility.secret(Blueprint.text({ max: 40 }))),
  },
});
const keep = Blueprint.operation(Note, {
  description: "Keep a note on this device.",
  payload: { label: Note.fields.label },
  answer: { label: Note.fields.label, body: Note.fields.body, pin: Note.fields.pin, key: Note.fields.key },
  allowed: [Blueprint.anyone],
  steps: { write: Blueprint.step.wait() },
  runs: "client",
});
const handler: Handler<typeof keep> = ({ label }, { steps }) =>
  steps.write(Effect.succeed({ label, body: "BODY-private", pin: "PIN-secret", key: "KEY-issued" }));

describe("Device.serve cuts its answer by the same rule as the server", () => {
  it("a caller on a device is shown the public field and the secret the call issued, and no private or other secret field", async () => {
    const served = Device.serve({ name: "note.keep", operation: keep, handler });
    const answer = await Effect.runPromise(served.run({ label: "groceries" }, { otlp: undefined, service: "test" }));
    expect(Object.keys(answer as object).sort(), "the keys of the answer the SDK and the CLI are handed").toEqual(["key", "label"]);
  });
});
