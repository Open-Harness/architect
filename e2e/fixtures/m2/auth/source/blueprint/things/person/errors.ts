import { Blueprint } from "orthograph";

export class PersonEmailTaken extends Blueprint.error({}, { exit: 11 }) {}
