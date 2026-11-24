import { Blueprint } from "orthograph";
import superagentPlugin, { events as superagentEvents } from "@orthograph/superagent";
import { processing } from "@orthograph/superagent/blueprint/things/superagent/holds.ts";
import * as intake from "@orthograph/intake";
import * as tickets from "@orthograph/tickets";
import * as agents from "@orthograph/agents";
import fill from "../things/superagent/verbs/fill.ts";

export default Blueprint.use(superagentPlugin);

// Plugins stay independent: the one place that names what the switch holds is this file (GOAL17-pause). Each row is one delivery,
// an event and the operation its outbox hop calls; every event named carries `superagent`, which becomes the row's hold.
const superagent = { events: superagentEvents, operations: { fill } };
const evaluation = intake.things.eval;
const { input, assignment, outgoingMessage, mandate } = tickets.things;
const { agent } = agents.things;

export const pausable = processing.holds({
  held: [                                                        // the row stays pending; the drain skips it
    { event: intake.events.EvalStarted, to: evaluation.operations.delivered },        // starts the eval's clock, so it waits
    { event: intake.events.EvalDelivered, to: agent.operations.tell },                // the eval, told to the main agent
    { event: tickets.events.InputRouted, to: agent.operations.tell },                 // any message, a person's too, to a running executor
    { event: tickets.events.AssignmentQueued, to: superagent.operations.fill },       // a waiting Assignment gets a seat only through fill
    { event: tickets.events.AssignmentEnded, to: superagent.operations.fill },        // a freed seat is not refilled
    { event: tickets.events.AssignmentEnded, to: input.operations.route },            // an Input that waited behind a closed Assignment queues a new one
    { event: tickets.events.AssignmentPromoted, to: superagent.operations.fill },     // a person's Input moved a pending Assignment up
    { event: tickets.events.AssignmentStarted, to: agent.operations.tell },           // a launch or a wake: the Input that woke it
    { event: tickets.events.AssignmentStarted, to: input.operations.route },          // the other Inputs that waited for the seat
    { event: tickets.events.ReplyQueued, to: outgoingMessage.operations.send },       // replies and acknowledgements
    { event: tickets.events.TicketCreated, to: outgoingMessage.operations.reply },    // the acknowledgement of a new ticket
    { event: tickets.events.TicketResumed, to: mandate.operations.revalidate },       // a resume waits, and revalidates its mandate when it goes
    { event: intake.events.TriggerRequeued, to: evaluation.operations.due },          // a requeued trigger waits for the next pass
    { event: intake.events.DecisionRecorded, to: evaluation.operations.due },         // a recorded decision frees its thread for the next pass
    { event: intake.events.ThreadUnsubscribed, to: evaluation.operations.due },       // an unfollowed thread's triggers wait for the next pass
  ],
  unheld: [                                                      // each says why it is not held
    { event: tickets.events.InputStored, to: input.operations.route, reason: "rows only: routes an Input or queues an Assignment; the tell and the seat stay held" },
    { event: agents.events.AgentIdled, to: assignment.operations.turnEnded, reason: "a turn that ends during a pause gives its seat back; fill stays held" },
    { event: agents.events.AgentClosed, to: assignment.operations.turnEnded, reason: "the acknowledgement that frees a closing seat, in a pause too" },
    { event: tickets.events.AssignmentInterrupted, to: agent.operations.close, reason: "a person's stop must reach the Agent during a pause; it moves no work" },
    { event: intake.events.TriggerReceived, to: input.operations.store, reason: "sources keep recording; the Input's tell stays held" },
    { event: superagent.events.SuperagentCreated, to: evaluation.operations.due, reason: "starts the eval pass; a new superagent is never paused" },
    { event: superagent.events.SuperagentResumed, to: evaluation.operations.due, reason: "the event that ends the hold" },
    { event: superagent.events.SuperagentResumed, to: superagent.operations.fill, reason: "the event that ends the hold" },
    { event: tickets.events.TicketEnded, to: outgoingMessage.operations.withdraw, reason: "an ended ticket's pending replies are dropped, in a pause too" },
    { event: intake.events.ThreadSubscribed, to: evaluation.operations.due, reason: "rows only: the pass reads which threads a ticket follows" },
    { event: intake.events.PolicyChanged, to: tickets.things.ticket.operations.policyChanged, reason: "a policy change reaches live tickets and mandates in a pause too" },
  ],
});
