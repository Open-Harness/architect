import { EventEvals } from "../event-evals/service.ts";
import { InvariantEvals } from "../invariant-evals/service.ts";
import { JourneyEvals } from "../journey-evals/service.ts";
import { MachineEvals } from "../machine-evals/service.ts";
import { OperationEvals } from "../operation-evals/service.ts";
import { RefusalSourceEvals } from "../refusal-source-evals/service.ts";
import { StepEvals } from "../step-evals/service.ts";
import { ThingEvals } from "../thing-evals/service.ts";
import type { ProjectEvalsApi } from "./types.ts";

export const ProjectEvals: ProjectEvalsApi = {
  evals: [...OperationEvals.evals, ...ThingEvals.evals, ...StepEvals.evals, ...MachineEvals.evals, ...EventEvals.evals, ...JourneyEvals.evals, ...RefusalSourceEvals.evals, ...InvariantEvals.evals],
};
