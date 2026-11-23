import { Blueprint } from "orthograph";

export class EchoProblem extends Blueprint.error({}, { exit: 78 }) {}
// Planted: the app already declares a refusal named AllowanceExceeded.
export class AllowanceExceeded extends Blueprint.error({}, { exit: 79 }) {}
