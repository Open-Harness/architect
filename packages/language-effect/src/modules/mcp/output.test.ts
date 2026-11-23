// M1.37 / M1.42: a tool's output schema is judged the way an MCP client judges it, with the SDK's own validator: a real answer and a real
// refusal both pass, a wrong one does not, and an answer field named like a refusal's (`status`) is the answer's own.
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker";
import { describe, expect, it } from "vitest";
import { Blueprint } from "orthograph";
import { outputSchema } from "./internal/output.ts";

const validator = new CfWorkerJsonSchemaValidator();
const valid = (schema: object, data: unknown) => validator.getValidator(schema as never)(data).valid;

const Thing = Blueprint.thing({ description: "A thing.", fields: { id: Blueprint.id("thg") } });
const health = Blueprint.operation(Thing, { description: "Say ok.", payload: {}, answer: { status: Blueprint.text({ max: 8 }) }, allowed: [Blueprint.signedIn] });
const move = Blueprint.operation(Thing, {
  description: "Move it.", payload: {}, allowed: [Blueprint.signedIn],
  answer: { thing: Thing.fields.id, state: Blueprint.text({ max: 12 }), pin: Blueprint.visibility.secret(Blueprint.text({ max: 8 })), note: Blueprint.described(Blueprint.text({ max: 8 }), "A note.") },
});
const refused = { refusal: "NotAllowed", code: "AR-001", exit: 5, status: 403 };

describe("a tool's output schema", () => {
  it("is an object with the answer's shape or a refusal's, each with its own properties", () => {
    const schema = outputSchema(health)!;
    expect(schema["type"]).toBe("object");
    const [answer, refusal] = schema["anyOf"] as ReadonlyArray<{ properties: Record<string, { type?: string }>; required: ReadonlyArray<string> }>;
    expect(answer!.properties["status"]).not.toEqual(refusal!.properties["status"]);
    expect(refusal!.required).toEqual(["refusal", "code", "exit", "status"]);
  });

  it("accepts an answer with a field named `status` that is text, and a refusal with the integer one", () => {
    const schema = outputSchema(health)!;
    expect(valid(schema, { status: "ok" })).toBe(true);
    expect(valid(schema, refused)).toBe(true);
    expect(valid(schema, { status: 7 })).toBe(false);
    expect(valid(schema, {})).toBe(false);
  });

  it("accepts a refusal with its own fields, and refuses an answer that lacks a required field", () => {
    const schema = outputSchema(move, {}, ["a", "b"])!;
    expect(valid(schema, { ...refused, left: "7" })).toBe(true);
    expect(valid(schema, { state: "a" })).toBe(false);
  });

  it("types `state` as the thing's states, names no secret, and carries a field's description", () => {
    const schema = outputSchema(move, {}, ["a", "b"])!;
    const [answer] = schema["anyOf"] as ReadonlyArray<{ properties: Record<string, { enum?: ReadonlyArray<string>; description?: string }> }>;
    expect(answer!.properties["state"]!.enum).toEqual(["a", "b"]);
    expect(Object.keys(answer!.properties)).not.toContain("pin");
    expect(answer!.properties["note"]!.description).toBe("A note.");
    expect(valid(schema, { thing: "thg_1", state: "a", note: "x" })).toBe(true);
    expect(valid(schema, { thing: "thg_1", state: "c", note: "x" })).toBe(false);
  });

  it("is absent when the answer has no fields", () => {
    expect(outputSchema({ answer: {}, kind: "operation" })).toBeUndefined();
  });
});
