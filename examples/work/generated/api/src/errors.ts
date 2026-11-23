// Generated from the blueprint. Do not edit.
import { Schema } from "effect";
import { ErrorNames, wireStruct } from "orthograph/server";
import * as Mission from "../../../blueprint/things/mission/errors.ts";
import * as Question from "../../../blueprint/things/question/errors.ts";
import * as Run from "../../../blueprint/things/run/errors.ts";

/** Every refusal's code, its exit for the CLI and its HTTP status: one row each, read by the CLI, HTTP and MCP. */
export const refusals = {
  MissionHasOpenQuestions: { code: "MS-001", exit: 51, status: 422 },
  MissionNotRunning: { code: "MS-002", exit: 56, status: 422 },
  MissionNotInIntake: { code: "MS-003", exit: 57, status: 422 },
  MissionHasOpenTasks: { code: "MS-004", exit: 58, status: 422 },
  MissionClosed: { code: "MS-005", exit: 59, status: 422 },
  QuestionNoSuchOption: { code: "QU-001", exit: 54, status: 422 },
  RunOverBudget: { code: "RU-001", exit: 61, status: 422 },
  RunAgentCannot: { code: "RU-002", exit: 62, status: 422 },
  RunTaskClaimed: { code: "RU-003", exit: 63, status: 422 },
  AttentionNotOpen: { code: "AT-900", exit: 55, status: 409 },
  MilestoneNotActive: { code: "ML-900", exit: 52, status: 409 },
  MissionNotIntake: { code: "MS-900", exit: 50, status: 409 },
  QuestionNotAsked: { code: "QU-900", exit: 53, status: 409 },
  RunNotRunning: { code: "RU-900", exit: 60, status: 409 },
  AttentionNotFound: { code: "AT-901", exit: 4, status: 404 },
  MilestoneNotFound: { code: "ML-901", exit: 4, status: 404 },
  QuestionNotFound: { code: "QU-901", exit: 4, status: 404 },
  RunNotFound: { code: "RU-901", exit: 4, status: 404 },
  NotAllowed: { code: "AR-001", exit: 3, status: 403 },
  IdempotencyConflict: { code: "AR-002", exit: 120, status: 409 },
} as const;
type Refusal = keyof typeof refusals;

