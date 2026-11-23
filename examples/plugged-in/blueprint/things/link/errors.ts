import { Blueprint } from "orthograph";

export class LinkNeedsHandle extends Blueprint.error({}, { exit: 30 }) {}
export class LinkAlreadyRemoved extends Blueprint.error({}, { exit: 32 }) {}
