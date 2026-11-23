// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Account from "@orthograph/intake/blueprint/things/account/errors.js";
import * as Agent from "@orthograph/agents/blueprint/things/agent/errors.js";
import * as Assignment from "@orthograph/tickets/blueprint/things/assignment/errors.js";
import * as Subscription from "@orthograph/tickets/blueprint/things/subscription/errors.js";
import * as Superagent from "@orthograph/superagent/blueprint/things/superagent/errors.js";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  AccountExists: { code: "AC-001", exit: 82, status: 422 },
  StaleAssignment: { code: "AG-001", exit: 51, status: 422 },
  NoSeat: { code: "AS-001", exit: 95, status: 422 },
  SeatTaken: { code: "AS-002", exit: 96, status: 422 },
  ExecutorAlreadyQueued: { code: "AS-003", exit: 97, status: 422 },
  AlreadyFollowing: { code: "SB-001", exit: 93, status: 422 },
  SlotsOutOfRange: { code: "SU-001", exit: 61, status: 422 },
  StaleRevision: { code: "SU-002", exit: 62, status: 422 },
  AccountNotSeen: { code: "AC-900", exit: 81, status: 409 },
  AgentNotIdle: { code: "AG-900", exit: 50, status: 409 },
  AssignmentNotPending: { code: "AS-900", exit: 94, status: 409 },
  AttentionNotOpen: { code: "AT-900", exit: 100, status: 409 },
  DecisionNotRecorded: { code: "DE-900", exit: 86, status: 409 },
  EvalNotQueued: { code: "EV-900", exit: 85, status: 409 },
  InputNotWaiting: { code: "IN-900", exit: 98, status: 409 },
  MandateNotHeld: { code: "MA-900", exit: 91, status: 409 },
  OutgoingMessageNotPending: { code: "OU-900", exit: 101, status: 409 },
  PolicyNotCurrent: { code: "PO-900", exit: 87, status: 409 },
  ProposalNotWaiting: { code: "PP-900", exit: 70, status: 409 },
  ReportNotProgress: { code: "RE-900", exit: 99, status: 409 },
  SettingsNotCurrent: { code: "SE-900", exit: 40, status: 409 },
  SourceNotSetup: { code: "SO-900", exit: 80, status: 409 },
  SubscriptionNotLive: { code: "SB-900", exit: 92, status: 409 },
  SuperagentNotObserving: { code: "SU-900", exit: 60, status: 409 },
  ThreadNotIdle: { code: "TH-900", exit: 84, status: 409 },
  TicketNotOpen: { code: "TI-900", exit: 90, status: 409 },
  TriggerNotStored: { code: "TR-900", exit: 83, status: 409 },
  AccountNotFound: { code: "AC-901", exit: 4, status: 404 },
  AgentNotFound: { code: "AG-901", exit: 4, status: 404 },
  AssignmentNotFound: { code: "AS-901", exit: 4, status: 404 },
  DecisionNotFound: { code: "DE-901", exit: 4, status: 404 },
  EvalNotFound: { code: "EV-901", exit: 4, status: 404 },
  InputNotFound: { code: "IN-901", exit: 4, status: 404 },
  OutgoingMessageNotFound: { code: "OU-901", exit: 4, status: 404 },
  ProposalNotFound: { code: "PP-901", exit: 4, status: 404 },
  SourceNotFound: { code: "SO-901", exit: 4, status: 404 },
  SuperagentNotFound: { code: "SU-901", exit: 4, status: 404 },
  ThreadNotFound: { code: "TH-901", exit: 4, status: 404 },
  TicketNotFound: { code: "TI-901", exit: 4, status: 404 },
  TriggerNotFound: { code: "TR-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
  ReadNotServed: { code: "AR-008", exit: 121, status: 501 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Account.AccountExists, "AccountExists");
export class AccountExists extends Schema.TaggedError<AccountExists>()("AccountExists", { code: Schema.Literal(refusals.AccountExists.code), ...wireStruct(Account.AccountExists.fields).fields }, { httpApiStatus: refusals.AccountExists.status }) { static readonly code = refusals.AccountExists.code; }
ErrorNames.name(Agent.StaleAssignment, "StaleAssignment");
export class StaleAssignment extends Schema.TaggedError<StaleAssignment>()("StaleAssignment", { code: Schema.Literal(refusals.StaleAssignment.code), ...wireStruct(Agent.StaleAssignment.fields).fields }, { httpApiStatus: refusals.StaleAssignment.status }) { static readonly code = refusals.StaleAssignment.code; }
ErrorNames.name(Assignment.NoSeat, "NoSeat");
export class NoSeat extends Schema.TaggedError<NoSeat>()("NoSeat", { code: Schema.Literal(refusals.NoSeat.code), ...wireStruct(Assignment.NoSeat.fields).fields }, { httpApiStatus: refusals.NoSeat.status }) { static readonly code = refusals.NoSeat.code; }
ErrorNames.name(Assignment.SeatTaken, "SeatTaken");
export class SeatTaken extends Schema.TaggedError<SeatTaken>()("SeatTaken", { code: Schema.Literal(refusals.SeatTaken.code), ...wireStruct(Assignment.SeatTaken.fields).fields }, { httpApiStatus: refusals.SeatTaken.status }) { static readonly code = refusals.SeatTaken.code; }
ErrorNames.name(Assignment.ExecutorAlreadyQueued, "ExecutorAlreadyQueued");
export class ExecutorAlreadyQueued extends Schema.TaggedError<ExecutorAlreadyQueued>()("ExecutorAlreadyQueued", { code: Schema.Literal(refusals.ExecutorAlreadyQueued.code), ...wireStruct(Assignment.ExecutorAlreadyQueued.fields).fields }, { httpApiStatus: refusals.ExecutorAlreadyQueued.status }) { static readonly code = refusals.ExecutorAlreadyQueued.code; }
ErrorNames.name(Subscription.AlreadyFollowing, "AlreadyFollowing");
export class AlreadyFollowing extends Schema.TaggedError<AlreadyFollowing>()("AlreadyFollowing", { code: Schema.Literal(refusals.AlreadyFollowing.code), ...wireStruct(Subscription.AlreadyFollowing.fields).fields }, { httpApiStatus: refusals.AlreadyFollowing.status }) { static readonly code = refusals.AlreadyFollowing.code; }
ErrorNames.name(Superagent.SlotsOutOfRange, "SlotsOutOfRange");
export class SlotsOutOfRange extends Schema.TaggedError<SlotsOutOfRange>()("SlotsOutOfRange", { code: Schema.Literal(refusals.SlotsOutOfRange.code), ...wireStruct(Superagent.SlotsOutOfRange.fields).fields }, { httpApiStatus: refusals.SlotsOutOfRange.status }) { static readonly code = refusals.SlotsOutOfRange.code; }
ErrorNames.name(Superagent.StaleRevision, "StaleRevision");
export class StaleRevision extends Schema.TaggedError<StaleRevision>()("StaleRevision", { code: Schema.Literal(refusals.StaleRevision.code), ...wireStruct(Superagent.StaleRevision.fields).fields }, { httpApiStatus: refusals.StaleRevision.status }) { static readonly code = refusals.StaleRevision.code; }
export class AccountNotSeen extends Schema.TaggedError<AccountNotSeen>()("AccountNotSeen", { code: Schema.Literal(refusals.AccountNotSeen.code), ...{ state: Schema.Literals(["seen", "listed", "unlisted"]) } }, { httpApiStatus: refusals.AccountNotSeen.status }) { static readonly code = refusals.AccountNotSeen.code; }
export class AgentNotIdle extends Schema.TaggedError<AgentNotIdle>()("AgentNotIdle", { code: Schema.Literal(refusals.AgentNotIdle.code), ...{ state: Schema.Literals(["idle", "working", "stopped"]) } }, { httpApiStatus: refusals.AgentNotIdle.status }) { static readonly code = refusals.AgentNotIdle.code; }
export class AssignmentNotPending extends Schema.TaggedError<AssignmentNotPending>()("AssignmentNotPending", { code: Schema.Literal(refusals.AssignmentNotPending.code), ...{ state: Schema.Literals(["pending", "running", "closing", "ended"]) } }, { httpApiStatus: refusals.AssignmentNotPending.status }) { static readonly code = refusals.AssignmentNotPending.code; }
export class AttentionNotOpen extends Schema.TaggedError<AttentionNotOpen>()("AttentionNotOpen", { code: Schema.Literal(refusals.AttentionNotOpen.code), ...{ state: Schema.Literals(["open"]) } }, { httpApiStatus: refusals.AttentionNotOpen.status }) { static readonly code = refusals.AttentionNotOpen.code; }
export class DecisionNotRecorded extends Schema.TaggedError<DecisionNotRecorded>()("DecisionNotRecorded", { code: Schema.Literal(refusals.DecisionNotRecorded.code), ...{ state: Schema.Literals(["recorded", "dismissed"]) } }, { httpApiStatus: refusals.DecisionNotRecorded.status }) { static readonly code = refusals.DecisionNotRecorded.code; }
export class EvalNotQueued extends Schema.TaggedError<EvalNotQueued>()("EvalNotQueued", { code: Schema.Literal(refusals.EvalNotQueued.code), ...{ state: Schema.Literals(["queued", "delivered", "decided", "unavailable"]) } }, { httpApiStatus: refusals.EvalNotQueued.status }) { static readonly code = refusals.EvalNotQueued.code; }
export class InputNotWaiting extends Schema.TaggedError<InputNotWaiting>()("InputNotWaiting", { code: Schema.Literal(refusals.InputNotWaiting.code), ...{ state: Schema.Literals(["waiting", "routed", "delivered", "failed"]) } }, { httpApiStatus: refusals.InputNotWaiting.status }) { static readonly code = refusals.InputNotWaiting.code; }
export class MandateNotHeld extends Schema.TaggedError<MandateNotHeld>()("MandateNotHeld", { code: Schema.Literal(refusals.MandateNotHeld.code), ...{ state: Schema.Literals(["held", "withdrawn", "revoked"]) } }, { httpApiStatus: refusals.MandateNotHeld.status }) { static readonly code = refusals.MandateNotHeld.code; }
export class OutgoingMessageNotPending extends Schema.TaggedError<OutgoingMessageNotPending>()("OutgoingMessageNotPending", { code: Schema.Literal(refusals.OutgoingMessageNotPending.code), ...{ state: Schema.Literals(["pending", "sent", "dropped"]) } }, { httpApiStatus: refusals.OutgoingMessageNotPending.status }) { static readonly code = refusals.OutgoingMessageNotPending.code; }
export class PolicyNotCurrent extends Schema.TaggedError<PolicyNotCurrent>()("PolicyNotCurrent", { code: Schema.Literal(refusals.PolicyNotCurrent.code), ...{ state: Schema.Literals(["current"]) } }, { httpApiStatus: refusals.PolicyNotCurrent.status }) { static readonly code = refusals.PolicyNotCurrent.code; }
export class ProposalNotWaiting extends Schema.TaggedError<ProposalNotWaiting>()("ProposalNotWaiting", { code: Schema.Literal(refusals.ProposalNotWaiting.code), ...{ state: Schema.Literals(["waiting", "approved", "rejected"]) } }, { httpApiStatus: refusals.ProposalNotWaiting.status }) { static readonly code = refusals.ProposalNotWaiting.code; }
export class ReportNotProgress extends Schema.TaggedError<ReportNotProgress>()("ReportNotProgress", { code: Schema.Literal(refusals.ReportNotProgress.code), ...{ state: Schema.Literals(["progress", "waiting", "ready", "blocked", "failed", "dropped"]) } }, { httpApiStatus: refusals.ReportNotProgress.status }) { static readonly code = refusals.ReportNotProgress.code; }
export class SettingsNotCurrent extends Schema.TaggedError<SettingsNotCurrent>()("SettingsNotCurrent", { code: Schema.Literal(refusals.SettingsNotCurrent.code), ...{ state: Schema.Literals(["current"]) } }, { httpApiStatus: refusals.SettingsNotCurrent.status }) { static readonly code = refusals.SettingsNotCurrent.code; }
export class SourceNotSetup extends Schema.TaggedError<SourceNotSetup>()("SourceNotSetup", { code: Schema.Literal(refusals.SourceNotSetup.code), ...{ state: Schema.Literals(["setup", "ready", "paused", "error", "off"]) } }, { httpApiStatus: refusals.SourceNotSetup.status }) { static readonly code = refusals.SourceNotSetup.code; }
export class SubscriptionNotLive extends Schema.TaggedError<SubscriptionNotLive>()("SubscriptionNotLive", { code: Schema.Literal(refusals.SubscriptionNotLive.code), ...{ state: Schema.Literals(["live", "ended"]) } }, { httpApiStatus: refusals.SubscriptionNotLive.status }) { static readonly code = refusals.SubscriptionNotLive.code; }
export class SuperagentNotObserving extends Schema.TaggedError<SuperagentNotObserving>()("SuperagentNotObserving", { code: Schema.Literal(refusals.SuperagentNotObserving.code), ...{ state: Schema.Literals(["observing", "live", "paused", "retired"]) } }, { httpApiStatus: refusals.SuperagentNotObserving.status }) { static readonly code = refusals.SuperagentNotObserving.code; }
export class ThreadNotIdle extends Schema.TaggedError<ThreadNotIdle>()("ThreadNotIdle", { code: Schema.Literal(refusals.ThreadNotIdle.code), ...{ state: Schema.Literals(["idle", "queued", "evaluating"]) } }, { httpApiStatus: refusals.ThreadNotIdle.status }) { static readonly code = refusals.ThreadNotIdle.code; }
export class TicketNotOpen extends Schema.TaggedError<TicketNotOpen>()("TicketNotOpen", { code: Schema.Literal(refusals.TicketNotOpen.code), ...{ state: Schema.Literals(["open", "ended", "stopped"]) } }, { httpApiStatus: refusals.TicketNotOpen.status }) { static readonly code = refusals.TicketNotOpen.code; }
export class TriggerNotStored extends Schema.TaggedError<TriggerNotStored>()("TriggerNotStored", { code: Schema.Literal(refusals.TriggerNotStored.code), ...{ state: Schema.Literals(["stored"]) } }, { httpApiStatus: refusals.TriggerNotStored.status }) { static readonly code = refusals.TriggerNotStored.code; }
export class AccountNotFound extends Schema.TaggedError<AccountNotFound>()("AccountNotFound", { code: Schema.Literal(refusals.AccountNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AccountNotFound.status }) { static readonly code = refusals.AccountNotFound.code; }
export class AgentNotFound extends Schema.TaggedError<AgentNotFound>()("AgentNotFound", { code: Schema.Literal(refusals.AgentNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AgentNotFound.status }) { static readonly code = refusals.AgentNotFound.code; }
export class AssignmentNotFound extends Schema.TaggedError<AssignmentNotFound>()("AssignmentNotFound", { code: Schema.Literal(refusals.AssignmentNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AssignmentNotFound.status }) { static readonly code = refusals.AssignmentNotFound.code; }
export class DecisionNotFound extends Schema.TaggedError<DecisionNotFound>()("DecisionNotFound", { code: Schema.Literal(refusals.DecisionNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.DecisionNotFound.status }) { static readonly code = refusals.DecisionNotFound.code; }
export class EvalNotFound extends Schema.TaggedError<EvalNotFound>()("EvalNotFound", { code: Schema.Literal(refusals.EvalNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.EvalNotFound.status }) { static readonly code = refusals.EvalNotFound.code; }
export class InputNotFound extends Schema.TaggedError<InputNotFound>()("InputNotFound", { code: Schema.Literal(refusals.InputNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.InputNotFound.status }) { static readonly code = refusals.InputNotFound.code; }
export class OutgoingMessageNotFound extends Schema.TaggedError<OutgoingMessageNotFound>()("OutgoingMessageNotFound", { code: Schema.Literal(refusals.OutgoingMessageNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.OutgoingMessageNotFound.status }) { static readonly code = refusals.OutgoingMessageNotFound.code; }
export class ProposalNotFound extends Schema.TaggedError<ProposalNotFound>()("ProposalNotFound", { code: Schema.Literal(refusals.ProposalNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.ProposalNotFound.status }) { static readonly code = refusals.ProposalNotFound.code; }
export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()("SourceNotFound", { code: Schema.Literal(refusals.SourceNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.SourceNotFound.status }) { static readonly code = refusals.SourceNotFound.code; }
export class SuperagentNotFound extends Schema.TaggedError<SuperagentNotFound>()("SuperagentNotFound", { code: Schema.Literal(refusals.SuperagentNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.SuperagentNotFound.status }) { static readonly code = refusals.SuperagentNotFound.code; }
export class ThreadNotFound extends Schema.TaggedError<ThreadNotFound>()("ThreadNotFound", { code: Schema.Literal(refusals.ThreadNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.ThreadNotFound.status }) { static readonly code = refusals.ThreadNotFound.code; }
export class TicketNotFound extends Schema.TaggedError<TicketNotFound>()("TicketNotFound", { code: Schema.Literal(refusals.TicketNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.TicketNotFound.status }) { static readonly code = refusals.TicketNotFound.code; }
export class TriggerNotFound extends Schema.TaggedError<TriggerNotFound>()("TriggerNotFound", { code: Schema.Literal(refusals.TriggerNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.TriggerNotFound.status }) { static readonly code = refusals.TriggerNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }
export class ReadNotServed extends Schema.TaggedError<ReadNotServed>()("ReadNotServed", { code: Schema.Literal(refusals.ReadNotServed.code), ...{ read: Schema.String, message: Schema.String } }, { httpApiStatus: refusals.ReadNotServed.status }) { static readonly code = refusals.ReadNotServed.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  AccountExists: Account.AccountExists,
  StaleAssignment: Agent.StaleAssignment,
  NoSeat: Assignment.NoSeat,
  SeatTaken: Assignment.SeatTaken,
  ExecutorAlreadyQueued: Assignment.ExecutorAlreadyQueued,
  AlreadyFollowing: Subscription.AlreadyFollowing,
  SlotsOutOfRange: Superagent.SlotsOutOfRange,
  StaleRevision: Superagent.StaleRevision,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { AccountExists, StaleAssignment, NoSeat, SeatTaken, ExecutorAlreadyQueued, AlreadyFollowing, SlotsOutOfRange, StaleRevision, AccountNotSeen, AgentNotIdle, AssignmentNotPending, AttentionNotOpen, DecisionNotRecorded, EvalNotQueued, InputNotWaiting, MandateNotHeld, OutgoingMessageNotPending, PolicyNotCurrent, ProposalNotWaiting, ReportNotProgress, SettingsNotCurrent, SourceNotSetup, SubscriptionNotLive, SuperagentNotObserving, ThreadNotIdle, TicketNotOpen, TriggerNotStored, AccountNotFound, AgentNotFound, AssignmentNotFound, DecisionNotFound, EvalNotFound, InputNotFound, OutgoingMessageNotFound, ProposalNotFound, SourceNotFound, SuperagentNotFound, ThreadNotFound, TicketNotFound, TriggerNotFound, NotAllowed, IdempotencyConflict, ReadNotServed };
