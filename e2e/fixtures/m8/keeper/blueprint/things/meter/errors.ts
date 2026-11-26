import { Blueprint } from "orthograph";

// The handler's own: a jammed meter can't be read.
export class MeterJammed extends Blueprint.error({}, { exit: 21 }) {}
