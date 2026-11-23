import { Blueprint } from "orthograph";

/** The declared refusal a handler maps the outside service's failure to. */
export class PriceUnavailable extends Blueprint.error({}, { exit: 76 }) {}
