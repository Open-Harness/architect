import { Blueprint } from "orthograph";

// Planted: the same class name as echo's EchoProblem, so the same wire tag.
export class EchoProblem extends Blueprint.error({}, { exit: 77 }) {}