ErrorNames.name(Mission.MissionHasOpenQuestions, "MissionHasOpenQuestions");
export class MissionHasOpenQuestions extends Schema.TaggedError<MissionHasOpenQuestions>()("MissionHasOpenQuestions", { code: Schema.Literal(refusals.MissionHasOpenQuestions.code), ...wireStruct(Mission.MissionHasOpenQuestions.fields).fields }, { httpApiStatus: refusals.MissionHasOpenQuestions.status }) { static readonly code = refusals.MissionHasOpenQuestions.code; }
ErrorNames.name(Mission.MissionNotRunning, "MissionNotRunning");
export class MissionNotRunning extends Schema.TaggedError<MissionNotRunning>()("MissionNotRunning", { code: Schema.Literal(refusals.MissionNotRunning.code), ...wireStruct(Mission.MissionNotRunning.fields).fields }, { httpApiStatus: refusals.MissionNotRunning.status }) { static readonly code = refusals.MissionNotRunning.code; }
ErrorNames.name(Mission.MissionNotInIntake, "MissionNotInIntake");
export class MissionNotInIntake extends Schema.TaggedError<MissionNotInIntake>()("MissionNotInIntake", { code: Schema.Literal(refusals.MissionNotInIntake.code), ...wireStruct(Mission.MissionNotInIntake.fields).fields }, { httpApiStatus: refusals.MissionNotInIntake.status }) { static readonly code = refusals.MissionNotInIntake.code; }
ErrorNames.name(Mission.MissionHasOpenTasks, "MissionHasOpenTasks");
export class MissionHasOpenTasks extends Schema.TaggedError<MissionHasOpenTasks>()("MissionHasOpenTasks", { code: Schema.Literal(refusals.MissionHasOpenTasks.code), ...wireStruct(Mission.MissionHasOpenTasks.fields).fields }, { httpApiStatus: refusals.MissionHasOpenTasks.status }) { static readonly code = refusals.MissionHasOpenTasks.code; }
ErrorNames.name(Mission.MissionClosed, "MissionClosed");
export class MissionClosed extends Schema.TaggedError<MissionClosed>()("MissionClosed", { code: Schema.Literal(refusals.MissionClosed.code), ...wireStruct(Mission.MissionClosed.fields).fields }, { httpApiStatus: refusals.MissionClosed.status }) { static readonly code = refusals.MissionClosed.code; }
ErrorNames.name(Question.QuestionNoSuchOption, "QuestionNoSuchOption");
export class QuestionNoSuchOption extends Schema.TaggedError<QuestionNoSuchOption>()("QuestionNoSuchOption", { code: Schema.Literal(refusals.QuestionNoSuchOption.code), ...wireStruct(Question.QuestionNoSuchOption.fields).fields }, { httpApiStatus: refusals.QuestionNoSuchOption.status }) { static readonly code = refusals.QuestionNoSuchOption.code; }
ErrorNames.name(Run.RunOverBudget, "RunOverBudget");
export class RunOverBudget extends Schema.TaggedError<RunOverBudget>()("RunOverBudget", { code: Schema.Literal(refusals.RunOverBudget.code), ...wireStruct(Run.RunOverBudget.fields).fields }, { httpApiStatus: refusals.RunOverBudget.status }) { static readonly code = refusals.RunOverBudget.code; }
ErrorNames.name(Run.RunAgentCannot, "RunAgentCannot");
export class RunAgentCannot extends Schema.TaggedError<RunAgentCannot>()("RunAgentCannot", { code: Schema.Literal(refusals.RunAgentCannot.code), ...wireStruct(Run.RunAgentCannot.fields).fields }, { httpApiStatus: refusals.RunAgentCannot.status }) { static readonly code = refusals.RunAgentCannot.code; }
ErrorNames.name(Run.RunTaskClaimed, "RunTaskClaimed");
export class RunTaskClaimed extends Schema.TaggedError<RunTaskClaimed>()("RunTaskClaimed", { code: Schema.Literal(refusals.RunTaskClaimed.code), ...wireStruct(Run.RunTaskClaimed.fields).fields }, { httpApiStatus: refusals.RunTaskClaimed.status }) { static readonly code = refusals.RunTaskClaimed.code; }
export class AttentionNotOpen extends Schema.TaggedError<AttentionNotOpen>()("AttentionNotOpen", { code: Schema.Literal(refusals.AttentionNotOpen.code), ...{ state: Schema.Literals(["open", "approved", "declined"]) } }, { httpApiStatus: refusals.AttentionNotOpen.status }) { static readonly code = refusals.AttentionNotOpen.code; }
export class MilestoneNotActive extends Schema.TaggedError<MilestoneNotActive>()("MilestoneNotActive", { code: Schema.Literal(refusals.MilestoneNotActive.code), ...{ state: Schema.Literals(["active", "dropped"]) } }, { httpApiStatus: refusals.MilestoneNotActive.status }) { static readonly code = refusals.MilestoneNotActive.code; }
export class MissionNotIntake extends Schema.TaggedError<MissionNotIntake>()("MissionNotIntake", { code: Schema.Literal(refusals.MissionNotIntake.code), ...{ state: Schema.Literals(["intake", "running", "paused", "done", "stopped"]) } }, { httpApiStatus: refusals.MissionNotIntake.status }) { static readonly code = refusals.MissionNotIntake.code; }
export class QuestionNotAsked extends Schema.TaggedError<QuestionNotAsked>()("QuestionNotAsked", { code: Schema.Literal(refusals.QuestionNotAsked.code), ...{ state: Schema.Literals(["asked", "answered", "spiked"]) } }, { httpApiStatus: refusals.QuestionNotAsked.status }) { static readonly code = refusals.QuestionNotAsked.code; }
export class RunNotRunning extends Schema.TaggedError<RunNotRunning>()("RunNotRunning", { code: Schema.Literal(refusals.RunNotRunning.code), ...{ state: Schema.Literals(["running", "waiting", "finished", "failed", "stopped"]) } }, { httpApiStatus: refusals.RunNotRunning.status }) { static readonly code = refusals.RunNotRunning.code; }
export class AttentionNotFound extends Schema.TaggedError<AttentionNotFound>()("AttentionNotFound", { code: Schema.Literal(refusals.AttentionNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.AttentionNotFound.status }) { static readonly code = refusals.AttentionNotFound.code; }
export class MilestoneNotFound extends Schema.TaggedError<MilestoneNotFound>()("MilestoneNotFound", { code: Schema.Literal(refusals.MilestoneNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.MilestoneNotFound.status }) { static readonly code = refusals.MilestoneNotFound.code; }
export class QuestionNotFound extends Schema.TaggedError<QuestionNotFound>()("QuestionNotFound", { code: Schema.Literal(refusals.QuestionNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.QuestionNotFound.status }) { static readonly code = refusals.QuestionNotFound.code; }
export class RunNotFound extends Schema.TaggedError<RunNotFound>()("RunNotFound", { code: Schema.Literal(refusals.RunNotFound.code), ...{ id: Schema.String } }, { httpApiStatus: refusals.RunNotFound.status }) { static readonly code = refusals.RunNotFound.code; }
export class NotAllowed extends Schema.TaggedError<NotAllowed>()("NotAllowed", { code: Schema.Literal(refusals.NotAllowed.code), ...{} }, { httpApiStatus: refusals.NotAllowed.status }) { static readonly code = refusals.NotAllowed.code; }
export class IdempotencyConflict extends Schema.TaggedError<IdempotencyConflict>()("IdempotencyConflict", { code: Schema.Literal(refusals.IdempotencyConflict.code), ...{} }, { httpApiStatus: refusals.IdempotencyConflict.status }) { static readonly code = refusals.IdempotencyConflict.code; }

/** Each refusal's exit code, for the CLI: read from `refusals`. */
export const exits = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.exit])) as { readonly [K in Refusal]: (typeof refusals)[K]["exit"] };

