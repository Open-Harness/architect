import { Blueprint } from "orthograph";

/** The signer refused to sign: the keystore is locked, or the person turned the request down. */
export class KeyLocked extends Blueprint.error({}, { exit: 61 }) {}
/** No key of this label on this signer. */
export class NoSuchKey extends Blueprint.error({}, { exit: 62 }) {}
/** The chain's simulation of the send reverted (or could not pay), so nothing was signed or sent. */
export class SimulationReverted extends Blueprint.error({}, { exit: 63 }) {}
