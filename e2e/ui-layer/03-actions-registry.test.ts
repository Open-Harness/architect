// Check 03 (M1.23): the registry. `list` returns every registered action, once, in the order registered, with its flags as declared and a
// non-empty JSON input schema naming exactly its payload's fields: optional fields advertised as accepted, a literal union as its values, a
// nullable field as nullable (spike traps 1 and 2). The registry holds its own copy and refuses two actions of one name; `get` returns the
// wrapped action, so a registry's calls wait for a yes where one is declared. The stand-in actions and the contract are check 01's.
//
// Red today because `orthograph/actions` does not exist.
import { describe, expect, it } from "vitest";
import { type Action, type ActionsModule } from "./contract.ts";
import { allOptions } from "./stand-in/actions.ts";
import { REMOVE, rig, useWorker } from "./support.ts";

const w = useWorker();

describe("03 M1.23: the registry lists every action", () => {
  describe("the registry lists every action with its input schema", () => {
    const registry = async (role: "editor" | "viewer" = "editor") => {
      const r = await rig(w.current, role);
      const all = allOptions(r.host).map((o) => r.actions.defineAction(o, r.approver)) as ReadonlyArray<Action<any, any>>;
      return { ...r, all, registry: r.actions.Actions.registry(all) };
    };
    const byName = (listed: ReturnType<ActionsModule["Actions"]["registry"]>["list"]) => new Map(listed().map((a) => [a.name, a]));

    it("list returns every registered action once, and no other, in the order they were registered", async () => {
      const { registry: reg } = await registry();
      expect(reg.list().map((a) => a.name)).toEqual(["note.add", "note.remove", "note.list", "note.export"]);
    });

    it("the registry holds its own copy: changing the array it was given afterwards changes nothing it lists", async () => {
      const { all, actions } = await registry();
      const given = [...all];
      const reg = actions.Actions.registry(given);
      given.length = 0;
      expect(reg.list().map((a) => a.name)).toEqual(["note.add", "note.remove", "note.list", "note.export"]);
      expect(reg.get("note.add")).toBeDefined();
    });

    it("two actions of one name cannot be registered: the registry refuses", async () => {
      const { all, actions } = await registry();
      expect(() => actions.Actions.registry([...all, all[0]!])).toThrow();
    });

    it("each listed action carries its description and its flags as declared", async () => {
      const { registry: reg } = await registry();
      const listed = byName(reg.list);
      const flags = (name: string) => {
        const a = listed.get(name);
        return a && [a.description, a.readOnly, a.needsApproval, a.agentTool];
      };
      expect(flags("note.add")).toEqual(["Add a note to a room.", false, false, true]);
      expect(flags("note.remove")).toEqual(["Remove a note for good.", false, true, true]);
      expect(flags("note.list")).toEqual(["List the notes in a room.", true, false, true]);
      expect(flags("note.export")).toEqual(["Export a room's notes.", false, false, false]);
    });

    it("each input schema is a non-empty JSON object schema naming exactly the payload's fields, and exactly its required ones", async () => {
      const { registry: reg } = await registry();
      const listed = byName(reg.list);
      const shape = (name: string) => {
        const schema = listed.get(name)?.inputSchema;
        return schema && [schema.type, Object.keys(schema.properties ?? {}).sort(), [...(schema.required ?? [])].sort()];
      };
      expect(shape("note.add")).toEqual(["object", ["due", "room", "tag", "text"], ["room", "text"]]);
      expect(shape("note.remove")).toEqual(["object", ["noteId", "room"], ["noteId", "room"]]);
      expect(shape("note.list")).toEqual(["object", ["room"], ["room"]]);
      expect(shape("note.export")).toEqual(["object", ["format", "room"], ["format", "room"]]);
      for (const a of reg.list()) expect(Object.keys(a.inputSchema.properties ?? {}).length).toBeGreaterThan(0);
    });

    it("a field of a kind advertises its kind: strings as string, a literal union as its values", async () => {
      const { registry: reg } = await registry();
      const listed = byName(reg.list);
      expect(listed.get("note.add")?.inputSchema.properties?.room).toMatchObject({ type: "string" });
      expect(listed.get("note.export")?.inputSchema.properties?.format).toMatchObject({ type: "string", enum: ["csv", "json"] });
    });

    it("an optional field is advertised as what it accepts: a string, not required, never null", async () => {
      const { registry: reg } = await registry();
      const schema = byName(reg.list).get("note.add")?.inputSchema;
      expect(schema?.required).not.toContain("tag");
      expect(schema?.properties?.tag?.type).toBe("string");
      expect(schema?.properties?.tag?.anyOf).toBeUndefined();
      expect(JSON.stringify(schema?.properties?.tag)).not.toContain("null");
    });

    it("a nullable optional field is advertised as what it accepts: a string or null, and still not required", async () => {
      const { registry: reg } = await registry();
      const schema = byName(reg.list).get("note.add")?.inputSchema;
      expect(schema?.required).not.toContain("due");
      expect(JSON.stringify(schema?.properties?.due)).toContain("null");
      expect(JSON.stringify(schema?.properties?.due)).toContain("string");
    });

    it("the listing is plain JSON: it survives a round trip through JSON unchanged", async () => {
      const { registry: reg } = await registry();
      expect(JSON.parse(JSON.stringify(reg.list()))).toEqual(reg.list());
    });

    it("get returns the registered action itself, so the registry's calls wait for a yes where one is declared", async () => {
      const { registry: reg, asked } = await registry();
      expect(reg.get("note.nothing")).toBeUndefined();
      await reg.get("note.remove")?.run(REMOVE);
      await reg.get("note.list")?.run({ room: "kitchen" });
      expect(asked.map((a) => a.action)).toEqual(["note.remove"]);
      expect(w.current.writes.map((write) => write.path)).toEqual(["/notes/remove"]);
    });
  });
});
