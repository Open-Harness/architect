// What slice 5's blueprint must contain, as data: each thing, state, move, field, operation, event and error that
// `design/goals/17-superagent.md` and its records name, one object per plugin and one for the app. Every entry cites
// the section it was taken from; nothing here is read from a generated file or from the build. A name that two
// documents spell differently is NOT in these lists: it is in CONFLICTS, and no check judges it until the design
// settles it (the checks author reports each one).
//
// Names are as the model prints them: a thing is its kebab-case folder (`outgoing-message`), an operation is
// `<thing>.<verb>` with the verb in kebab case (`go-live`, `request-status`), the way acme's `person.sign-up` is.

export interface Move { readonly from: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits?: string }
export interface ThingNames {
  /** The states of its machine, exactly (omitted: the design names none). */
  readonly states?: ReadonlyArray<string>;
  /** Moves the design spells out; the model must have each, with `from` and `to` as written (`from` omitted: a record contradicts itself). */
  readonly moves?: Readonly<Record<string, { readonly from?: ReadonlyArray<string>; readonly to: ReadonlyArray<string>; readonly emits?: string }>>;
  /** Fields the design names, each of which the thing must have (more are allowed). */
  readonly fields?: ReadonlyArray<string>;
  /** The thing's own operations and reads, verbs only. */
  readonly ops: ReadonlyArray<string>;
}
export interface EventNames { readonly thing: string; readonly fields?: ReadonlyArray<string> }
export interface PluginNames {
  readonly package: string;
  readonly things: Readonly<Record<string, ThingNames>>;
  /** Operations the plugin brings that sit on another plugin's thing, as full names. */
  readonly extraOps?: ReadonlyArray<string>;
  /** Event class name -> where it is declared, and the fields the design lists for it. */
  readonly events: Readonly<Record<string, EventNames>>;
  /** Error classes the design names for this plugin, each of which the model must refuse with. */
  readonly errors: ReadonlyArray<string>;
}

// ---- @orthograph/superagent ------------------------------------------------------------------------------------
export const superagent: PluginNames = {
  package: "@orthograph/superagent",
  things: {
    // 17-superagent.md "A superagent" (fields, machine), GOAL17-pause "What the blueprint declares" (pausedAt, pausedFor, passGen),
    // "The folder structure" (verbs/{create,update,go-live,pause,resume,retire}.ts), GOAL17-derived-reads (health), "Where it
    // stands" (boot joins the Superagent's operations).
    superagent: {
      states: ["observing", "live", "paused", "retired"],
      moves: {
        create: { from: [], to: ["observing"], emits: "SuperagentCreated" },
        goLive: { from: ["observing"], to: ["live"] },
        pause: { from: ["observing", "live"], to: ["paused"], emits: "SuperagentPaused" },
        resume: { from: ["paused"], to: ["observing", "live"], emits: "SuperagentResumed" },
        retire: { from: ["observing", "live", "paused"], to: ["retired"] },
      },
      fields: ["id", "name", "purpose", "connections", "playbook", "slots", "main", "pausedFrom", "pausedAt", "pausedFor", "passGen"],
      ops: ["create", "update", "go-live", "pause", "resume", "retire", "health", "boot"],
    },
    // "The spec, translated", Proposal row; "A superagent" (a main agent's change records one); GOAL17-derived-reads "Proposals, named".
    proposal: { states: ["waiting", "approved", "rejected"], ops: ["approve", "reject", "waiting"] },
  },
  events: {
    SuperagentCreated: { thing: "superagent" },
    // GOAL17-pause "What the blueprint declares"
    SuperagentPaused: { thing: "superagent", fields: ["superagent", "from", "at"] },
    SuperagentResumed: { thing: "superagent", fields: ["superagent", "to", "at", "length"] },
  },
  // GOAL17-executor-slots "The declaration a blueprint writes": superagent.create and update refuse 0 and 255 (SlotsOutOfRange)
  errors: ["SlotsOutOfRange"],
};

