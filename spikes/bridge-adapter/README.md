# Spike: the Bridge adapter from its published API description

Goal 16, slice 5 (#711). Run on 23 November 2026, in Amp, on Claude Opus 5.5.

**Question.** Can `ortho new adapter --from-openapi` make Capxul's Bridge adapter from Bridge's own published API
description, so that customers, KYC links, virtual accounts and transfers work against a stand-in?

**Answer.** Not as the generator stands. It refuses Bridge's description outright: none of Bridge's 144 operations has an
`operationId`. Given names, it generates all 144 calls in about 1.2 seconds, and Capxul's first flow runs against the stand-in
(a KYC link, the customer it makes, a USD virtual account landing as USDC, a transfer, a safe retry). That needs four fixes
to the generator: names from the path when there is no `operationId`, the key sent as `Api-Key`, an `Idempotency-Key` on
each POST, and the fields of a `oneOf` body. It also needs a way to accept answers that differ from Bridge's own schemas,
because 113 of Bridge's 197 published success examples break them, 49 of the 52 transfer examples among them.

## What was tried

- **The description.** Bridge's API reference (https://apidocs.bridge.xyz/api-reference) loads its description from
  `https://withbridge-image1-sv-usw2-monorail-openapi.s3.amazonaws.com/latest.json`: OpenAPI 3.0.2, "Bridge API", version
  `1`, server `https://api.bridge.xyz/v0`, 934,543 bytes, sha256 `9ce92ed1…4e2fb3`. Fetched fresh each run, and not kept here.
- **The generator.** `ortho new adapter` exists only on Goal 17's `goal/superagent` (M5.07, its slice 4), and this spike
  ran it at `c652baa3` without changing it. Nothing from `packages/` was copied here.
- **`run.sh <goal/superagent checkout>`** runs the whole spike. It works only under `<checkout>/.bridge-spike/`, so the
  generated client finds `effect`, and it stops the stand-in it starts. The steps:
  1. it runs the generator on the description as published;
  2. `name-operations.mjs` writes a copy with an `operationId` on each operation, `<tag>/<summary>` (`transfers/create-transfer`),
     and the generator runs again on that copy;
  3. `judge-examples.mjs` checks every example Bridge publishes for a success answer against that answer's own schema,
     using the judge the generated adapter carries;
  4. `stand-in.mjs` stands in for Bridge, and `exercise.mjs` runs the generated client against it: 22 checks, each with
     the outcome it expects.
- **The stand-in** answers only the calls Capxul needs first, and every answer is one of Bridge's own published examples,
  with fresh ids and the caller's fields filled in. It keeps Bridge's header rules: no `Api-Key` gets a 401, a POST without
  an `Idempotency-Key` gets a 400, and a key it has seen gets the first answer again. Its `published` mode answers with the
  examples as Bridge publishes them, `repaired` makes them fit Bridge's schemas, and `misfit` gives a numeric `id`.

## What was found

1. **The description as published is refused.** `no operations: the description has no path with an operationId`,
   exit 2. None of the 144 operations has one; each has a `summary` and a `tag`. The generator names a call only from its
   `operationId`: `operationsOf` in `internal/extract.ts` skips an operation without one, and `service.ts` refuses when none is left. So every adapter from a description like Bridge's needs a second naming rule.
   Names made from summaries are long and unstable (`kycLinks.generateLinksNeedsCompleteKycIndividualOrBusiness`), and two
   summaries repeat (`get-bridge-wallet`, `get-external-accounts`). Names from the method and the path would be short and
   unique (`kycLinks.create`, `customers.virtualAccounts.create`).
2. **Once named, it generates.** 144 calls and 0 events, 11 files, 440 KB, in about 1.2 seconds (1.16 to 1.31 s over six runs, in an orb). The
   descriptor loads, checked by hand with `orthograph` linked in, since `run.sh` doesn't load it (`Blueprint.adapter` with 144 `Blueprint.call()`s), and a second run writes the same bytes.
3. **The key goes in the wrong header.** Bridge's security scheme is `apiKey` in the `Api-Key` header. The client sends
   only `Authorization: Bearer <token>` (`runtime/client.ts`), and the extractor drops every header parameter. Against the
   stand-in, the generated client's first call got `401 Missing Api-Key header`. The stand-in's log shows that request
   with `apiKey: false, authorization: true`.
4. **There is no way to send an `Idempotency-Key`.** 38 of the calls take it as a required header (36 on the operation, 2 on its path), among them creating a
   customer, a KYC link, a virtual account and a transfer. The extractor drops it, and passing it as a field is refused
   (`no field Idempotency-Key`). For money moves, retrying safely is the whole point: with the same key, the stand-in gave
   the first answer back, and the retried transfer kept the same id. That only works because the spike adds the header
   under the client (`bridgeHeaders` in `exercise.mjs`, which wraps `fetch`). The generator should emit that header itself.
5. **`customers.createCustomer` can't be called.** Its body is a `oneOf` of an individual and a business, with a
   `discriminator` on `type`. The extractor merges only `allOf` bodies (`fieldsOf` in `internal/extract.ts`), so this call
   has no fields, and `{ type, email }` is refused before it is sent. A KYC link makes the customer instead, and that is
   the path Capxul's flow takes anyway, so the flow could go on. KYB through Bridge's hosted link still works (`type: "business"`), but
   creating a business customer and its associated persons through the API does not.
6. **Bridge's examples break Bridge's own schemas.** 113 of the 197 published examples of a success answer don't fit
   their schema, in 42 answers. 58 of them are in Capxul's first calls:
   - 49 of the 52 transfer examples (the three that fit are the transfer route and two empty lists) leave out `currency`,
     which `TransferResponse` requires, and its receipt leaves out the required `*_currency` beside each amount;
   - the customer examples give `endorsements[].requirements.missing` as `null`, where the schema requires an object;
   - the customer lists leave out the required `count`, and the business customer example gives `last_name` as `null`
     and an object inside `requirements.complete`, where the schema says strings;
   - the EU and GB virtual account examples give `payment_rails` as a list (`["sepa"]`), where the schema says one string.

   Outside Capxul's first calls, an associated person's `created_at` is an ISO string where the schema says integer. The
   judge is reading these correctly: each of those kinds was checked by hand against the raw JSON. The client refuses any answer that doesn't fit (`AnswerRefused`), and that is
   what happened when the stand-in answered with the examples as published: the customer and the transfer were refused.
   If live Bridge answers the way its examples show, which can't be known without a sandbox key, the generated adapter
   would refuse every transfer. In `repaired` mode the same flow passes, which shows the client is right once answers fit.
7. **What it does well.** Bad input is refused before anything is sent: a customer type Bridge doesn't have (`"robot"`
   is not in the enum), a transfer with no destination, a field Bridge doesn't have. The stand-in received nothing for
   any of the three. A 404 comes back as `ApiFailure` with its status and body, and an answer whose `id` is a number is
   refused, naming `$.id`.
