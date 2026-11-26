#!/usr/bin/env node
// Generated from the blueprint. Do not edit.
// `superagent <thing> <verb> --<field> <value>`. Talks to SUPERAGENT_URL, signed in with SUPERAGENT_TOKEN when set.
import { NodeRuntime, NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { CliOutput, Command } from "effect/cli";
import * as Sdk from "../../sdk/src/index.ts";
import { ExitCode } from "./output.ts";
import { list as accountList } from "./account/list.ts";
import { seen as accountSeen } from "./account/seen.ts";
import { sync as accountSync } from "./account/sync.ts";
import { unlist as accountUnlist } from "./account/unlist.ts";
import { close as agentClose } from "./agent/close.ts";
import { open as agentOpen } from "./agent/open.ts";
import { tell as agentTell } from "./agent/tell.ts";
import { cancelled as assignmentCancelled } from "./assignment/cancelled.ts";
import { interrupted as assignmentInterrupted } from "./assignment/interrupted.ts";
import { promoted as assignmentPromoted } from "./assignment/promoted.ts";
import { queued as assignmentQueued } from "./assignment/queued.ts";
import { started as assignmentStarted } from "./assignment/started.ts";
import { turnEnded as assignmentTurnEnded } from "./assignment/turn-ended.ts";
import { waiting as assignmentWaiting } from "./assignment/waiting.ts";
import { dismiss as decisionDismiss } from "./decision/dismiss.ts";
import { route as decisionRoute } from "./decision/route.ts";
import { context as evalContext } from "./eval/context.ts";
import { decide as evalDecide } from "./eval/decide.ts";
import { delivered as evalDelivered } from "./eval/delivered.ts";
import { due as evalDue } from "./eval/due.ts";
import { expire as evalExpire } from "./eval/expire.ts";
import { read as evalRead } from "./eval/read.ts";
import { start as evalStart } from "./eval/start.ts";
import { delivered as inputDelivered } from "./input/delivered.ts";
import { deliveryFailed as inputDeliveryFailed } from "./input/delivery-failed.ts";
import { read as inputRead } from "./input/read.ts";
import { requeue as inputRequeue } from "./input/requeue.ts";
import { route as inputRoute } from "./input/route.ts";
import { store as inputStore } from "./input/store.ts";
import { revalidate as mandateRevalidate } from "./mandate/revalidate.ts";
import { reply as outgoingMessageReply } from "./outgoing-message/reply.ts";
import { retry as outgoingMessageRetry } from "./outgoing-message/retry.ts";
import { send as outgoingMessageSend } from "./outgoing-message/send.ts";
import { withdraw as outgoingMessageWithdraw } from "./outgoing-message/withdraw.ts";
import { get as policyGet } from "./policy/get.ts";
import { history as policyHistory } from "./policy/history.ts";
import { restore as policyRestore } from "./policy/restore.ts";
import { save as policySave } from "./policy/save.ts";
import { sync as policySync } from "./policy/sync.ts";
import { compose as promptSetCompose } from "./prompt-set/compose.ts";
import { history as promptSetHistory } from "./prompt-set/history.ts";
import { preview as promptSetPreview } from "./prompt-set/preview.ts";
import { save as promptSetSave } from "./prompt-set/save.ts";
import { approve as proposalApprove } from "./proposal/approve.ts";
import { propose as proposalPropose } from "./proposal/propose.ts";
import { reject as proposalReject } from "./proposal/reject.ts";
import { waiting as proposalWaiting } from "./proposal/waiting.ts";
import { save as settingsSave } from "./settings/save.ts";
import { disable as sourceDisable } from "./source/disable.ts";
import { enable as sourceEnable } from "./source/enable.ts";
import { positionAdvanced as sourcePositionAdvanced } from "./source/position-advanced.ts";
import { problem as sourceProblem } from "./source/problem.ts";
import { save as sourceSave } from "./source/save.ts";
import { boot as superagentBoot } from "./superagent/boot.ts";
import { create as superagentCreate } from "./superagent/create.ts";
import { fill as superagentFill } from "./superagent/fill.ts";
import { goLive as superagentGoLive } from "./superagent/go-live.ts";
import { health as superagentHealth } from "./superagent/health.ts";
import { pause as superagentPause } from "./superagent/pause.ts";
import { reap as superagentReap } from "./superagent/reap.ts";
import { resume as superagentResume } from "./superagent/resume.ts";
import { retire as superagentRetire } from "./superagent/retire.ts";
import { update as superagentUpdate } from "./superagent/update.ts";
import { bind as threadBind } from "./thread/bind.ts";
import { closed as threadClosed } from "./thread/closed.ts";
import { follow as threadFollow } from "./thread/follow.ts";
import { unrelated as threadUnrelated } from "./thread/unrelated.ts";
import { unsubscribe as threadUnsubscribe } from "./thread/unsubscribe.ts";
import { accept as ticketAccept } from "./ticket/accept.ts";
import { ack as ticketAck } from "./ticket/ack.ts";
import { attach as ticketAttach } from "./ticket/attach.ts";
import { end as ticketEnd } from "./ticket/end.ts";
import { note as ticketNote } from "./ticket/note.ts";
import { policyChanged as ticketPolicyChanged } from "./ticket/policy-changed.ts";
import { report as ticketReport } from "./ticket/report.ts";
import { requestStatus as ticketRequestStatus } from "./ticket/request-status.ts";
import { resume as ticketResume } from "./ticket/resume.ts";
import { retry as ticketRetry } from "./ticket/retry.ts";
import { stage as ticketStage } from "./ticket/stage.ts";
import { stop as ticketStop } from "./ticket/stop.ts";
import { waiting as ticketWaiting } from "./ticket/waiting.ts";
import { handback as triggerHandback } from "./trigger/handback.ts";
import { receive as triggerReceive } from "./trigger/receive.ts";
import { reevaluate as triggerReevaluate } from "./trigger/reevaluate.ts";
import { requeue as triggerRequeue } from "./trigger/requeue.ts";

// The release version is stamped in when the CLI is published (`ortho publish`); run from source, it says 0.0.0.
declare const ORTHO_VERSION: string | undefined;

const account = Command.make("account").pipe(Command.withSubcommands([accountList, accountSeen, accountSync, accountUnlist]));
const agent = Command.make("agent").pipe(Command.withSubcommands([agentClose, agentOpen, agentTell]));
const assignment = Command.make("assignment").pipe(Command.withSubcommands([assignmentCancelled, assignmentInterrupted, assignmentPromoted, assignmentQueued, assignmentStarted, assignmentTurnEnded, assignmentWaiting]));
const decision = Command.make("decision").pipe(Command.withSubcommands([decisionDismiss, decisionRoute]));
const eval_ = Command.make("eval").pipe(Command.withSubcommands([evalContext, evalDecide, evalDelivered, evalDue, evalExpire, evalRead, evalStart]));
const input = Command.make("input").pipe(Command.withSubcommands([inputDelivered, inputDeliveryFailed, inputRead, inputRequeue, inputRoute, inputStore]));
const mandate = Command.make("mandate").pipe(Command.withSubcommands([mandateRevalidate]));
const outgoingMessage = Command.make("outgoing-message").pipe(Command.withSubcommands([outgoingMessageReply, outgoingMessageRetry, outgoingMessageSend, outgoingMessageWithdraw]));
const policy = Command.make("policy").pipe(Command.withSubcommands([policyGet, policyHistory, policyRestore, policySave, policySync]));
const promptSet = Command.make("prompt-set").pipe(Command.withSubcommands([promptSetCompose, promptSetHistory, promptSetPreview, promptSetSave]));
const proposal = Command.make("proposal").pipe(Command.withSubcommands([proposalApprove, proposalPropose, proposalReject, proposalWaiting]));
const settings = Command.make("settings").pipe(Command.withSubcommands([settingsSave]));
const source = Command.make("source").pipe(Command.withSubcommands([sourceDisable, sourceEnable, sourcePositionAdvanced, sourceProblem, sourceSave]));
const superagent = Command.make("superagent").pipe(Command.withSubcommands([superagentBoot, superagentCreate, superagentFill, superagentGoLive, superagentHealth, superagentPause, superagentReap, superagentResume, superagentRetire, superagentUpdate]));
const thread = Command.make("thread").pipe(Command.withSubcommands([threadBind, threadClosed, threadFollow, threadUnrelated, threadUnsubscribe]));
const ticket = Command.make("ticket").pipe(Command.withSubcommands([ticketAccept, ticketAck, ticketAttach, ticketEnd, ticketNote, ticketPolicyChanged, ticketReport, ticketRequestStatus, ticketResume, ticketRetry, ticketStage, ticketStop, ticketWaiting]));
const trigger = Command.make("trigger").pipe(Command.withSubcommands([triggerHandback, triggerReceive, triggerReevaluate, triggerRequeue]));

Command.make("superagent").pipe(
  Command.withSubcommands([account, agent, assignment, decision, eval_, input, mandate, outgoingMessage, policy, promptSet, proposal, settings, source, superagent, thread, ticket, trigger]),
  Command.run({ version: typeof ORTHO_VERSION === "string" ? ORTHO_VERSION : "0.0.0" }),
  Effect.provide(CliOutput.layer({ ...CliOutput.defaultFormatter(), formatVersion: (name, version) => `${name} ${version}` })),
  Effect.provide(Sdk.layer(process.env["SUPERAGENT_URL"] ?? "http://127.0.0.1:8787", process.env["SUPERAGENT_TOKEN"])),
  Effect.provide(Layer.succeed(ExitCode, ExitCode.of({ set: (code) => Effect.sync(() => void (process.exitCode = code)) }))),
  Effect.provide(NodeServices.layer),
  NodeRuntime.runMain,
);
