// Slice 8, the seats (GOAL17-executor-slots): a full pool keeps its slot for a person; a message routed as a turn ends gets a new seat and an executor is
// never steered without one; a handed-off or a stopped ticket does not get a seat back; a person's message after a CI result promotes the pending
// Assignment; `promoted` is skipped when `why` is already `person`. Red until slice 9 builds slots and the agents.
import { journeysPass } from "./agents-support.ts";

journeysPass("the seats", [
  "a-full-pool-keeps-its-slot-for-a-person", "a-message-routed-as-a-turn-ends-gets-a-new-seat", "a-handed-off-ticket-does-not-get-a-seat-back",
  "a-stopped-ticket-does-not-get-a-seat-back", "a-persons-message-after-a-ci-result-promotes-the-pending-assignment", "promoted-is-skipped-when-the-reason-is-already-a-person",
]);
