import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { ManagerWoken } from "../events.ts";
import { member } from "../../workspace/roles.ts";
import { Body } from "../../../values/coworker.ts";

export default Blueprint.operation(Manager, {
  description: "Say something to a manager. It answers in its conversation; nothing is held open.",
  payload: { manager: Manager.fields.id, text: Body },
  answer: {},
  emits: [ManagerWoken],
  allowed: [member.of("manager")],
  steps: { record: Blueprint.step.database() },
  idempotent: "request",
});
// GAP realtime: the answer streams. No row in the status page covers a live read; the old app polls every 0.6 seconds.
