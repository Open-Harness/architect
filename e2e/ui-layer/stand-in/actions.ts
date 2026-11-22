// STANDS IN FOR GENERATED OUTPUT. Slice 3 of Goal 5 makes `generated/actions/<thing>/<verb>.ts`; until it does, these four
// modules are hand-written in the exact shape K29 section 3.1 draws (`options(host)` in agent-native's field names, `run` a
// single `host.call`), against a stand-in SDK that makes real HTTP calls to the Worker of `./worker.ts`.
// "A note" is the stand-in's own thing: a room holds notes, an editor adds and removes them, anyone else is refused.
import { Data, Effect, Schema } from "effect";
import { NotAllowed } from "orthograph";
import type { ActionContext, ActionHost, ActionOptions, ActionsModule } from "../contract.ts";

export const Payloads = {
  noteAdd: Schema.Struct({ room: Schema.String, text: Schema.String, tag: Schema.optionalKey(Schema.String) }),
  noteRemove: Schema.Struct({ room: Schema.String, noteId: Schema.String }),
  noteList: Schema.Struct({ room: Schema.String }),
  noteExport: Schema.Struct({ room: Schema.String, format: Schema.Literals(["csv", "json"]) }),
} as const;
export type NoteAddPayload = typeof Payloads.noteAdd.Type;
export type NoteRemovePayload = typeof Payloads.noteRemove.Type;
export type NoteListPayload = typeof Payloads.noteList.Type;
export type NoteExportPayload = typeof Payloads.noteExport.Type;

/** A declared refusal of the stand-in SDK, shaped as signup's are: a tag, a `code` and its own fields. */
export class RoomFull extends Data.TaggedError("RoomFull")<{ readonly code: string; readonly remaining: number }> {}

type Answer = { readonly ok: boolean; readonly count?: number; readonly notes?: ReadonlyArray<string> };

/** The stand-in SDK: one method per operation, each an Effect that POSTs to the Worker as `role`. */
export const makeClient = (url: string, role: string, requestKey: string | undefined) => {
  const post = <P>(path: string, payload: P): Effect.Effect<Answer, NotAllowed | RoomFull | Error> =>
    Effect.tryPromise({
      try: async () => {
        const res = await fetch(`${url}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-role": role, ...(requestKey === undefined ? {} : { "x-request-key": requestKey }) },
          body: JSON.stringify(payload),
        });
        return { status: res.status, body: (await res.json()) as Record<string, unknown> };
      },
      catch: (cause) => (cause instanceof Error ? cause : new Error(String(cause))),
    }).pipe(
      Effect.flatMap(({ status, body }) => {
        if (status === 200) return Effect.succeed(body as Answer);
        if (body._tag === "NotAllowed") return Effect.fail(new NotAllowed());
        if (body._tag === "RoomFull") return Effect.fail(new RoomFull({ code: String(body.code), remaining: Number(body.remaining) }));
        return Effect.fail(new Error(String(body.message ?? `status ${status}`)));
      }),
    );
  return {
    note: {
      add: (a: { readonly payload: NoteAddPayload }) => post("/notes/add", a.payload),
      remove: (a: { readonly payload: NoteRemovePayload }) => post("/notes/remove", a.payload),
      list: (a: { readonly payload: NoteListPayload }) => post("/notes/list", a.payload),
      export: (a: { readonly payload: NoteExportPayload }) => post("/notes/export", a.payload),
    },
  };
};
export type Client = ReturnType<typeof makeClient>;

/** A host: the SDK as `role`, the request key from the tool call's id, and refusals typed by the module under test. */
export const makeHost = (actions: ActionsModule, url: string, role: string): ActionHost<Client> => {
  const requestKey = (ctx?: ActionContext) => (ctx?.toolCallId === undefined ? undefined : `tool:${ctx.toolCallId}`);
  return { requestKey, call: (use, ctx) => actions.runForAction(use(makeClient(url, role, requestKey(ctx))), ctx) };
};

// Generated from blueprint/things/note/verbs/add.ts. Do not edit.  (a stand-in: written by hand in this shape)
export const noteAdd = (host: ActionHost<Client>): ActionOptions<NoteAddPayload, Answer> => ({
  name: "note.add",
  description: "Add a note to a room.",
  schema: Payloads.noteAdd,
  readOnly: false,
  needsApproval: false,
  agentTool: true,
  errors: { RoomFull: "NT-001", NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.note.add({ payload: args }), ctx),
});

// Generated from blueprint/things/note/verbs/remove.ts. Do not edit.  (a stand-in; `needsApproval` is declared)
export const noteRemove = (host: ActionHost<Client>): ActionOptions<NoteRemovePayload, Answer> => ({
  name: "note.remove",
  description: "Remove a note for good.",
  schema: Payloads.noteRemove,
  readOnly: false,
  needsApproval: true,
  agentTool: true,
  errors: { NotAllowed: "AR-001", IdempotencyConflict: "AR-002" },
  run: (args, ctx) => host.call((client) => client.note.remove({ payload: args }), ctx),
});

// Generated from blueprint/things/note/reads/list.ts. Do not edit.  (a stand-in)
export const noteList = (host: ActionHost<Client>): ActionOptions<NoteListPayload, Answer> => ({
  name: "note.list",
  description: "List the notes in a room.",
  schema: Payloads.noteList,
  readOnly: true,
  needsApproval: false,
  agentTool: true,
  errors: { NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.note.list({ payload: args }), ctx),
});

// Generated from blueprint/things/note/verbs/export.ts. Do not edit.  (a stand-in whose Worker always fails with a defect)
export const noteExport = (host: ActionHost<Client>): ActionOptions<NoteExportPayload, Answer> => ({
  name: "note.export",
  description: "Export a room's notes.",
  schema: Payloads.noteExport,
  readOnly: false,
  needsApproval: false,
  agentTool: false,
  errors: { NotAllowed: "AR-001" },
  run: (args, ctx) => host.call((client) => client.note.export({ payload: args }), ctx),
});

/** Every stand-in action's options, in the order a generator would list them. */
export const allOptions = (host: ActionHost<Client>): ReadonlyArray<ActionOptions<any, Answer>> => [noteAdd(host), noteRemove(host), noteList(host), noteExport(host)];