/** Each refusal's code, stable across targets: `[AL-002] Name { field: value }`. Beside the tag, never in place of it. Read from `refusals`. */
export const codes = Object.fromEntries(Object.entries(refusals).map(([k, r]) => [k, r.code])) as { readonly [K in Refusal]: (typeof refusals)[K]["code"] };

/** The declared errors themselves, by name: their fields say who may see a value (the visibility rule cuts a refusal by them). */
export const declared = {
  MissionHasOpenQuestions: Mission.MissionHasOpenQuestions,
  MissionNotRunning: Mission.MissionNotRunning,
  MissionNotInIntake: Mission.MissionNotInIntake,
  MissionHasOpenTasks: Mission.MissionHasOpenTasks,
  MissionClosed: Mission.MissionClosed,
  QuestionNoSuchOption: Question.QuestionNoSuchOption,
  RunOverBudget: Run.RunOverBudget,
  RunAgentCannot: Run.RunAgentCannot,
  RunTaskClaimed: Run.RunTaskClaimed,
} as const;

/** The wire class of each refusal, by name. */
export const wire = { MissionHasOpenQuestions, MissionNotRunning, MissionNotInIntake, MissionHasOpenTasks, MissionClosed, QuestionNoSuchOption, RunOverBudget, RunAgentCannot, RunTaskClaimed, AttentionNotOpen, MilestoneNotActive, MissionNotIntake, QuestionNotAsked, RunNotRunning, AttentionNotFound, MilestoneNotFound, QuestionNotFound, RunNotFound, NotAllowed, IdempotencyConflict };
