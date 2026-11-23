# data

Reading the data API from the browser (`/_portal/v1/*`, K19): the blueprint, then the snapshot for its digest, as an Effect that fails with
the request that could not be read and what it answered. `types.ts` holds `PortalData` (the wire's own types, none invented), `Loaded`
and the `Store` every page reads. The store only holds a value and its listeners; `main.ts` runs `loaded()` once and settles it, so no
module here runs an effect or touches the network on its own. Test: `data.test.ts`.
