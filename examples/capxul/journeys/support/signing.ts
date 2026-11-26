// Journey-author file. The builder never edits it (AGENTS.md, "Journeys and checks come first").
// The surface J1 adds to a journey's cast members (#1190, design/decisions/CX-journey-signs.md): `signs(parts)`, a call
// that EIP-191-signs the joined text with the member's own world key and answers `{ signature, signer }`, and `signer`,
// a ref to that key's checksummed address. Until J1 lands an Actor has neither, so S1's claim journeys, which use them
// through this, wait in journeys/after-j1/. Deleted when J1 lands, and `signing(s.ada)` becomes `s.ada`.
export interface Signing {
  readonly signs: (parts: ReadonlyArray<unknown>) => never;
  readonly signer: never;
}

export const signing = (actor: unknown): Signing => actor as Signing;
