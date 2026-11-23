import { Blueprint } from "orthograph";

// The handler's own refusal: it is what the handler answers when `findBy` shows the name held.
export class HandleTaken extends Blueprint.error({}, { exit: 41 }) {}
