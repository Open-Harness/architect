// Generated from the blueprint. Do not edit.
import type { McpEntry } from "@orthograph/language-effect";
import { declaration as accountList } from "../../api/src/account/list.ts";
import { declaration as accountSeen } from "../../api/src/account/seen.ts";
import { declaration as accountSync } from "../../api/src/account/sync.ts";
import { declaration as accountUnlist } from "../../api/src/account/unlist.ts";
import { declaration as agentClose } from "../../api/src/agent/close.ts";
import { declaration as agentOpen } from "../../api/src/agent/open.ts";
import { declaration as agentTell } from "../../api/src/agent/tell.ts";
import { declaration as assignmentCancelled } from "../../api/src/assignment/cancelled.ts";
import { declaration as assignmentInterrupted } from "../../api/src/assignment/interrupted.ts";
import { declaration as assignmentPromoted } from "../../api/src/assignment/promoted.ts";
import { declaration as assignmentQueued } from "../../api/src/assignment/queued.ts";
import { declaration as assignmentStarted } from "../../api/src/assignment/started.ts";
import { declaration as assignmentTurnEnded } from "../../api/src/assignment/turn-ended.ts";
import { declaration as assignmentWaiting } from "../../api/src/assignment/waiting.ts";
import { declaration as decisionDismiss } from "../../api/src/decision/dismiss.ts";
import { declaration as decisionRoute } from "../../api/src/decision/route.ts";
import { declaration as evalContext } from "../../api/src/eval/context.ts";
import { declaration as evalDecide } from "../../api/src/eval/decide.ts";
import { declaration as evalDelivered } from "../../api/src/eval/delivered.ts";
import { declaration as evalDue } from "../../api/src/eval/due.ts";
import { declaration as evalRead } from "../../api/src/eval/read.ts";
import { declaration as evalStart } from "../../api/src/eval/start.ts";
import { declaration as inputDelivered } from "../../api/src/input/delivered.ts";
import { declaration as inputDeliveryFailed } from "../../api/src/input/delivery-failed.ts";
import { declaration as inputRead } from "../../api/src/input/read.ts";
import { declaration as inputRequeue } from "../../api/src/input/requeue.ts";
import { declaration as inputRoute } from "../../api/src/input/route.ts";
import { declaration as inputStore } from "../../api/src/input/store.ts";
import { declaration as mandateRevalidate } from "../../api/src/mandate/revalidate.ts";
import { declaration as outgoingMessageReply } from "../../api/src/outgoing-message/reply.ts";
import { declaration as outgoingMessageRetry } from "../../api/src/outgoing-message/retry.ts";
import { declaration as outgoingMessageSend } from "../../api/src/outgoing-message/send.ts";
import { declaration as outgoingMessageWithdraw } from "../../api/src/outgoing-message/withdraw.ts";
import { declaration as policyGet } from "../../api/src/policy/get.ts";
import { declaration as policyHistory } from "../../api/src/policy/history.ts";
import { declaration as policyRestore } from "../../api/src/policy/restore.ts";
import { declaration as policySave } from "../../api/src/policy/save.ts";
import { declaration as policySync } from "../../api/src/policy/sync.ts";
import { declaration as promptSetCompose } from "../../api/src/prompt-set/compose.ts";
import { declaration as promptSetHistory } from "../../api/src/prompt-set/history.ts";
import { declaration as promptSetPreview } from "../../api/src/prompt-set/preview.ts";
import { declaration as promptSetSave } from "../../api/src/prompt-set/save.ts";
import { declaration as proposalApprove } from "../../api/src/proposal/approve.ts";
import { declaration as proposalPropose } from "../../api/src/proposal/propose.ts";
import { declaration as proposalReject } from "../../api/src/proposal/reject.ts";
import { declaration as proposalWaiting } from "../../api/src/proposal/waiting.ts";
import { declaration as settingsSave } from "../../api/src/settings/save.ts";
import { declaration as sourceDisable } from "../../api/src/source/disable.ts";
import { declaration as sourceEnable } from "../../api/src/source/enable.ts";
import { declaration as sourcePositionAdvanced } from "../../api/src/source/position-advanced.ts";
import { declaration as sourceProblem } from "../../api/src/source/problem.ts";
import { declaration as sourceSave } from "../../api/src/source/save.ts";
import { declaration as superagentBoot } from "../../api/src/superagent/boot.ts";
import { declaration as superagentCreate } from "../../api/src/superagent/create.ts";
import { declaration as superagentFill } from "../../api/src/superagent/fill.ts";
import { declaration as superagentGoLive } from "../../api/src/superagent/go-live.ts";
import { declaration as superagentHealth } from "../../api/src/superagent/health.ts";
import { declaration as superagentPause } from "../../api/src/superagent/pause.ts";
import { declaration as superagentReap } from "../../api/src/superagent/reap.ts";
import { declaration as superagentResume } from "../../api/src/superagent/resume.ts";
import { declaration as superagentRetire } from "../../api/src/superagent/retire.ts";
import { declaration as superagentUpdate } from "../../api/src/superagent/update.ts";
import { declaration as threadBind } from "../../api/src/thread/bind.ts";
import { declaration as threadClosed } from "../../api/src/thread/closed.ts";
import { declaration as threadFollow } from "../../api/src/thread/follow.ts";
import { declaration as threadUnrelated } from "../../api/src/thread/unrelated.ts";
import { declaration as threadUnsubscribe } from "../../api/src/thread/unsubscribe.ts";
import { declaration as ticketAccept } from "../../api/src/ticket/accept.ts";
import { declaration as ticketAck } from "../../api/src/ticket/ack.ts";
import { declaration as ticketAttach } from "../../api/src/ticket/attach.ts";
import { declaration as ticketEnd } from "../../api/src/ticket/end.ts";
import { declaration as ticketNote } from "../../api/src/ticket/note.ts";
import { declaration as ticketPolicyChanged } from "../../api/src/ticket/policy-changed.ts";
import { declaration as ticketReport } from "../../api/src/ticket/report.ts";
import { declaration as ticketRequestStatus } from "../../api/src/ticket/request-status.ts";
import { declaration as ticketResume } from "../../api/src/ticket/resume.ts";
import { declaration as ticketRetry } from "../../api/src/ticket/retry.ts";
import { declaration as ticketStage } from "../../api/src/ticket/stage.ts";
import { declaration as ticketStop } from "../../api/src/ticket/stop.ts";
import { declaration as ticketWaiting } from "../../api/src/ticket/waiting.ts";
import { declaration as triggerHandback } from "../../api/src/trigger/handback.ts";
import { declaration as triggerReceive } from "../../api/src/trigger/receive.ts";
import { declaration as triggerReevaluate } from "../../api/src/trigger/reevaluate.ts";
import { declaration as triggerRequeue } from "../../api/src/trigger/requeue.ts";

