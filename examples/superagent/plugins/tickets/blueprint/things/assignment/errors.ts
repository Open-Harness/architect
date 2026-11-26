import { Blueprint } from "orthograph";
import { Assignment } from "./thing.ts";

export class NoSeat extends Blueprint.error({  }, { exit: 95 }) {}
export class SeatTaken extends Blueprint.error({ seat: Assignment.fields.seat }, { exit: 96 }) {}
export class ExecutorAlreadyQueued extends Blueprint.error({ agent: Assignment.fields.agent }, { exit: 97 }) {}