8. **There are no events.** Bridge sends webhooks (virtual account activity, transfer states, KYC status), but its
   description has no `webhooks` section. The schemas are there (`VirtualAccountEvent`, `StaticMemoEvent`, among others),
   so they are written by hand in the plugin's `src/written.ts`, as Goal 17 does for Slack.
9. **Amounts are decimal strings** (`"10.0"`, `"0.1"`). This is one input for K43's open question on ERPNext amounts and
   Orthograph's base units.

## Measurements

| | |
|---|---|
| Operations, and with an `operationId` | 144, and 0 |
| Required `Idempotency-Key` headers | 38 operations (36 on the operation, 2 on its path) |
| Generation, once named | 144 calls, 0 events, 11 files, 440 KB, about 1.2 s (six runs); the same bytes on a second run |
| Published success examples that fit their schema | 84 of 197; of those in Capxul's first calls, 58 don't fit |
| Exercise against the stand-in | 22 of 22 checks as expected, in two runs in a row, with the same results apart from ids |

## The decision it supports

- **Slice 10, the paid services, and slice 6, the map, can plan on a generated Bridge adapter**, narrowed in Capxul's
  `plugins/bridge/` as Goal 17's slice 4 narrows GitHub, Slack and PostHog. This holds once the five generator changes
  below land. No hand-written client is needed.
- **The generator changes are framework gaps, in `packages/generators/src/modules/adapter/` and `packages/cli/`.** Goal
  17 claimed those paths for M5.07, so under K42's collision rule they go through Goal 18 (case 2): Goal 16 opens an Ask, and Goal 18 settles whether
  Goal 17 or Goal 16 makes the changes, or how the two split them. The five:
  1. names from the method and path when an operation has no `operationId`;
  2. the security scheme's header (`apiKey` in a header) used for the token;
  3. header parameters kept, with a required `Idempotency-Key` generated on each call unless the caller gives one;
  4. a `oneOf` or `anyOf` body read as the union of its alternatives' fields, so the judge decides which one fits;
  5. a lenient way to accept answers, for descriptions whose examples break their own schemas: the client reports the
     misfit and still returns the answer.
- **This spike mints no decision.** If Capxul's lead wants the gap list recorded, Goal 16 asks for an ID.

## Open risks

- **Nothing here talked to Bridge.** No key was used, and none exists in this repository. Whether live Bridge answers as
  its examples do, or as its schemas say, is unknown until a sandbox key is granted. Finding 6 is about the description,
  not about the live service.
- **The stand-in is a first pass.** It answers 7 of the 144 calls with fixed example data. It doesn't move KYC through its
  states, fire webhooks, or check request bodies beyond the fields it reads. It replays by `Idempotency-Key` alone,
  without comparing the request, and what live Bridge does with a reused key on a different request is unknown.
- **The description moves.** It is served as `latest.json`, with `info.version` `1`, so the generated line names no
  version that tells two fetches apart. `run.sh` notes when the fetched sha256 differs from the one this spike read.
- **The scaffolder lives on `goal/superagent`.** Capxul can't run `ortho new adapter` on its own branch until the lander
  brings Goal 17's slice 4 into `main`.
