import { Blueprint } from "orthograph";

// Planted: the same two refusals, declared in a different order.
export class EchoOther extends Blueprint.error({}, { exit: 79 }) {}
export class EchoProblem extends Blueprint.error({}, { exit: 78 }) {}