// ---- @orthograph/intake -----------------------------------------------------------------------------------------
export const intake: PluginNames = {
  package: "@orthograph/intake",
  things: {
    // "The spec, translated": Source row (states, failures, failAfter; save/enable/disable/positionAdvanced/problem)
    source: { states: ["setup", "ready", "paused", "error", "off"], fields: ["failures", "failAfter"], ops: ["save", "enable", "disable", "position-advanced", "problem"] },
    // Account row; GOAL17-source-from "Account (K40 fix 1) is resolved from it": keyed by (superagent, source, id)
    account: { states: ["seen", "listed", "unlisted"], fields: ["superagent", "source", "id", "login", "bot"], ops: ["seen", "list", "unlist", "sync"] },
    // Trigger row: never changed, so no machine; receive, requeue, reevaluate
    trigger: { ops: ["receive", "requeue", "reevaluate"] },
    thread: { states: ["idle", "queued", "evaluating"], ops: ["bind", "closed", "unsubscribe"] },
    correlation: { ops: [] },
    // Eval row (states) and GOAL17-pause (activeAtStart, timeoutMs). `due` is GOAL17-names call 1.
    eval: { states: ["queued", "delivered", "decided", "unavailable"], fields: ["activeAtStart", "timeoutMs"], ops: ["due", "delivered", "context", "read", "decide"] },
    decision: { ops: ["route", "dismiss"] },
    // Policy row: a thing with versions; K40 fix 2 (save, get, history, restore) plus sync
    policy: { ops: ["save", "get", "history", "restore", "sync"] },
  },
  events: {
    // "Its events"; GOAL17-pause "What is recorded" (EvalDelivered { superagent, eval })
    TriggerReceived: { thing: "trigger" },
    TriggerRequeued: { thing: "trigger" },
    EvalStarted: { thing: "eval" },
    EvalDelivered: { thing: "eval", fields: ["superagent", "eval"] },
    DecisionRecorded: { thing: "decision" },
    PolicyChanged: { thing: "policy" },
  },
  // K40 fix 2: `policy.save` answers StaleRevision { current }
  errors: ["StaleRevision"],
};

// ---- @orthograph/tickets ----------------------------------------------------------------------------------------
export const tickets: PluginNames = {
  package: "@orthograph/tickets",
  things: {
    mandate: { states: ["held", "withdrawn", "revoked"], ops: ["revalidate"] },
    // Ticket row (open → ended → open, stopped; seq); GOAL17-derived-reads (stage, waiting); K40 fix 3 (agent)
    ticket: {
      states: ["open", "ended", "stopped"],
      fields: ["superagent", "agent", "seq"],
      ops: ["accept", "attach", "note", "request-status", "stop", "retry", "end", "resume", "policy-changed", "report", "ack", "stage", "waiting"],
    },
    subscription: { ops: [] },
    // GOAL17-executor-slots "The declaration a blueprint writes". The operations are its moves (GOAL17-names call 2).
    assignment: {
      states: ["pending", "running", "closing", "ended"],
      moves: {
        queued: { from: [], to: ["pending"], emits: "AssignmentQueued" },
        promoted: { from: ["pending"], to: ["pending"], emits: "AssignmentPromoted" },
        started: { from: ["pending"], to: ["running"], emits: "AssignmentStarted" },
        cancelled: { from: ["pending"], to: ["ended"], emits: "AssignmentEnded" },
        interrupted: { from: ["running"], to: ["closing"], emits: "AssignmentInterrupted" },   // GOAL17-names call 4: running only; a pending one is cancelled
        turnEnded: { from: ["running", "closing"], to: ["ended"], emits: "AssignmentEnded" },
      },
      fields: ["id", "superagent", "ticket", "agent", "input", "why", "seat"],
      ops: ["queued", "promoted", "started", "cancelled", "interrupted", "turn-ended", "waiting"],   // GOAL17-names calls 2 and 3
    },
    // Input row; GOAL17-executor-slots section 5 (the moves) and "How an executor's input reaches the pool" (retryAt, refusals)
    input: {
      states: ["waiting", "routed", "delivered", "failed"],
      moves: {
        routed: { from: ["waiting"], to: ["routed"], emits: "InputRouted" },
        requeued: { from: ["routed", "failed"], to: ["waiting"], emits: "InputStored" },
        delivered: { from: ["routed"], to: ["delivered"], emits: "InputDelivered" },
        failed: { from: ["routed"], to: ["failed"], emits: "InputFailed" },
      },
      fields: ["seq", "retryAt", "refusals"],
      ops: ["store", "route", "requeue", "delivered", "read", "delivery-failed"],
    },
    report: { states: ["progress", "waiting", "ready", "blocked", "failed", "dropped"], fields: ["seq"], ops: [] },
    attention: { states: ["open"], ops: [] },
    // Outgoing message row; GOAL17-derived-reads (failures, notBefore, retry)
    "outgoing-message": { states: ["pending", "sent", "dropped"], fields: ["failures", "notBefore"], ops: ["reply", "withdraw", "send", "retry"] },
  },
  // Operations the plugin brings on another thing: the Report row's `trigger.handback`, the Subscription row's `thread.follow` and `thread.unrelated`
  extraOps: ["trigger.handback", "thread.follow", "thread.unrelated"],
  events: {
    TicketCreated: { thing: "ticket" },
    TicketResumed: { thing: "ticket" },
    TicketEnded: { thing: "ticket" },
    // GOAL17-executor-slots section 8, "The events recorded"
    InputStored: { thing: "input", fields: ["superagent", "input", "ticket"] },
    InputRouted: { thing: "input", fields: ["superagent", "input", "ticket", "agent", "assignment", "text"] },
    InputDelivered: { thing: "input" },
    InputFailed: { thing: "input" },
    AssignmentQueued: { thing: "assignment", fields: ["superagent", "assignment", "ticket", "input", "why"] },
    AssignmentStarted: { thing: "assignment", fields: ["superagent", "assignment", "ticket", "agent", "input", "text", "seat", "why"] },
    AssignmentEnded: { thing: "assignment", fields: ["superagent", "assignment", "ticket", "seat"] },
    AssignmentInterrupted: { thing: "assignment", fields: ["superagent", "assignment", "ticket", "agent", "seat"] },
    AssignmentPromoted: { thing: "assignment", fields: ["superagent", "assignment", "ticket"] },
    // GOAL17-pause "What is recorded"
    ReplyQueued: { thing: "outgoing-message", fields: ["superagent", "ticket", "message"] },
  },
  errors: ["NoSeat", "SeatTaken", "ExecutorAlreadyQueued"],
};

