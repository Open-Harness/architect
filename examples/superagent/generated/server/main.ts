// Generated from the blueprint. Do not edit.
// The Worker: each operation's route runs its handler through the runtime's wrapper; /_world/* goes to the world.
import { Context, Effect, Layer } from "effect";
import { ManagedRuntime, Tracer } from "effect";
import { HttpRouter, HttpServer } from "effect/http";
import { HttpApiBuilder } from "effect/http-api";
import { SqlClient } from "effect/sql";
import type { Principal } from "orthograph";
import { AuthD1, Database, Inbound, JournalD1, StoreD1, Telemetry, toWorld } from "@orthograph/host-cloudflare";
import { Auth, Busy, BusyLive, CallTelemetry, Environment, Handlers, Journal, Mount, Principals, Reads, Store, Versions, Wire, invariantsIn, thingIn } from "@orthograph/language-effect";
import { Mcp, type McpResult, type ShownOperation } from "@orthograph/language-effect";
import { Api, Errors } from "../api/src/index.ts";
import * as portal from "../portal/main.ts";
import { catalog } from "../mcp/src/index.ts";
import * as accountList from "../api/src/account/list.ts";
import * as accountSeen from "../api/src/account/seen.ts";
import * as accountSync from "../api/src/account/sync.ts";
import * as accountUnlist from "../api/src/account/unlist.ts";
import * as agentClose from "../api/src/agent/close.ts";
import * as agentOpen from "../api/src/agent/open.ts";
import * as agentTell from "../api/src/agent/tell.ts";
import * as assignmentCancelled from "../api/src/assignment/cancelled.ts";
import * as assignmentInterrupted from "../api/src/assignment/interrupted.ts";
import * as assignmentPromoted from "../api/src/assignment/promoted.ts";
import * as assignmentQueued from "../api/src/assignment/queued.ts";
import * as assignmentStarted from "../api/src/assignment/started.ts";
import * as assignmentTurnEnded from "../api/src/assignment/turn-ended.ts";
import * as assignmentWaiting from "../api/src/assignment/waiting.ts";
import * as decisionDismiss from "../api/src/decision/dismiss.ts";
import * as decisionRoute from "../api/src/decision/route.ts";
import * as evalContext from "../api/src/eval/context.ts";
import * as evalDecide from "../api/src/eval/decide.ts";
import * as evalDelivered from "../api/src/eval/delivered.ts";
import * as evalDue from "../api/src/eval/due.ts";
import * as evalExpire from "../api/src/eval/expire.ts";
import * as evalRead from "../api/src/eval/read.ts";
import * as evalStart from "../api/src/eval/start.ts";
import * as inputDelivered from "../api/src/input/delivered.ts";
import * as inputDeliveryFailed from "../api/src/input/delivery-failed.ts";
import * as inputRead from "../api/src/input/read.ts";
import * as inputRequeue from "../api/src/input/requeue.ts";
import * as inputRoute from "../api/src/input/route.ts";
import * as inputStore from "../api/src/input/store.ts";
import * as mandateRevalidate from "../api/src/mandate/revalidate.ts";
import * as outgoingMessageReply from "../api/src/outgoing-message/reply.ts";
import * as outgoingMessageRetry from "../api/src/outgoing-message/retry.ts";
import * as outgoingMessageSend from "../api/src/outgoing-message/send.ts";
import * as outgoingMessageWithdraw from "../api/src/outgoing-message/withdraw.ts";
import * as policyGet from "../api/src/policy/get.ts";
import * as policyHistory from "../api/src/policy/history.ts";
import * as policyRestore from "../api/src/policy/restore.ts";
import * as policySave from "../api/src/policy/save.ts";
import * as policySync from "../api/src/policy/sync.ts";
import * as promptSetCompose from "../api/src/prompt-set/compose.ts";
import * as promptSetHistory from "../api/src/prompt-set/history.ts";
import * as promptSetPreview from "../api/src/prompt-set/preview.ts";
import * as promptSetSave from "../api/src/prompt-set/save.ts";
import * as proposalApprove from "../api/src/proposal/approve.ts";
import * as proposalPropose from "../api/src/proposal/propose.ts";
import * as proposalReject from "../api/src/proposal/reject.ts";
import * as proposalWaiting from "../api/src/proposal/waiting.ts";
import * as settingsSave from "../api/src/settings/save.ts";
import * as sourceDisable from "../api/src/source/disable.ts";
import * as sourceEnable from "../api/src/source/enable.ts";
import * as sourcePositionAdvanced from "../api/src/source/position-advanced.ts";
import * as sourceProblem from "../api/src/source/problem.ts";
import * as sourceSave from "../api/src/source/save.ts";
import * as superagentBoot from "../api/src/superagent/boot.ts";
import * as superagentCreate from "../api/src/superagent/create.ts";
import * as superagentFill from "../api/src/superagent/fill.ts";
import * as superagentGoLive from "../api/src/superagent/go-live.ts";
import * as superagentHealth from "../api/src/superagent/health.ts";
import * as superagentPause from "../api/src/superagent/pause.ts";
import * as superagentReap from "../api/src/superagent/reap.ts";
import * as superagentResume from "../api/src/superagent/resume.ts";
import * as superagentRetire from "../api/src/superagent/retire.ts";
import * as superagentUpdate from "../api/src/superagent/update.ts";
import * as threadBind from "../api/src/thread/bind.ts";
import * as threadClosed from "../api/src/thread/closed.ts";
import * as threadFollow from "../api/src/thread/follow.ts";
import * as threadUnrelated from "../api/src/thread/unrelated.ts";
import * as threadUnsubscribe from "../api/src/thread/unsubscribe.ts";
import * as ticketAccept from "../api/src/ticket/accept.ts";
import * as ticketAck from "../api/src/ticket/ack.ts";
import * as ticketAttach from "../api/src/ticket/attach.ts";
import * as ticketEnd from "../api/src/ticket/end.ts";
import * as ticketNote from "../api/src/ticket/note.ts";
import * as ticketPolicyChanged from "../api/src/ticket/policy-changed.ts";
import * as ticketReport from "../api/src/ticket/report.ts";
import * as ticketRequestStatus from "../api/src/ticket/request-status.ts";
import * as ticketResume from "../api/src/ticket/resume.ts";
import * as ticketRetry from "../api/src/ticket/retry.ts";
import * as ticketStage from "../api/src/ticket/stage.ts";
import * as ticketStop from "../api/src/ticket/stop.ts";
import * as ticketWaiting from "../api/src/ticket/waiting.ts";
import * as triggerHandback from "../api/src/trigger/handback.ts";
import * as triggerReceive from "../api/src/trigger/receive.ts";
import * as triggerReevaluate from "../api/src/trigger/reevaluate.ts";
import * as triggerRequeue from "../api/src/trigger/requeue.ts";
import accountListHandler from "@orthograph/intake/src/account/list.js";
import accountSeenHandler from "@orthograph/intake/src/account/seen.js";
import accountSyncHandler from "@orthograph/intake/src/account/sync.js";
import accountUnlistHandler from "@orthograph/intake/src/account/unlist.js";
import agentCloseHandler from "@orthograph/agents/src/agent/close.js";
import agentOpenHandler from "@orthograph/agents/src/agent/open.js";
import agentTellHandler from "@orthograph/agents/src/agent/tell.js";
import assignmentCancelledHandler from "@orthograph/tickets/src/assignment/cancelled.js";
import assignmentInterruptedHandler from "@orthograph/tickets/src/assignment/interrupted.js";
import assignmentPromotedHandler from "@orthograph/tickets/src/assignment/promoted.js";
import assignmentQueuedHandler from "@orthograph/tickets/src/assignment/queued.js";
import assignmentStartedHandler from "@orthograph/tickets/src/assignment/started.js";
import assignmentTurnEndedHandler from "@orthograph/tickets/src/assignment/turn-ended.js";
import decisionDismissHandler from "@orthograph/intake/src/decision/dismiss.js";
import decisionRouteHandler from "@orthograph/intake/src/decision/route.js";
import evalContextHandler from "@orthograph/intake/src/eval/context.js";
import evalDecideHandler from "@orthograph/intake/src/eval/decide.js";
import evalDeliveredHandler from "@orthograph/intake/src/eval/delivered.js";
import evalDueHandler from "@orthograph/intake/src/eval/due.js";
import evalExpireHandler from "@orthograph/intake/src/eval/expire.js";
import evalReadHandler from "@orthograph/intake/src/eval/read.js";
import evalStartHandler from "@orthograph/intake/src/eval/start.js";
import inputDeliveredHandler from "@orthograph/tickets/src/input/delivered.js";
import inputDeliveryFailedHandler from "@orthograph/tickets/src/input/delivery-failed.js";
import inputReadHandler from "@orthograph/tickets/src/input/read.js";
import inputRequeueHandler from "@orthograph/tickets/src/input/requeue.js";
import inputRouteHandler from "@orthograph/tickets/src/input/route.js";
import inputStoreHandler from "@orthograph/tickets/src/input/store.js";
import mandateRevalidateHandler from "@orthograph/tickets/src/mandate/revalidate.js";
import outgoingMessageReplyHandler from "@orthograph/tickets/src/outgoing-message/reply.js";
import outgoingMessageRetryHandler from "@orthograph/tickets/src/outgoing-message/retry.js";
import outgoingMessageSendHandler from "@orthograph/tickets/src/outgoing-message/send.js";
import outgoingMessageWithdrawHandler from "@orthograph/tickets/src/outgoing-message/withdraw.js";
import policySyncHandler from "@orthograph/intake/src/policy/sync.js";
import promptSetComposeHandler from "@orthograph/prompts/src/prompt-set/compose.js";
import promptSetPreviewHandler from "@orthograph/prompts/src/prompt-set/preview.js";
import proposalApproveHandler from "@orthograph/superagent/src/proposal/approve.js";
import proposalProposeHandler from "@orthograph/superagent/src/proposal/propose.js";
import proposalRejectHandler from "@orthograph/superagent/src/proposal/reject.js";
import settingsSaveHandler from "../../src/settings/save.ts";
import sourceDisableHandler from "@orthograph/intake/src/source/disable.js";
import sourceEnableHandler from "@orthograph/intake/src/source/enable.js";
import sourcePositionAdvancedHandler from "@orthograph/intake/src/source/position-advanced.js";
import sourceProblemHandler from "@orthograph/intake/src/source/problem.js";
import sourceSaveHandler from "@orthograph/intake/src/source/save.js";
import superagentBootHandler from "@orthograph/superagent/src/superagent/boot.js";
import superagentCreateHandler from "@orthograph/superagent/src/superagent/create.js";
import superagentFillHandler from "../../src/superagent/fill.ts";
import superagentGoLiveHandler from "@orthograph/superagent/src/superagent/go-live.js";
import superagentPauseHandler from "@orthograph/superagent/src/superagent/pause.js";
import superagentReapHandler from "../../src/superagent/reap.ts";
import superagentResumeHandler from "@orthograph/superagent/src/superagent/resume.js";
import superagentRetireHandler from "@orthograph/superagent/src/superagent/retire.js";
import superagentUpdateHandler from "@orthograph/superagent/src/superagent/update.js";
import threadBindHandler from "@orthograph/intake/src/thread/bind.js";
import threadClosedHandler from "@orthograph/intake/src/thread/closed.js";
import threadFollowHandler from "@orthograph/tickets/src/thread/follow.js";
import threadUnrelatedHandler from "@orthograph/tickets/src/thread/unrelated.js";
import threadUnsubscribeHandler from "@orthograph/intake/src/thread/unsubscribe.js";
import ticketAcceptHandler from "@orthograph/tickets/src/ticket/accept.js";
import ticketAckHandler from "@orthograph/tickets/src/ticket/ack.js";
import ticketAttachHandler from "@orthograph/tickets/src/ticket/attach.js";
import ticketEndHandler from "@orthograph/tickets/src/ticket/end.js";
import ticketNoteHandler from "@orthograph/tickets/src/ticket/note.js";
import ticketPolicyChangedHandler from "@orthograph/tickets/src/ticket/policy-changed.js";
import ticketReportHandler from "@orthograph/tickets/src/ticket/report.js";
import ticketRequestStatusHandler from "@orthograph/tickets/src/ticket/request-status.js";
import ticketResumeHandler from "@orthograph/tickets/src/ticket/resume.js";
import ticketRetryHandler from "@orthograph/tickets/src/ticket/retry.js";
import ticketStopHandler from "@orthograph/tickets/src/ticket/stop.js";
import triggerHandbackHandler from "@orthograph/tickets/src/trigger/handback.js";
import triggerReceiveHandler from "@orthograph/intake/src/trigger/receive.js";
import triggerReevaluateHandler from "@orthograph/intake/src/trigger/reevaluate.js";
import triggerRequeueHandler from "@orthograph/intake/src/trigger/requeue.js";
import intakeMount from "../../blueprint/features/intake.ts";
import agentsMount from "../../blueprint/features/agents.ts";
import ticketsMount from "../../blueprint/features/tickets.ts";
import promptsMount from "../../blueprint/features/prompts.ts";
import superagentMount from "../../blueprint/features/superagent.ts";
import githubMount from "../../blueprint/adapters/github.ts";
import slackMount from "../../blueprint/adapters/slack.ts";
import { githubSource } from "@orthograph/intake/blueprint/sources/github.js";
import { slackSource } from "@orthograph/intake/blueprint/sources/slack.js";
import * as accountThing from "@orthograph/intake/blueprint/things/account/thing.js";
import * as agentThing from "@orthograph/agents/blueprint/things/agent/thing.js";
import * as assignmentThing from "@orthograph/tickets/blueprint/things/assignment/thing.js";
import * as attentionThing from "@orthograph/tickets/blueprint/things/attention/thing.js";
import * as correlationThing from "@orthograph/intake/blueprint/things/correlation/thing.js";
import * as decisionThing from "@orthograph/intake/blueprint/things/decision/thing.js";
import * as evalThing from "@orthograph/intake/blueprint/things/eval/thing.js";
import * as inputThing from "@orthograph/tickets/blueprint/things/input/thing.js";
import * as mandateThing from "@orthograph/tickets/blueprint/things/mandate/thing.js";
import * as outgoingMessageThing from "@orthograph/tickets/blueprint/things/outgoing-message/thing.js";
import * as policyThing from "@orthograph/intake/blueprint/things/policy/thing.js";
import * as promptSetThing from "@orthograph/prompts/blueprint/things/prompt-set/thing.js";
import * as proposalThing from "@orthograph/superagent/blueprint/things/proposal/thing.js";
import * as reportThing from "@orthograph/tickets/blueprint/things/report/thing.js";
import * as settingsThing from "../../blueprint/things/settings/thing.ts";
import * as sourceThing from "@orthograph/intake/blueprint/things/source/thing.js";
import * as subscriptionThing from "@orthograph/tickets/blueprint/things/subscription/thing.js";
import * as superagentThing from "@orthograph/superagent/blueprint/things/superagent/thing.js";
import * as threadThing from "@orthograph/intake/blueprint/things/thread/thing.js";
import * as ticketThing from "@orthograph/tickets/blueprint/things/ticket/thing.js";
import * as triggerThing from "@orthograph/intake/blueprint/things/trigger/thing.js";
import * as accountInvariants from "@orthograph/intake/blueprint/things/account/invariants.js";
import * as assignmentInvariants from "@orthograph/tickets/blueprint/things/assignment/invariants.js";
import * as evalInvariants from "@orthograph/intake/blueprint/things/eval/invariants.js";
import * as subscriptionInvariants from "@orthograph/tickets/blueprint/things/subscription/invariants.js";
import * as threadInvariants from "@orthograph/intake/blueprint/things/thread/invariants.js";
import * as triggerInvariants from "@orthograph/intake/blueprint/things/trigger/invariants.js";

