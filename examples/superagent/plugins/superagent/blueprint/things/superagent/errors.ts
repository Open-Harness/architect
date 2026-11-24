import { Blueprint } from "orthograph";
import { Superagent } from "./thing.ts";

export class SlotsOutOfRange extends Blueprint.error({ slots: Superagent.fields.slots }, { exit: 61 }) {}
export class StaleRevision extends Blueprint.error({ current: Blueprint.uint(32) }, { exit: 62 }) {}
