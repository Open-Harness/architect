import { Blueprint } from "orthograph";

// The reason given is not the one that was signed.
export class SealMismatch extends Blueprint.error({}, { exit: 43 }) {}
