# holds

Owns `Blueprint.hold` (GOAL17-pause): the switch a thing's state makes (`paused`), declared beside the thing, and
`hold.holds({ held, unheld })`, the app's lists of the deliveries it holds and the ones it does not, each with a reason.
The compiler refuses a delivery of an event that carries the key in neither list, an event on both, a held delivery of the
hold thing's own move, and a hold on a thing in another store than the one producing its events. Test: `holds.test.ts`.
