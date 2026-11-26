import { Blueprint } from "orthograph";
import { Manager } from "../thing.ts";
import { machine } from "../machine.ts";
import { builder } from "../../workspace/roles.ts";
import { itsManager } from "../roles.ts";

export default Blueprint.operation(Manager, {
  description: "Make a manager for a job, under another. The root is made with the workspace, and makes most of the rest.",
  payload: { workspace: Manager.fields.workspace, name: Manager.fields.name, job: Manager.fields.job, above: Manager.fields.above },
  answer: { manager: Manager.fields.id },
  move: machine.moves.create,
  allowed: [builder.of("above"), itsManager.of("above")], // a person who may build, or the manager above it
  steps: { insert: Blueprint.step.database() },
  idempotent: "request",
});
