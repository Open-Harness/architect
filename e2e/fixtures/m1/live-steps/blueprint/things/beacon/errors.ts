import { Blueprint } from "orthograph";

// Refused after the slow step, so a refused call has a `load` step and no commit.
export class BeaconDark extends Blueprint.error({}, { exit: 51 }) {}