// ---- @orthograph/prompts ----------------------------------------------------------------------------------------
export const prompts: PluginNames = {
  package: "@orthograph/prompts",
  // "The folder structure": prompt-set/verbs/{save,preview,history,compose}.ts; the PromptSet row: a thing with versions
  things: { "prompt-set": { ops: ["save", "preview", "history", "compose"] } },
  events: {},
  errors: [],
};

// ---- @orthograph/agents (K40 fix 3), mounted by the app ---------------------------------------------------------
export const agents: PluginNames = {
  package: "@orthograph/agents",
  things: {
    // K40 fix 3: `Agent` is a thing (id agt, kind, about), idle ⇄ working and stopped, living in its actor; `agent.tell`;
    // GOAL17-executor-slots section 5: `agent.close`
    agent: { states: ["idle", "working", "stopped"], fields: ["id", "kind", "about"], ops: ["tell", "close"] },
  },
  events: {
    AgentIdled: { thing: "agent", fields: ["agent", "about", "assignment"] },
    AgentClosed: { thing: "agent", fields: ["agent", "assignment"] },
  },
  errors: ["StaleAssignment"],
};

// ---- the app: examples/superagent --------------------------------------------------------------------------------
export const app = {
  // "The folder structure": blueprint/features/{superagent,intake,tickets,prompts,agents}.ts and blueprint/adapters/{github,slack,posthog}.ts
  features: ["superagent", "intake", "tickets", "prompts", "agents"],
  adapters: ["github", "slack", "posthog"],
  environments: ["local", "test"],
  // "The folder structure": things/settings/{thing,machine}.ts, verbs/save.ts; the Settings row: a thing with versions
  settingsOps: ["save"],
  // GOAL17-executor-slots section 4: `fill` is declared by the app (examples/superagent/blueprint/features/seats.ts), and so is `reap`
  seatOps: ["superagent.fill", "superagent.reap"],
} as const;

/** The six plugins and the app's own operations, for the checks that go over everything. */
export const PLUGINS = { superagent, intake, tickets, prompts, agents } as const;

// ---- what no check judges yet -------------------------------------------------------------------------------------
// Empty since GOAL17-names (23 November 2026) settled the six the checks author found; a new one goes here, and no check judges it.
export const CONFLICTS: ReadonlyArray<string> = [];
