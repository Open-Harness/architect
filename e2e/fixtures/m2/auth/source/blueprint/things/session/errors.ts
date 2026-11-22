import { Blueprint } from "orthograph";

export class SessionCredentialsWrong extends Blueprint.error({}, { exit: 10 }) {}