/** One tool per operation and read, named as the operation is. */
export const catalog = {
  "account.list": { description: "Let an account ask: its person's words may then start work. Refuses AccountExists when another account holds this superagent, source and external.", operation: accountList, states: ["seen","listed","unlisted"], move: {"key":"list","from":["seen","unlisted"],"to":["listed"],"emits":"AccountListed"} },
  "account.seen": { description: "Record an account an event came from: a new one is seen, a known one keeps its state. Refuses AccountExists when another account holds this superagent, source and external.", operation: accountSeen, states: ["seen","listed","unlisted"], move: {"key":"seen","from":[],"to":["seen"],"emits":"AccountSeen"} },
  "account.sync": { description: "List the accounts a connection's own roster names: a repository's collaborators, a user group.", operation: accountSync, states: ["seen","listed","unlisted"] },
  "account.unlist": { description: "Stop letting an account ask. Refuses AccountExists when another account holds this superagent, source and external.", operation: accountUnlist, states: ["seen","listed","unlisted"], move: {"key":"unlist","from":["listed"],"to":["unlisted"],"emits":"AccountUnlisted"} },
  "agent.close": { description: "Stop an agent's turn for one Assignment and say so: the seat that held it is then free.", operation: agentClose, states: ["idle","working","stopped"], move: {"key":"close","from":["idle","working"],"to":["idle","stopped"],"emits":"AgentClosed"} },
  "agent.open": { description: "Make an agent of one kind, about one thing: any operation allowed to create one makes it.", operation: agentOpen, states: ["idle","working","stopped"], move: {"key":"open","from":[],"to":["idle"],"emits":"AgentOpened"} },
  "agent.tell": { description: "Give an agent one input, steering it when it is busy. Only an outbox hop calls it, with the delivering event's id as the request id.", operation: agentTell, states: ["idle","working","stopped"], move: {"key":"tell","from":["idle","working"],"to":["working"],"emits":"AgentTold"} },
  "assignment.cancelled": { description: "End a pending Assignment that was never seated or told.", operation: assignmentCancelled, states: ["pending","running","closing","ended"], move: {"key":"cancelled","from":["pending"],"to":["ended"],"emits":"AssignmentEnded"} },
  "assignment.interrupted": { description: "Close a running Assignment: a stop, a retire or a reap. It keeps its seat until the Agent says it closed. Refuses SeatTaken when another running or closing assignment holds this superagent and seat. Refuses ExecutorAlreadyQueued when another pending, running or closing assignment holds this agent.", operation: assignmentInterrupted, states: ["pending","running","closing","ended"], move: {"key":"interrupted","from":["running"],"to":["closing"],"emits":"AssignmentInterrupted"} },
  "assignment.promoted": { description: "A person's Input on a pending Assignment moves it up: its reason becomes a person's. Refuses ExecutorAlreadyQueued when another pending, running or closing assignment holds this agent.", operation: assignmentPromoted, states: ["pending","running","closing","ended"], move: {"key":"promoted","from":["pending"],"to":["pending"],"emits":"AssignmentPromoted"} },
  "assignment.queued": { description: "Queue an Assignment for a ticket's executor: an accept, an Input or a resume. It names the Input that woke it. Refuses ExecutorAlreadyQueued when another pending, running or closing assignment holds this agent.", operation: assignmentQueued, states: ["pending","running","closing","ended"], move: {"key":"queued","from":[],"to":["pending"],"emits":"AssignmentQueued"} },
  "assignment.started": { description: "Give a waiting Assignment a seat, if one is free for it. Refuses SeatTaken when another running or closing assignment holds this superagent and seat. Refuses ExecutorAlreadyQueued when another pending, running or closing assignment holds this agent.", operation: assignmentStarted, states: ["pending","running","closing","ended"], move: {"key":"started","from":["pending"],"to":["running"],"emits":"AssignmentStarted"} },
  "assignment.turn-ended": { description: "The Agent idled on this Assignment or closed it: it ends, and its seat is free.", operation: assignmentTurnEnded, states: ["pending","running","closing","ended"], move: {"key":"turnEnded","from":["running","closing"],"to":["ended"],"emits":"AssignmentEnded"} },
  "assignment.waiting": { description: "List assignments, oldest first, 255 to a page, filtered by superagent.", operation: assignmentWaiting, states: ["pending","running","closing","ended"] },
  "decision.dismiss": { description: "Set aside a decision a person disagrees with.", operation: decisionDismiss, states: ["recorded","dismissed"], move: {"key":"dismiss","from":["recorded"],"to":["dismissed"],"emits":"DecisionDismissed"} },
  "decision.route": { description: "Route an eval's items: one to twenty, each accept, attach, stop or ignore. In observe an accept is only recorded as one it would make.", operation: decisionRoute, states: ["recorded","dismissed"], move: {"key":"route","from":[],"to":["recorded"],"emits":"DecisionRecorded"} },
  "eval.context": { description: "Read what a judgement needs: the thread's history and what else it touches.", operation: evalContext, states: ["queued","delivered","decided","unavailable"] },
  "eval.decide": { description: "Record one judgement per enabled rule.", operation: evalDecide, states: ["queued","delivered","decided","unavailable"], move: {"key":"decided","from":["delivered"],"to":["decided"],"emits":"EvalDecided"} },
  "eval.delivered": { description: "Start an eval's clock when it is told to the main agent: a held hop, so a pause never starts it.", operation: evalDelivered, states: ["queued","delivered","decided","unavailable"], move: {"key":"delivered","from":["queued"],"to":["delivered"],"emits":"EvalDelivered"} },
  "eval.due": { description: "One pass of the eval clock: batch each thread's waiting triggers into an eval, and expire the ones that ran out of time. Not armed again while paused.", operation: evalDue, states: ["queued","delivered","decided","unavailable"] },
  "eval.read": { description: "Read one page of a thread, through its connection.", operation: evalRead, states: ["queued","delivered","decided","unavailable"] },
  "eval.start": { description: "Make an eval for one thread's waiting triggers.", operation: evalStart, states: ["queued","delivered","decided","unavailable"], move: {"key":"started","from":[],"to":["queued"],"emits":"EvalStarted"} },
  "input.delivered": { description: "The executor took the Input.", operation: inputDelivered, states: ["waiting","routed","delivered","failed"], move: {"key":"delivered","from":["routed"],"to":["delivered"],"emits":"InputDelivered"} },
  "input.delivery-failed": { description: "The outbox gave up telling the executor.", operation: inputDeliveryFailed, states: ["waiting","routed","delivered","failed"], move: {"key":"failed","from":["routed"],"to":["failed"],"emits":"InputFailed"} },
  "input.read": { description: "Read one Input's text.", operation: inputRead, states: ["waiting","routed","delivered","failed"] },
  "input.requeue": { description: "Put a refused or failed Input back to waiting, after a short wait that grows with each refusal.", operation: inputRequeue, states: ["waiting","routed","delivered","failed"], move: {"key":"requeued","from":["routed","failed"],"to":["waiting"],"emits":"InputStored"} },
  "input.route": { description: "Send a waiting Input to its running executor, or queue the Assignment that will start one.", operation: inputRoute, states: ["waiting","routed","delivered","failed"], move: {"key":"routed","from":["waiting"],"to":["routed"],"emits":"InputRouted"} },
  "input.store": { description: "Store a message for a ticket's executor: a person's, or a followed thread's trigger.", operation: inputStore, states: ["waiting","routed","delivered","failed"], move: {"key":"stored","from":[],"to":["waiting"],"emits":"InputStored"} },
  "mandate.revalidate": { description: "Check a ticket's mandate against the policy as it is now, before the ticket resumes.", operation: mandateRevalidate, states: ["held","withdrawn","revoked"], move: {"key":"revalidate","from":["withdrawn","held"],"to":["held","revoked"],"emits":"MandateRevalidated"} },
  "outgoing-message.reply": { description: "Queue a reply: by purpose, in order within its conversation. Only the head of a conversation has an outbox row.", operation: outgoingMessageReply, states: ["pending","sent","dropped"], move: {"key":"queued","from":[],"to":["pending"],"emits":"ReplyQueued"} },
  "outgoing-message.retry": { description: "Queue a failed reply again, once its wait has passed.", operation: outgoingMessageRetry, states: ["pending","sent","dropped"], move: {"key":"requeued","from":["pending"],"to":["pending"],"emits":"ReplyQueued"} },
  "outgoing-message.send": { description: "Send a conversation's head through its connection. A failed call is counted and queued again; the outbox always sees a success.", operation: outgoingMessageSend, states: ["pending","sent","dropped"], move: {"key":"settled","from":["pending"],"to":["pending","sent","dropped"],"emits":"ReplySettled"} },
  "outgoing-message.withdraw": { description: "Drop a ticket's pending replies: it ended, or its superagent retired.", operation: outgoingMessageWithdraw, states: ["pending","sent","dropped"], move: {"key":"withdrawn","from":["pending"],"to":["dropped"],"emits":"ReplyWithdrawn"} },
  "policy.get": { description: "Read the policy: the current version, or the one named.", operation: policyGet, states: ["current"] },
  "policy.history": { description: "Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step.", operation: policyHistory, states: ["current"] },
  "policy.restore": { description: "Save an earlier version again, as a new one.", operation: policyRestore, states: ["current"], move: {"key":"restore","from":["current"],"to":["current"],"emits":"PolicyChanged"} },
  "policy.save": { description: "Save a new version of the policy. A save made from an older version is refused, with the current one.", operation: policySave, states: ["current"], move: {"key":"save","from":[],"to":["current"],"emits":"PolicyChanged"} },
  "policy.sync": { description: "List the accounts a connection's roster names.", operation: policySync, states: ["current"] },
  "prompt-set.compose": { description: "Make the prompt for one agent's model request, from the current version.", operation: promptSetCompose },
  "prompt-set.history": { description: "Every saved version, newest first: its number, when, by whom, and the one it was made from. One list for each, in step.", operation: promptSetHistory },
  "prompt-set.preview": { description: "Show the prompt an agent of one kind would get, with a draft applied.", operation: promptSetPreview },
  "prompt-set.save": { description: "Save a new version of the prompts. A save made from an older version is refused, with the current one.", operation: promptSetSave },
  "proposal.approve": { description: "Apply a proposal. Only a signed-in person, through a session: text that reached a model is never an approval.", operation: proposalApprove, states: ["waiting","approved","rejected"], move: {"key":"approve","from":["waiting"],"to":["approved"],"emits":"ProposalApproved"} },
  "proposal.propose": { description: "Record what a main agent would change, and why: nothing changes until a person approves it.", operation: proposalPropose, states: ["waiting","approved","rejected"], move: {"key":"propose","from":[],"to":["waiting"],"emits":"ProposalRecorded"} },
  "proposal.reject": { description: "Turn a proposal down.", operation: proposalReject, states: ["waiting","approved","rejected"], move: {"key":"reject","from":["waiting"],"to":["rejected"],"emits":"ProposalRejected"} },
  "proposal.waiting": { description: "List proposals, oldest first, 25 to a page, filtered by superagent.", operation: proposalWaiting, states: ["waiting","approved","rejected"] },
  "settings.save": { description: "Save a new version of the settings. A save made from an older version is refused, with the current one. A main agent may only propose it.", operation: settingsSave, states: ["current"], move: {"key":"save","from":[],"to":["current"],"emits":"SettingsSaved"} },
  "source.disable": { description: "Stop listening on a connection; its triggers already recorded stay.", operation: sourceDisable, states: ["setup","ready","paused","error","off"], move: {"key":"disable","from":["setup","ready","paused","error"],"to":["paused","off"],"emits":"SourceDisabled"} },
  "source.enable": { description: "Start listening on a connection.", operation: sourceEnable, states: ["setup","ready","paused","error","off"], move: {"key":"enable","from":["setup","paused","off","error"],"to":["ready"],"emits":"SourceEnabled"} },
  "source.position-advanced": { description: "Record how far a connection has read, after a poll.", operation: sourcePositionAdvanced, states: ["setup","ready","paused","error","off"], move: {"key":"advance","from":["ready"],"to":["ready"],"emits":"SourcePositionAdvanced"} },
  "source.problem": { description: "Say a connection has failed three polls in a row: it shows as a problem until a poll succeeds.", operation: sourceProblem, states: ["setup","ready","paused","error","off"], move: {"key":"fail","from":["ready"],"to":["error"],"emits":"SourceFailed"} },
  "source.save": { description: "Save a connection: its kind and its configuration.", operation: sourceSave, states: ["setup","ready","paused","error","off"], move: {"key":"save","from":[],"to":["setup"],"emits":"SourceSaved"} },
  "superagent.boot": { description: "The world's once-a-minute backstop: arm each live superagent's eval pass and sweeps that a restart lost.", operation: superagentBoot, states: ["observing","live","paused","retired"] },
  "superagent.create": { description: "Make a superagent, with its main agent, observing.", operation: superagentCreate, states: ["observing","live","paused","retired"], move: {"key":"create","from":[],"to":["observing"],"emits":"SuperagentCreated"} },
  "superagent.fill": { description: "Start waiting Assignments, in line, while seats are free. Does nothing while paused.", operation: superagentFill, states: ["observing","live","paused","retired"] },
  "superagent.go-live": { description: "Let a superagent act: a person, after reading what it would have accepted.", operation: superagentGoLive, states: ["observing","live","paused","retired"], move: {"key":"goLive","from":["observing"],"to":["live"],"emits":"SuperagentWentLive"} },
  "superagent.health": { description: "Read one superagent by its id: name, state, pausedAt.", operation: superagentHealth, states: ["observing","live","paused","retired"] },
  "superagent.pause": { description: "Hold evals, launches, deliveries and replies; sources keep recording. Only a person, through a session.", operation: superagentPause, states: ["observing","live","paused","retired"], move: {"key":"pause","from":["observing","live"],"to":["paused"],"emits":"SuperagentPaused"} },
  "superagent.reap": { description: "Close the running Assignments whose executor is idle, so their seats come back once the Agent has said it closed.", operation: superagentReap, states: ["observing","live","paused","retired"] },
  "superagent.resume": { description: "Let held work go, and move every eval's deadline later by the pause's length. Only a person, through a session.", operation: superagentResume, states: ["observing","live","paused","retired"], move: {"key":"resume","from":["paused"],"to":["observing","live"],"emits":"SuperagentResumed"} },
  "superagent.retire": { description: "Close a superagent's connections and agents.", operation: superagentRetire, states: ["observing","live","paused","retired"], move: {"key":"retire","from":["observing","live","paused"],"to":["retired"],"emits":"SuperagentRetired"} },
  "superagent.update": { description: "Save a superagent's configuration as a new version; a stale save is refused.", operation: superagentUpdate, states: ["observing","live","paused","retired"] },
  "thread.bind": { description: "Make the thread an event belongs to, once, for this superagent.", operation: threadBind, states: ["idle","queued","evaluating"], move: {"key":"bind","from":[],"to":["idle"],"emits":"ThreadSubscribed"} },
  "thread.closed": { description: "Say a thread closed: a merged pull request, a closed issue.", operation: threadClosed, states: ["idle","queued","evaluating"], move: {"key":"closed","from":["idle","queued","evaluating"],"to":["idle"],"emits":"ThreadClosed"} },
  "thread.follow": { description: "The executor follows a thread: its next messages go straight to it, with no eval. Refuses AlreadyFollowing when another live subscription holds this ticket and thread.", operation: threadFollow, states: ["idle","queued","evaluating"] },
  "thread.unrelated": { description: "The executor says a thread has nothing to do with its ticket. Refuses AlreadyFollowing when another live subscription holds this ticket and thread.", operation: threadUnrelated, states: ["idle","queued","evaluating"] },
  "thread.unsubscribe": { description: "Stop a ticket following a thread: a person's call, or the main agent's.", operation: threadUnsubscribe, states: ["idle","queued","evaluating"], move: {"key":"unsubscribe","from":["idle","queued","evaluating"],"to":["idle"],"emits":"ThreadUnsubscribed"} },
  "ticket.accept": { description: "Make a ticket from an accepted trigger: its mandate, subscription, first assignment and first input, in one commit. Refuses SeatTaken when another running or closing assignment holds this superagent and seat. Refuses ExecutorAlreadyQueued when another pending, running or closing assignment holds this agent. Refuses AlreadyFollowing when another live subscription holds this ticket and thread.", operation: ticketAccept, states: ["open","ended","stopped"], move: {"key":"accept","from":[],"to":["open"],"emits":"TicketCreated"} },
  "ticket.ack": { description: "The executor acknowledges the message it was woken by, once, in one short reply.", operation: ticketAck, states: ["open","ended","stopped"] },
  "ticket.attach": { description: "Attach another thread to a ticket.", operation: ticketAttach, states: ["open","ended","stopped"] },
  "ticket.end": { description: "End a ticket: the reported work is ready, its threads are closed, or the playbook says so. Its executor stays, idle.", operation: ticketEnd, states: ["open","ended","stopped"], move: {"key":"end","from":["open"],"to":["ended"],"emits":"TicketEnded"} },
  "ticket.note": { description: "Write a note on a ticket that does not wake its executor.", operation: ticketNote, states: ["open","ended","stopped"] },
  "ticket.policy-changed": { description: "Tell the live tickets the policy changed under them.", operation: ticketPolicyChanged, states: ["open","ended","stopped"] },
  "ticket.report": { description: "The executor says how the work stands: progress, waiting, ready, blocked, failed or dropped.", operation: ticketReport, states: ["open","ended","stopped"] },
  "ticket.request-status": { description: "Ask a ticket's executor where it stands; a person's request may use the seat kept for a person.", operation: ticketRequestStatus, states: ["open","ended","stopped"] },
  "ticket.resume": { description: "Wake an ended ticket on a person's message, after its mandate is revalidated: the same executor, with its memory.", operation: ticketResume, states: ["open","ended","stopped"], move: {"key":"resume","from":["ended"],"to":["open"],"emits":"TicketResumed"} },
  "ticket.retry": { description: "Send a failed input again.", operation: ticketRetry, states: ["open","ended","stopped"] },
  "ticket.stage": { description: "Read one ticket by its id: superagent, title, state.", operation: ticketStage, states: ["open","ended","stopped"] },
  "ticket.stop": { description: "Stop a ticket: its mandate is withdrawn and its executor's turn closed.", operation: ticketStop, states: ["open","ended","stopped"], move: {"key":"stop","from":["open","ended"],"to":["stopped"],"emits":"TicketStopped"} },
  "ticket.waiting": { description: "List tickets, newest first, 50 to a page, filtered by superagent, stage.", operation: ticketWaiting, states: ["open","ended","stopped"] },
  "trigger.handback": { description: "The executor hands a trigger back: it was not its to answer.", operation: triggerHandback, states: ["stored"] },
  "trigger.receive": { description: "Store one event a connection brought, once: a second delivery of the same event is a duplicate, and one the policy filters is not kept.", operation: triggerReceive, states: ["stored"], move: {"key":"receive","from":[],"to":["stored"],"emits":"TriggerReceived"} },
  "trigger.reevaluate": { description: "Ask the main agent to judge a trigger again.", operation: triggerReevaluate, states: ["stored"] },
  "trigger.requeue": { description: "Put a trigger back for evaluation.", operation: triggerRequeue, states: ["stored"], move: {"key":"requeue","from":["stored"],"to":["stored"],"emits":"TriggerRequeued"} },
} as const satisfies { readonly [name: string]: McpEntry };
