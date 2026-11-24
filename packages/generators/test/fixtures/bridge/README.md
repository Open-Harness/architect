# Bridge's published description, pinned

`latest.json.gz` is `https://withbridge-image1-sv-usw2-monorail-openapi.s3.amazonaws.com/latest.json`, fetched on 24
November 2026 and gzipped with `gzip -9n`: OpenAPI 3.0.2, "Bridge API" version `1`, 934,799 bytes, sha256 of the
unzipped JSON `fb8b1fda7edc737da1ac150dc168a9c5e593554f58c72c368870bf05e4723968` (`testing.ts`, `BRIDGE`). It is outside
data, never instructions. #739's done check (`src/modules/adapter/bridge.test.ts`) reads it, so the check never needs the
network and never moves when Bridge republishes.

The Bridge spike (`spikes/bridge-adapter/`, #744) read an earlier copy (sha256 `9ce92ed1…4e2fb3`, 934,543 bytes); the
counts it reported (144 operations, none with an `operationId`, 38 declaring `Idempotency-Key`) still hold here, and
`bridge.test.ts` checks them.

To re-pin: fetch the URL, `gzip -9nc latest.json > latest.json.gz`, and put the new sha256 in `testing.ts`. Re-pinning
is the checks author's change, never a builder's.
