import { Blueprint } from "orthograph";

// Declared but never raised by the fixture's handlers: it gives the wire-naming and refusal-code checks a name to hold.
export class EchoProblem extends Blueprint.error({}, { exit: 78 }) {}
