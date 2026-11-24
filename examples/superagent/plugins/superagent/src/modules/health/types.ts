/** A record that can fail, as a problem look hands it to the derive: what it is, and how often in a row it failed. */
export interface Watched {
  readonly kind: string;
  readonly id: string;
  readonly name: string;
  readonly failures: number;
  /** The failures at which it shows. */
  readonly after: number;
}

export interface Problem {
  readonly kind: string;
  readonly id: string;
  readonly name: string;
  readonly failures: number;
}

export interface Health {
  readonly problems: ReadonlyArray<Problem>;
  /** A cap cut some. */
  readonly more: boolean;
}

/** Problems shown at most. */
export const CAP = 25;