export { Actor, World } from "@orthograph/host-cloudflare";

const accountListServed = Handlers.serve({ name: "account.list", operation: accountList.declaration, handler: Mount.serving(intakeMount, accountListHandler), notFrom: "AccountNotSeen", notFound: { account: "AccountNotFound" }, invariants: { AccountExists: "account.oneAccountPerExternalId" }, codes: Errors.codes });
const accountSeenServed = Handlers.serve({ name: "account.seen", operation: accountSeen.declaration, handler: Mount.serving(intakeMount, accountSeenHandler), notFound: { superagent: "SuperagentNotFound" }, invariants: { AccountExists: "account.oneAccountPerExternalId" }, codes: Errors.codes });
const accountSyncServed = Handlers.serve({ name: "account.sync", operation: accountSync.declaration, handler: Mount.serving(intakeMount, accountSyncHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const accountUnlistServed = Handlers.serve({ name: "account.unlist", operation: accountUnlist.declaration, handler: Mount.serving(intakeMount, accountUnlistHandler), notFrom: "AccountNotSeen", notFound: { account: "AccountNotFound" }, invariants: { AccountExists: "account.oneAccountPerExternalId" }, codes: Errors.codes });
const agentCloseServed = Handlers.serve({ name: "agent.close", operation: agentClose.declaration, handler: Mount.serving(agentsMount, agentCloseHandler), notFrom: "AgentNotIdle", notFound: { agent: "AgentNotFound" }, codes: Errors.codes });
const agentOpenServed = Handlers.serve({ name: "agent.open", operation: agentOpen.declaration, handler: Mount.serving(agentsMount, agentOpenHandler), codes: Errors.codes });
const agentTellServed = Handlers.serve({ name: "agent.tell", operation: agentTell.declaration, handler: Mount.serving(agentsMount, agentTellHandler), notFrom: "AgentNotIdle", notFound: { agent: "AgentNotFound" }, codes: Errors.codes });
const assignmentCancelledServed = Handlers.serve({ name: "assignment.cancelled", operation: assignmentCancelled.declaration, handler: Mount.serving(ticketsMount, assignmentCancelledHandler), notFrom: "AssignmentNotPending", notFound: { assignment: "AssignmentNotFound" }, codes: Errors.codes });
const assignmentInterruptedServed = Handlers.serve({ name: "assignment.interrupted", operation: assignmentInterrupted.declaration, handler: Mount.serving(ticketsMount, assignmentInterruptedHandler), notFrom: "AssignmentNotPending", notFound: { assignment: "AssignmentNotFound" }, invariants: { SeatTaken: "assignment.oneHolderPerSeat", ExecutorAlreadyQueued: "assignment.oneLivePerExecutor" }, codes: Errors.codes });
const assignmentPromotedServed = Handlers.serve({ name: "assignment.promoted", operation: assignmentPromoted.declaration, handler: Mount.serving(ticketsMount, assignmentPromotedHandler), notFrom: "AssignmentNotPending", notFound: { assignment: "AssignmentNotFound" }, invariants: { ExecutorAlreadyQueued: "assignment.oneLivePerExecutor" }, codes: Errors.codes });
const assignmentQueuedServed = Handlers.serve({ name: "assignment.queued", operation: assignmentQueued.declaration, handler: Mount.serving(ticketsMount, assignmentQueuedHandler), notFound: { superagent: "SuperagentNotFound", ticket: "TicketNotFound", agent: "AgentNotFound", input: "InputNotFound" }, invariants: { ExecutorAlreadyQueued: "assignment.oneLivePerExecutor" }, codes: Errors.codes });
const assignmentStartedServed = Handlers.serve({ name: "assignment.started", operation: assignmentStarted.declaration, handler: Mount.serving(ticketsMount, assignmentStartedHandler), notFrom: "AssignmentNotPending", notFound: { assignment: "AssignmentNotFound" }, invariants: { SeatTaken: "assignment.oneHolderPerSeat", ExecutorAlreadyQueued: "assignment.oneLivePerExecutor" }, codes: Errors.codes });
const assignmentTurnEndedServed = Handlers.serve({ name: "assignment.turn-ended", operation: assignmentTurnEnded.declaration, handler: Mount.serving(ticketsMount, assignmentTurnEndedHandler), notFrom: "AssignmentNotPending", notFound: { assignment: "AssignmentNotFound" }, codes: Errors.codes });
const assignmentWaitingServed = Reads.serve({ name: "assignment.waiting", read: assignmentWaiting.declaration });
const decisionDismissServed = Handlers.serve({ name: "decision.dismiss", operation: decisionDismiss.declaration, handler: Mount.serving(intakeMount, decisionDismissHandler), notFrom: "DecisionNotRecorded", notFound: { decision: "DecisionNotFound" }, codes: Errors.codes });
const decisionRouteServed = Handlers.serve({ name: "decision.route", operation: decisionRoute.declaration, handler: Mount.serving(intakeMount, decisionRouteHandler), codes: Errors.codes });
const evalContextServed = Handlers.serve({ name: "eval.context", operation: evalContext.declaration, handler: Mount.serving(intakeMount, evalContextHandler), notFound: { eval: "EvalNotFound" }, codes: Errors.codes });
const evalDecideServed = Handlers.serve({ name: "eval.decide", operation: evalDecide.declaration, handler: Mount.serving(intakeMount, evalDecideHandler), notFrom: "EvalNotQueued", notFound: { eval: "EvalNotFound" }, codes: Errors.codes });
const evalDeliveredServed = Handlers.serve({ name: "eval.delivered", operation: evalDelivered.declaration, handler: Mount.serving(intakeMount, evalDeliveredHandler), notFrom: "EvalNotQueued", notFound: { eval: "EvalNotFound" }, codes: Errors.codes });
const evalDueServed = Handlers.serve({ name: "eval.due", operation: evalDue.declaration, handler: Mount.serving(intakeMount, evalDueHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const evalExpireServed = Handlers.serve({ name: "eval.expire", operation: evalExpire.declaration, handler: Mount.serving(intakeMount, evalExpireHandler), notFrom: "EvalNotQueued", notFound: { eval: "EvalNotFound" }, codes: Errors.codes });
const evalReadServed = Handlers.serve({ name: "eval.read", operation: evalRead.declaration, handler: Mount.serving(intakeMount, evalReadHandler), notFound: { eval: "EvalNotFound" }, codes: Errors.codes });
const evalStartServed = Handlers.serve({ name: "eval.start", operation: evalStart.declaration, handler: Mount.serving(intakeMount, evalStartHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const inputDeliveredServed = Handlers.serve({ name: "input.delivered", operation: inputDelivered.declaration, handler: Mount.serving(ticketsMount, inputDeliveredHandler), notFrom: "InputNotWaiting", notFound: { input: "InputNotFound" }, codes: Errors.codes });
const inputDeliveryFailedServed = Handlers.serve({ name: "input.delivery-failed", operation: inputDeliveryFailed.declaration, handler: Mount.serving(ticketsMount, inputDeliveryFailedHandler), notFrom: "InputNotWaiting", notFound: { input: "InputNotFound" }, codes: Errors.codes });
const inputReadServed = Handlers.serve({ name: "input.read", operation: inputRead.declaration, handler: Mount.serving(ticketsMount, inputReadHandler), notFound: { input: "InputNotFound" }, codes: Errors.codes });
const inputRequeueServed = Handlers.serve({ name: "input.requeue", operation: inputRequeue.declaration, handler: Mount.serving(ticketsMount, inputRequeueHandler), notFrom: "InputNotWaiting", notFound: { input: "InputNotFound" }, codes: Errors.codes });
const inputRouteServed = Handlers.serve({ name: "input.route", operation: inputRoute.declaration, handler: Mount.serving(ticketsMount, inputRouteHandler), notFrom: "InputNotWaiting", notFound: { ticket: "TicketNotFound" }, codes: Errors.codes });
const inputStoreServed = Handlers.serve({ name: "input.store", operation: inputStore.declaration, handler: Mount.serving(ticketsMount, inputStoreHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const mandateRevalidateServed = Handlers.serve({ name: "mandate.revalidate", operation: mandateRevalidate.declaration, handler: Mount.serving(ticketsMount, mandateRevalidateHandler), notFrom: "MandateNotHeld", notFound: { ticket: "TicketNotFound" }, codes: Errors.codes });
const outgoingMessageReplyServed = Handlers.serve({ name: "outgoing-message.reply", operation: outgoingMessageReply.declaration, handler: Mount.serving(ticketsMount, outgoingMessageReplyHandler), notFound: { superagent: "SuperagentNotFound", ticket: "TicketNotFound" }, codes: Errors.codes });
const outgoingMessageRetryServed = Handlers.serve({ name: "outgoing-message.retry", operation: outgoingMessageRetry.declaration, handler: Mount.serving(ticketsMount, outgoingMessageRetryHandler), notFrom: "OutgoingMessageNotPending", notFound: { message: "OutgoingMessageNotFound" }, codes: Errors.codes });
const outgoingMessageSendServed = Handlers.serve({ name: "outgoing-message.send", operation: outgoingMessageSend.declaration, handler: Mount.serving(ticketsMount, outgoingMessageSendHandler), notFrom: "OutgoingMessageNotPending", notFound: { message: "OutgoingMessageNotFound" }, codes: Errors.codes });
const outgoingMessageWithdrawServed = Handlers.serve({ name: "outgoing-message.withdraw", operation: outgoingMessageWithdraw.declaration, handler: Mount.serving(ticketsMount, outgoingMessageWithdrawHandler), notFrom: "OutgoingMessageNotPending", notFound: { ticket: "TicketNotFound" }, codes: Errors.codes });
const policyGetServed = Handlers.serve({ name: "policy.get", operation: policyGet.declaration, handler: Versions.handler("get", thingIn(policyThing), undefined, false), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const policyHistoryServed = Handlers.serve({ name: "policy.history", operation: policyHistory.declaration, handler: Versions.handler("history", thingIn(policyThing), undefined, false), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const policyRestoreServed = Handlers.serve({ name: "policy.restore", operation: policyRestore.declaration, handler: Versions.handler("restore", thingIn(policyThing), Errors.declared.StaleRevision), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const policySaveServed = Handlers.serve({ name: "policy.save", operation: policySave.declaration, handler: Versions.handler("save", thingIn(policyThing), Errors.declared.StaleRevision), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const policySyncServed = Handlers.serve({ name: "policy.sync", operation: policySync.declaration, handler: Mount.serving(intakeMount, policySyncHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const promptSetComposeServed = Handlers.serve({ name: "prompt-set.compose", operation: promptSetCompose.declaration, handler: Mount.serving(promptsMount, promptSetComposeHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const promptSetHistoryServed = Handlers.serve({ name: "prompt-set.history", operation: promptSetHistory.declaration, handler: Versions.handler("history", thingIn(promptSetThing), undefined, false), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const promptSetPreviewServed = Handlers.serve({ name: "prompt-set.preview", operation: promptSetPreview.declaration, handler: Mount.serving(promptsMount, promptSetPreviewHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const promptSetSaveServed = Handlers.serve({ name: "prompt-set.save", operation: promptSetSave.declaration, handler: Versions.handler("save", thingIn(promptSetThing), Errors.declared.StaleRevision, false), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const proposalApproveServed = Handlers.serve({ name: "proposal.approve", operation: proposalApprove.declaration, handler: Mount.serving(superagentMount, proposalApproveHandler), notFrom: "ProposalNotWaiting", notFound: { proposal: "ProposalNotFound" }, codes: Errors.codes });
const proposalProposeServed = Handlers.serve({ name: "proposal.propose", operation: proposalPropose.declaration, handler: Mount.serving(superagentMount, proposalProposeHandler), codes: Errors.codes });
const proposalRejectServed = Handlers.serve({ name: "proposal.reject", operation: proposalReject.declaration, handler: Mount.serving(superagentMount, proposalRejectHandler), notFrom: "ProposalNotWaiting", notFound: { proposal: "ProposalNotFound" }, codes: Errors.codes });
const proposalWaitingServed = Reads.serve({ name: "proposal.waiting", read: proposalWaiting.declaration });
const settingsSaveServed = Handlers.serve({ name: "settings.save", operation: settingsSave.declaration, handler: settingsSaveHandler, codes: Errors.codes });
const sourceDisableServed = Handlers.serve({ name: "source.disable", operation: sourceDisable.declaration, handler: Mount.serving(intakeMount, sourceDisableHandler), notFrom: "SourceNotSetup", notFound: { source: "SourceNotFound" }, codes: Errors.codes });
const sourceEnableServed = Handlers.serve({ name: "source.enable", operation: sourceEnable.declaration, handler: Mount.serving(intakeMount, sourceEnableHandler), notFrom: "SourceNotSetup", notFound: { source: "SourceNotFound" }, codes: Errors.codes });
const sourcePositionAdvancedServed = Handlers.serve({ name: "source.position-advanced", operation: sourcePositionAdvanced.declaration, handler: Mount.serving(intakeMount, sourcePositionAdvancedHandler), notFrom: "SourceNotSetup", notFound: { source: "SourceNotFound" }, codes: Errors.codes });
const sourceProblemServed = Handlers.serve({ name: "source.problem", operation: sourceProblem.declaration, handler: Mount.serving(intakeMount, sourceProblemHandler), notFrom: "SourceNotSetup", notFound: { source: "SourceNotFound" }, codes: Errors.codes });
const sourceSaveServed = Handlers.serve({ name: "source.save", operation: sourceSave.declaration, handler: Mount.serving(intakeMount, sourceSaveHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const superagentBootServed = Handlers.serve({ name: "superagent.boot", operation: superagentBoot.declaration, handler: Mount.serving(superagentMount, superagentBootHandler), codes: Errors.codes });
const superagentCreateServed = Handlers.serve({ name: "superagent.create", operation: superagentCreate.declaration, handler: Mount.serving(superagentMount, superagentCreateHandler), notFound: { main: "AgentNotFound" }, codes: Errors.codes });
const superagentFillServed = Handlers.serve({ name: "superagent.fill", operation: superagentFill.declaration, handler: superagentFillHandler, notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const superagentGoLiveServed = Handlers.serve({ name: "superagent.go-live", operation: superagentGoLive.declaration, handler: Mount.serving(superagentMount, superagentGoLiveHandler), notFrom: "SuperagentNotObserving", notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const superagentHealthServed = Reads.serve({ name: "superagent.health", read: superagentHealth.declaration });
const superagentPauseServed = Handlers.serve({ name: "superagent.pause", operation: superagentPause.declaration, handler: Mount.serving(superagentMount, superagentPauseHandler), notFrom: "SuperagentNotObserving", notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const superagentReapServed = Handlers.serve({ name: "superagent.reap", operation: superagentReap.declaration, handler: superagentReapHandler, notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const superagentResumeServed = Handlers.serve({ name: "superagent.resume", operation: superagentResume.declaration, handler: Mount.serving(superagentMount, superagentResumeHandler), notFrom: "SuperagentNotObserving", notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const superagentRetireServed = Handlers.serve({ name: "superagent.retire", operation: superagentRetire.declaration, handler: Mount.serving(superagentMount, superagentRetireHandler), notFrom: "SuperagentNotObserving", notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const superagentUpdateServed = Handlers.serve({ name: "superagent.update", operation: superagentUpdate.declaration, handler: Mount.serving(superagentMount, superagentUpdateHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const threadBindServed = Handlers.serve({ name: "thread.bind", operation: threadBind.declaration, handler: Mount.serving(intakeMount, threadBindHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const threadClosedServed = Handlers.serve({ name: "thread.closed", operation: threadClosed.declaration, handler: Mount.serving(intakeMount, threadClosedHandler), notFrom: "ThreadNotIdle", notFound: { thread: "ThreadNotFound" }, codes: Errors.codes });
const threadFollowServed = Handlers.serve({ name: "thread.follow", operation: threadFollow.declaration, handler: Mount.serving(ticketsMount, threadFollowHandler), invariants: { AlreadyFollowing: "subscription.oneFollowPerThread" }, codes: Errors.codes });
const threadUnrelatedServed = Handlers.serve({ name: "thread.unrelated", operation: threadUnrelated.declaration, handler: Mount.serving(ticketsMount, threadUnrelatedHandler), invariants: { AlreadyFollowing: "subscription.oneFollowPerThread" }, codes: Errors.codes });
const threadUnsubscribeServed = Handlers.serve({ name: "thread.unsubscribe", operation: threadUnsubscribe.declaration, handler: Mount.serving(intakeMount, threadUnsubscribeHandler), notFrom: "ThreadNotIdle", notFound: { superagent: "SuperagentNotFound", thread: "ThreadNotFound" }, codes: Errors.codes });
const ticketAcceptServed = Handlers.serve({ name: "ticket.accept", operation: ticketAccept.declaration, handler: Mount.serving(ticketsMount, ticketAcceptHandler), notFound: { superagent: "SuperagentNotFound", agent: "AgentNotFound" }, invariants: { SeatTaken: "assignment.oneHolderPerSeat", ExecutorAlreadyQueued: "assignment.oneLivePerExecutor", AlreadyFollowing: "subscription.oneFollowPerThread" }, codes: Errors.codes });
const ticketAckServed = Handlers.serve({ name: "ticket.ack", operation: ticketAck.declaration, handler: Mount.serving(ticketsMount, ticketAckHandler), codes: Errors.codes });
const ticketAttachServed = Handlers.serve({ name: "ticket.attach", operation: ticketAttach.declaration, handler: Mount.serving(ticketsMount, ticketAttachHandler), notFound: { ticket: "TicketNotFound" }, codes: Errors.codes });
const ticketEndServed = Handlers.serve({ name: "ticket.end", operation: ticketEnd.declaration, handler: Mount.serving(ticketsMount, ticketEndHandler), notFrom: "TicketNotOpen", notFound: { ticket: "TicketNotFound" }, codes: Errors.codes });
const ticketNoteServed = Handlers.serve({ name: "ticket.note", operation: ticketNote.declaration, handler: Mount.serving(ticketsMount, ticketNoteHandler), notFound: { ticket: "TicketNotFound" }, codes: Errors.codes });
const ticketPolicyChangedServed = Handlers.serve({ name: "ticket.policy-changed", operation: ticketPolicyChanged.declaration, handler: Mount.serving(ticketsMount, ticketPolicyChangedHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const ticketReportServed = Handlers.serve({ name: "ticket.report", operation: ticketReport.declaration, handler: Mount.serving(ticketsMount, ticketReportHandler), codes: Errors.codes });
const ticketRequestStatusServed = Handlers.serve({ name: "ticket.request-status", operation: ticketRequestStatus.declaration, handler: Mount.serving(ticketsMount, ticketRequestStatusHandler), notFound: { superagent: "SuperagentNotFound", ticket: "TicketNotFound" }, codes: Errors.codes });
const ticketResumeServed = Handlers.serve({ name: "ticket.resume", operation: ticketResume.declaration, handler: Mount.serving(ticketsMount, ticketResumeHandler), notFrom: "TicketNotOpen", notFound: { ticket: "TicketNotFound" }, codes: Errors.codes });
const ticketRetryServed = Handlers.serve({ name: "ticket.retry", operation: ticketRetry.declaration, handler: Mount.serving(ticketsMount, ticketRetryHandler), notFound: { superagent: "SuperagentNotFound", ticket: "TicketNotFound" }, codes: Errors.codes });
const ticketStageServed = Reads.serve({ name: "ticket.stage", read: ticketStage.declaration });
const ticketStopServed = Handlers.serve({ name: "ticket.stop", operation: ticketStop.declaration, handler: Mount.serving(ticketsMount, ticketStopHandler), notFrom: "TicketNotOpen", notFound: { superagent: "SuperagentNotFound", ticket: "TicketNotFound" }, invariants: { SeatTaken: "assignment.oneHolderPerSeat", ExecutorAlreadyQueued: "assignment.oneLivePerExecutor" }, codes: Errors.codes });
const ticketWaitingServed = Reads.serve({ name: "ticket.waiting", read: ticketWaiting.declaration });
const triggerHandbackServed = Handlers.serve({ name: "trigger.handback", operation: triggerHandback.declaration, handler: Mount.serving(ticketsMount, triggerHandbackHandler), notFound: { trigger: "TriggerNotFound" }, codes: Errors.codes });
const triggerReceiveServed = Handlers.serve({ name: "trigger.receive", operation: triggerReceive.declaration, handler: Mount.serving(intakeMount, triggerReceiveHandler), notFound: { superagent: "SuperagentNotFound" }, codes: Errors.codes });
const triggerReevaluateServed = Handlers.serve({ name: "trigger.reevaluate", operation: triggerReevaluate.declaration, handler: Mount.serving(intakeMount, triggerReevaluateHandler), notFound: { trigger: "TriggerNotFound" }, codes: Errors.codes });
const triggerRequeueServed = Handlers.serve({ name: "trigger.requeue", operation: triggerRequeue.declaration, handler: Mount.serving(intakeMount, triggerRequeueHandler), notFrom: "TriggerNotStored", notFound: { trigger: "TriggerNotFound" }, codes: Errors.codes });

/** Each thing and its table: a D1 table, or the name its actors go by. */
const tables = [[thingIn(accountThing), "account"], [thingIn(agentThing), "agent"], [thingIn(assignmentThing), "assignment"], [thingIn(attentionThing), "attention"], [thingIn(correlationThing), "correlation"], [thingIn(decisionThing), "decision"], [thingIn(evalThing), "eval"], [thingIn(inputThing), "input"], [thingIn(mandateThing), "mandate"], [thingIn(outgoingMessageThing), "outgoing-message"], [thingIn(policyThing), "policy"], [thingIn(promptSetThing), "prompt-set"], [thingIn(proposalThing), "proposal"], [thingIn(reportThing), "report"], [thingIn(settingsThing), "settings"], [thingIn(sourceThing), "source"], [thingIn(subscriptionThing), "subscription"], [thingIn(superagentThing), "superagent"], [thingIn(threadThing), "thread"], [thingIn(ticketThing), "ticket"], [thingIn(triggerThing), "trigger"]] as const;

/** Each rule (G5) under its full name, `<thing>.<rule>`: the store's index refuses a second holder at commit, and the runtime refuses before it. */
const rules = [...invariantsIn("account", accountInvariants), ...invariantsIn("assignment", assignmentInvariants), ...invariantsIn("eval", evalInvariants), ...invariantsIn("subscription", subscriptionInvariants), ...invariantsIn("thread", threadInvariants), ...invariantsIn("trigger", triggerInvariants), ...Versions.rulesOf("policy", thingIn(policyThing)), ...Versions.rulesOf("prompt-set", thingIn(promptSetThing)), ...Versions.rulesOf("settings", thingIn(settingsThing))] as const;

/** Each door: the adapter that says how its sender signs, the events the mount includes, the sources that map them, and the binding of its signing secret. */
const doors = [{ mount: "github", adapter: githubMount.plugin, events: ["checkRun","issueComment","issues","pullRequest","pullRequestReview","pullRequestReviewComment"], sources: [githubSource], secret: "GITHUB_WEBHOOK_SIGNING" }, { mount: "slack", adapter: slackMount.plugin, events: ["appMention","message"], sources: [slackSource], secret: "SLACK_WEBHOOK_SIGNING" }];

const refusals = Wire.refusals(Errors.wire);
const CallApi = Api.middleware(CallTelemetry);
type Services = SqlClient.SqlClient | Store | Busy | Principals | Journal | Auth;

/** Who is calling, then the operation or read, its refusals sent as their wire classes. */
type Run = (payload: never, principal: Principal, request?: string) => Effect.Effect<unknown, unknown, unknown>;
/** Every answer and every refusal is cut by the visibility rule for this caller before it is sent. */
const shown = Wire.shown(Errors.declared);
const call = <P extends object>(served: { readonly run: Run; readonly operation: ShownOperation }, payload: P, headers: Readonly<Record<string, string | undefined>>) =>
  Effect.flatMap(Principals, (principals) => principals.of(headers["authorization"])).pipe(
    Effect.withTracerEnabled(false),
    // The caller's idempotency key: for an operation declared `idempotent: "request"`, the same key is one call.
    Effect.flatMap((principal: Principal) => served.run(payload as never, principal, headers["idempotency-key"]).pipe(shown(served, payload, principal))),
    refusals,
  ) as Effect.Effect<never, never, Services>;

const AccountLive = HttpApiBuilder.group(CallApi, "account", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("list", ({ payload, request }) => call(accountListServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("seen", ({ payload, request }) => call(accountSeenServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("sync", ({ payload, request }) => call(accountSyncServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("unlist", ({ payload, request }) => call(accountUnlistServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const AgentLive = HttpApiBuilder.group(CallApi, "agent", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("close", ({ payload, request }) => call(agentCloseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("open", ({ payload, request }) => call(agentOpenServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("tell", ({ payload, request }) => call(agentTellServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const AssignmentLive = HttpApiBuilder.group(CallApi, "assignment", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("cancelled", ({ payload, request }) => call(assignmentCancelledServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("interrupted", ({ payload, request }) => call(assignmentInterruptedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("promoted", ({ payload, request }) => call(assignmentPromotedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("queued", ({ payload, request }) => call(assignmentQueuedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("started", ({ payload, request }) => call(assignmentStartedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("turn-ended", ({ payload, request }) => call(assignmentTurnEndedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("waiting", ({ payload, request }) => call(assignmentWaitingServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const DecisionLive = HttpApiBuilder.group(CallApi, "decision", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("dismiss", ({ payload, request }) => call(decisionDismissServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("route", ({ payload, request }) => call(decisionRouteServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const EvalLive = HttpApiBuilder.group(CallApi, "eval", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("context", ({ payload, request }) => call(evalContextServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("decide", ({ payload, request }) => call(evalDecideServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("delivered", ({ payload, request }) => call(evalDeliveredServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("due", ({ payload, request }) => call(evalDueServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("expire", ({ payload, request }) => call(evalExpireServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("read", ({ payload, request }) => call(evalReadServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("start", ({ payload, request }) => call(evalStartServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const InputLive = HttpApiBuilder.group(CallApi, "input", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("delivered", ({ payload, request }) => call(inputDeliveredServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("delivery-failed", ({ payload, request }) => call(inputDeliveryFailedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("read", ({ payload, request }) => call(inputReadServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("requeue", ({ payload, request }) => call(inputRequeueServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("route", ({ payload, request }) => call(inputRouteServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("store", ({ payload, request }) => call(inputStoreServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const MandateLive = HttpApiBuilder.group(CallApi, "mandate", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("revalidate", ({ payload, request }) => call(mandateRevalidateServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const OutgoingMessageLive = HttpApiBuilder.group(CallApi, "outgoing-message", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("reply", ({ payload, request }) => call(outgoingMessageReplyServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("retry", ({ payload, request }) => call(outgoingMessageRetryServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("send", ({ payload, request }) => call(outgoingMessageSendServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("withdraw", ({ payload, request }) => call(outgoingMessageWithdrawServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const PolicyLive = HttpApiBuilder.group(CallApi, "policy", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("get", ({ payload, request }) => call(policyGetServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("history", ({ payload, request }) => call(policyHistoryServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("restore", ({ payload, request }) => call(policyRestoreServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("save", ({ payload, request }) => call(policySaveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("sync", ({ payload, request }) => call(policySyncServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const PromptSetLive = HttpApiBuilder.group(CallApi, "prompt-set", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("compose", ({ payload, request }) => call(promptSetComposeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("history", ({ payload, request }) => call(promptSetHistoryServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("preview", ({ payload, request }) => call(promptSetPreviewServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("save", ({ payload, request }) => call(promptSetSaveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ProposalLive = HttpApiBuilder.group(CallApi, "proposal", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("approve", ({ payload, request }) => call(proposalApproveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("propose", ({ payload, request }) => call(proposalProposeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reject", ({ payload, request }) => call(proposalRejectServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("waiting", ({ payload, request }) => call(proposalWaitingServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SettingsLive = HttpApiBuilder.group(CallApi, "settings", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("save", ({ payload, request }) => call(settingsSaveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SourceLive = HttpApiBuilder.group(CallApi, "source", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("disable", ({ payload, request }) => call(sourceDisableServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("enable", ({ payload, request }) => call(sourceEnableServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("position-advanced", ({ payload, request }) => call(sourcePositionAdvancedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("problem", ({ payload, request }) => call(sourceProblemServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("save", ({ payload, request }) => call(sourceSaveServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const SuperagentLive = HttpApiBuilder.group(CallApi, "superagent", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("boot", ({ payload, request }) => call(superagentBootServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("create", ({ payload, request }) => call(superagentCreateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("fill", ({ payload, request }) => call(superagentFillServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("go-live", ({ payload, request }) => call(superagentGoLiveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("health", ({ payload, request }) => call(superagentHealthServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("pause", ({ payload, request }) => call(superagentPauseServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reap", ({ payload, request }) => call(superagentReapServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("resume", ({ payload, request }) => call(superagentResumeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("retire", ({ payload, request }) => call(superagentRetireServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("update", ({ payload, request }) => call(superagentUpdateServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const ThreadLive = HttpApiBuilder.group(CallApi, "thread", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("bind", ({ payload, request }) => call(threadBindServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("closed", ({ payload, request }) => call(threadClosedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("follow", ({ payload, request }) => call(threadFollowServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("unrelated", ({ payload, request }) => call(threadUnrelatedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("unsubscribe", ({ payload, request }) => call(threadUnsubscribeServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const TicketLive = HttpApiBuilder.group(CallApi, "ticket", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("accept", ({ payload, request }) => call(ticketAcceptServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("ack", ({ payload, request }) => call(ticketAckServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("attach", ({ payload, request }) => call(ticketAttachServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("end", ({ payload, request }) => call(ticketEndServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("note", ({ payload, request }) => call(ticketNoteServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("policy-changed", ({ payload, request }) => call(ticketPolicyChangedServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("report", ({ payload, request }) => call(ticketReportServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("request-status", ({ payload, request }) => call(ticketRequestStatusServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("resume", ({ payload, request }) => call(ticketResumeServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("retry", ({ payload, request }) => call(ticketRetryServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("stage", ({ payload, request }) => call(ticketStageServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("stop", ({ payload, request }) => call(ticketStopServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("waiting", ({ payload, request }) => call(ticketWaitingServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));
const TriggerLive = HttpApiBuilder.group(CallApi, "trigger", Effect.fn(function* (handlers) {
  // The services are taken once, when the routes are built; each request keeps its own tracer and span.
  const services = Context.pick(SqlClient.SqlClient, Store, Busy, Principals, Journal, Auth)(yield* Effect.context<Services>());
  return handlers
      .handle("handback", ({ payload, request }) => call(triggerHandbackServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("receive", ({ payload, request }) => call(triggerReceiveServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("reevaluate", ({ payload, request }) => call(triggerReevaluateServed, payload, request.headers).pipe(Effect.provideContext(services)))
      .handle("requeue", ({ payload, request }) => call(triggerRequeueServed, payload, request.headers).pipe(Effect.provideContext(services)));
}));

export interface Env {
  readonly DB: D1Database;
  readonly WORLD: DurableObjectNamespace;
  readonly ACTORS: DurableObjectNamespace;
  /** Better Auth's secret, at least 32 characters: fresh per local world, a named secret per environment. */
  readonly AUTH_SECRET: string;
  /** The signing secret of a door: set by whoever runs the Worker, never written in a file. */
  readonly GITHUB_WEBHOOK_SIGNING?: string;
  /** The signing secret of a door: set by whoever runs the Worker, never written in a file. */
  readonly SLACK_WEBHOOK_SIGNING?: string;
  readonly OTLP_URL?: string;
  /** The environment's telemetry sinks beside the collector, as JSON: each one's OTLP endpoints and headers. A secret. */
  readonly OTLP_SINKS?: string;
  /** The environment's name, written on every span as `deployment.environment`: `local` for a world of dev or prove. */
  readonly ORTHO_ENVIRONMENT?: string;
  /** Which build this environment runs, set by `ortho env up`; unset for a world made by `ortho dev` or prove. */
  readonly ORTHO_REVISION?: string;
  readonly ORTHO_BUNDLE_SHA256?: string;
  /** The portal's: where the logbook is, which environment this is. Read by `portal.serve`; neither is sent to a browser. */
  readonly ORTHO_LOGBOOK_URL?: string;
  /** `1` in an environment that hosts worlds with lifetimes (a test environment), set by `ortho env up`. */
  readonly ORTHO_WORLDS?: string;
}

/** Which steps each operation runs, by the operation's name: the server's own record, never in the API package (the caller's contract names no step, K14). */
export const steps = {
  "thread.follow": ["thread.follow.write"],
  "thread.unrelated": ["thread.unrelated.write"],
  "ticket.accept": ["ticket.accept.write"],
  "ticket.ack": ["ticket.ack.write"],
  "ticket.report": ["ticket.report.write"],
  "ticket.stop": ["ticket.stop.write"],
  "trigger.reevaluate": ["trigger.reevaluate.release"],
} as const;

// Better Auth's own routes at /api/auth/*: the device sign-in of this project's CLI. Same database and secret as the
// layer's instance, so a session either one issues is a person to both.
let routes: ReturnType<typeof AuthD1.make> | undefined;
const routesOf = (env: Env) => (routes ??= AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, cli: "superagent-cli", worlds: hostsWorlds(env) }));

const build = (env: Env) =>
  HttpRouter.toWebHandler(
    HttpApiBuilder.layer(CallApi).pipe(
      Layer.provide([AccountLive, AgentLive, AssignmentLive, DecisionLive, EvalLive, InputLive, MandateLive, OutgoingMessageLive, PolicyLive, PromptSetLive, ProposalLive, SettingsLive, SourceLive, SuperagentLive, ThreadLive, TicketLive, TriggerLive]),
      Layer.provideMerge(CallTelemetry.layer),
      Layer.provide([StoreD1.layer({ tables, actors: env.ACTORS, rules }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))]),
      Layer.provideMerge(Database.d1(env.DB)),
      Layer.provide(HttpServer.layerServices),
    ),
  );

// Built once per isolate, from the first request's bindings.
let built: ReturnType<typeof build> | undefined;

/** The environments of the blueprint that host worlds: those that declare a `lifetime` (D3 #126). */
const WORLD_ENVIRONMENTS: ReadonlyArray<string> = ["test"];

/**
 * `/_world/*` (the cast that signs people up with known passwords, the facts, the registry of worlds) answers only where
 * worlds live: a world made by `ortho dev` or prove (`local`, or no environment), and an environment that declares a lifetime and
 * was started to host worlds. Anywhere else, staging and production included, it is a 404 before any handler runs.
 */
const hostsWorlds = (env: Env) =>
  !env.ORTHO_ENVIRONMENT || env.ORTHO_ENVIRONMENT === "local" || (env.ORTHO_WORLDS === "1" && WORLD_ENVIRONMENTS.includes(env.ORTHO_ENVIRONMENT));

/** One tool per operation and read: the same served operations as the API, called as the person the access token names. */
const tools = Mcp.tools<Services>({
  catalog,
  served: { "account.list": accountListServed, "account.seen": accountSeenServed, "account.sync": accountSyncServed, "account.unlist": accountUnlistServed, "agent.close": agentCloseServed, "agent.open": agentOpenServed, "agent.tell": agentTellServed, "assignment.cancelled": assignmentCancelledServed, "assignment.interrupted": assignmentInterruptedServed, "assignment.promoted": assignmentPromotedServed, "assignment.queued": assignmentQueuedServed, "assignment.started": assignmentStartedServed, "assignment.turn-ended": assignmentTurnEndedServed, "assignment.waiting": assignmentWaitingServed, "decision.dismiss": decisionDismissServed, "decision.route": decisionRouteServed, "eval.context": evalContextServed, "eval.decide": evalDecideServed, "eval.delivered": evalDeliveredServed, "eval.due": evalDueServed, "eval.expire": evalExpireServed, "eval.read": evalReadServed, "eval.start": evalStartServed, "input.delivered": inputDeliveredServed, "input.delivery-failed": inputDeliveryFailedServed, "input.read": inputReadServed, "input.requeue": inputRequeueServed, "input.route": inputRouteServed, "input.store": inputStoreServed, "mandate.revalidate": mandateRevalidateServed, "outgoing-message.reply": outgoingMessageReplyServed, "outgoing-message.retry": outgoingMessageRetryServed, "outgoing-message.send": outgoingMessageSendServed, "outgoing-message.withdraw": outgoingMessageWithdrawServed, "policy.get": policyGetServed, "policy.history": policyHistoryServed, "policy.restore": policyRestoreServed, "policy.save": policySaveServed, "policy.sync": policySyncServed, "prompt-set.compose": promptSetComposeServed, "prompt-set.history": promptSetHistoryServed, "prompt-set.preview": promptSetPreviewServed, "prompt-set.save": promptSetSaveServed, "proposal.approve": proposalApproveServed, "proposal.propose": proposalProposeServed, "proposal.reject": proposalRejectServed, "proposal.waiting": proposalWaitingServed, "settings.save": settingsSaveServed, "source.disable": sourceDisableServed, "source.enable": sourceEnableServed, "source.position-advanced": sourcePositionAdvancedServed, "source.problem": sourceProblemServed, "source.save": sourceSaveServed, "superagent.boot": superagentBootServed, "superagent.create": superagentCreateServed, "superagent.fill": superagentFillServed, "superagent.go-live": superagentGoLiveServed, "superagent.health": superagentHealthServed, "superagent.pause": superagentPauseServed, "superagent.reap": superagentReapServed, "superagent.resume": superagentResumeServed, "superagent.retire": superagentRetireServed, "superagent.update": superagentUpdateServed, "thread.bind": threadBindServed, "thread.closed": threadClosedServed, "thread.follow": threadFollowServed, "thread.unrelated": threadUnrelatedServed, "thread.unsubscribe": threadUnsubscribeServed, "ticket.accept": ticketAcceptServed, "ticket.ack": ticketAckServed, "ticket.attach": ticketAttachServed, "ticket.end": ticketEndServed, "ticket.note": ticketNoteServed, "ticket.policy-changed": ticketPolicyChangedServed, "ticket.report": ticketReportServed, "ticket.request-status": ticketRequestStatusServed, "ticket.resume": ticketResumeServed, "ticket.retry": ticketRetryServed, "ticket.stage": ticketStageServed, "ticket.stop": ticketStopServed, "ticket.waiting": ticketWaitingServed, "trigger.handback": triggerHandbackServed, "trigger.receive": triggerReceiveServed, "trigger.reevaluate": triggerReevaluateServed, "trigger.requeue": triggerRequeueServed },
  refusals: { codes: Errors.codes, declared: Errors.declared, table: Errors.refusals },
});

// The MCP server's own runtime, built once per isolate: the same store, journal, busy count and auth as the API's.
let mcpRuntime: ManagedRuntime.ManagedRuntime<Services, never> | undefined;
const runtimeOf = (env: Env) =>
  (mcpRuntime ??= ManagedRuntime.make(
    Layer.mergeAll(StoreD1.layer({ tables, actors: env.ACTORS, rules }), JournalD1.layer, BusyLive, Layer.succeed(Environment, env.ORTHO_ENVIRONMENT || "local"), AuthD1.layer(AuthD1.make({ db: env.DB, secret: env.AUTH_SECRET, worlds: hostsWorlds(env) }))).pipe(Layer.provideMerge(Database.d1(env.DB))),
  ));

const TRACEPARENT = /^00-([0-9a-f]{32})-([0-9a-f]{16})-[0-9a-f]{2}$/;

/** Who is asking at `/mcp`: any credential the identity knows, or an OAuth access token. This door is the agent's, so each is an agent for its person (M2-auth, fork 2). */
const asker = (env: Env, request: Request) =>
  runtimeOf(env).runPromise(Effect.flatMap(Principals, (principals) => principals.of(request.headers.get("authorization") ?? undefined, "mcp"))).then((principal) =>
    principal.kind !== "anonymous"
      ? { kind: "asked" as const, principal }
      : Effect.runPromise(AuthD1.oauth.bearer(routesOf(env), request)).then((who) => (who.kind === "person" ? { kind: "asked" as const, principal: who.principal } : who)));

/** `/mcp`: an agent's credential, or a 401 that says where to get one; then the tool call. */
const mcp = (env: Env, request: Request, context: Context.Context<never> | undefined): Promise<Response> =>
  asker(env, request).then((who) => {
    if (who.kind !== "asked") {
      const invalid = who.kind === "invalid";
      return Response.json({ error: invalid ? "invalid_token" : "unauthorized" }, { status: 401, headers: { "www-authenticate": AuthD1.oauth.challenge(request, invalid ? "invalid_token" : undefined) } });
    }
    // The caller's span, when it sent one, is the parent of every span of the call.
    const sent = request.headers.get("traceparent")?.match(TRACEPARENT);
    const parent = sent ? Tracer.externalSpan({ traceId: sent[1]!, spanId: sent[2]!, sampled: true }) : undefined;
    const run = (effect: Effect.Effect<McpResult, never, Services>) => {
      const traced = parent ? Effect.withParentSpan(effect, parent) : effect;
      return runtimeOf(env).runPromise(context ? Effect.provideContext(traced, context) : traced);
    };
    return Mcp.handle({ name: "superagent", version: env.ORTHO_REVISION ?? "0.0.0", tools, principal: who.principal, run }, request);
  });

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Closed before anything reads it: outside worlds there is no door to cast, to read facts, or to register a world.
    if (new URL(request.url).pathname.startsWith("/_world/") && !hostsWorlds(env)) return Promise.resolve(Response.json({ error: "not found" }, { status: 404 }));
    if (new URL(request.url).pathname.startsWith("/_world/")) {
      return toWorld({ worlds: env.WORLD, db: env.DB, tables: tables.map(([, table]) => table), actors: env.ACTORS, actorTables: ["agent"], leases: env.ORTHO_WORLDS === "1" }, request);
    }
    if (new URL(request.url).pathname === "/_ortho/bundle") {
      return env.ORTHO_REVISION && env.ORTHO_BUNDLE_SHA256
        ? Promise.resolve(Response.json({ revision: env.ORTHO_REVISION, sha256: env.ORTHO_BUNDLE_SHA256 }))
        : Promise.resolve(Response.json({ _tag: "NotAnEnvironment" }, { status: 404 }));
    }
    if (new URL(request.url).pathname.startsWith("/_in/")) {
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "superagent", handler: (req, context) => Inbound.handle({ doors, db: env.DB, secrets: env as unknown as Record<string, unknown> }, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    if (portal.owns(new URL(request.url).pathname)) return portal.serve(request, env);
    if (new URL(request.url).pathname.startsWith("/api/auth/")) return Effect.runPromise(AuthD1.handle(routesOf(env), request));
    if (new URL(request.url).pathname.startsWith("/.well-known/")) {
      return Effect.runPromise(AuthD1.oauth.discovery(routesOf(env), request)).then((found) => found ?? Response.json({ error: "not found" }, { status: 404 }));
    }
    if (new URL(request.url).pathname === "/mcp") {
      return Telemetry.serve({ url: env.OTLP_URL || undefined, sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT, service: "superagent", handler: (req, context) => mcp(env, req, context), waitUntil: (p) => ctx.waitUntil(p) }, request);
    }
    const app = (built ??= build(env));
    Telemetry.configure({ sinks: env.OTLP_SINKS, environment: env.ORTHO_ENVIRONMENT });
    return Telemetry.serve({ url: env.OTLP_URL || undefined, service: "superagent", handler: app.handler, waitUntil: (p) => ctx.waitUntil(p) }, request);
  },
};
