import { Blueprint } from "orthograph";

export class StaleAssignment extends Blueprint.error({ assignment: Blueprint.text({ max: 120 }) }, { exit: 51 }) {}
