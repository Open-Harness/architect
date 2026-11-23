# Example: a Python client for acme

Part of the frame's worked examples ([`../README.md`](../README.md)). Proposed, 17 November 2026. It works through
[`../projections.md`](../projections.md) section 3.12 end to end.

**Language: Python, as a client only.** "Language" is the axis that was called "target" before (Effect, Solidity,
Noir, Python), packaged as `@orthograph/language-python`. Here it is a client language: no handler is ever written in
Python. The host is `Host.python` (the caller's process); the projection is `python`, the thing that ships to PyPI.
`design/later.md`'s "Python as a third target" means server-side Python, which is much bigger and stays later.

## The idea

A data team at a customer wants to read their organisation's allowances and spend from scripts and notebooks, in
Python. They sign in with an API key (`Via.key`), not a browser session. They should get a typed client whose names,
errors and docs match the TypeScript SDK exactly, and it should be proved by the same journeys, not just generated.

## What a language provides, and what a projection adds

| `@orthograph/language-python` provides | the `python` projection adds |
|---|---|
| value mapping: `Amount` (uint128) → `int` with a range check, an id → `str` with its pattern, `Memo` → `str` | which operations it takes, and from what (the API's OpenAPI document) |
| a runtime: one HTTP client (`httpx`), errors as typed exceptions or results | the rendered package: models, client, `pyproject.toml` |
| the blank format (none here: a client has no blanks) | `replay`: running a journey step in a real Python process |
| a conformance test: every value round-trips Python ↔ the wire ↔ Effect | `ships`: release to PyPI |

The language is reusable: a server-side Python later would use the same value mapping. The projection is one use of it.

## The description

The app writes nothing new about allowances. It mounts one projection:

```ts
// blueprint/projections/python.ts: the mount is called `python`
import { Blueprint } from "orthograph";
import python from "@orthograph/python";

export default Blueprint.use(python, (p) => [p.choose(p.choices.errors.exceptions), p.choose(p.choices.package.name("acme"))]);
```

The projection's own definition (projections section 3.12) decides what it takes:

```ts
export const python = Blueprint.projection({
  host: [Host.python],
  builtOn: api,                                  // from the OpenAPI document, not from the TypeScript SDK
  via: [Via.key],
  takes: (op) => op.runs === "server",           // no client operations: no feature ships Python code for them
  render: ({ model }) => Effect.succeed([...pydanticModels(model), client(model), pyproject(model)]),
  replay: (step, world) => spawn("python", ["-m", "replay", ...], { env: world.credentialFor(step.cast) }),
  ships: [Release.pypi],
});
```

Two rules decide what Python callers get, and neither is written by the app:

- `via: [Via.key]` with the default `takes` rule: an operation is in only if some role admits `Via.key`. acme's
  `allowance.spend` (`allowed: [grantee]`) is in; anything `.via(Via.session)` only is out.
- `runs === "server"`: a client operation (a wallet's browser signer) is out, and the docs mark it "not in Python".

## What gets generated

```text
generated/python/
  pyproject.toml                 name "acme", version from the model diff (the same as @acme/sdk)
  acme/__init__.py
  acme/models.py                 pydantic models: SpendPayload(allowance: AllowanceId, amount: Amount, memo: str)
  acme/errors.py                 AllowanceExceeded(remaining: int), its stable refusal code ([AL-…]), exit 41
  acme/client.py                 Client(api_key=...).allowance.spend(...)
```

Used like this:

```python
from acme import Client
from acme.errors import AllowanceExceeded

acme = Client(api_key=os.environ["ACME_KEY"])
try:
    left = acme.allowance.spend(allowance="alw_k2…", amount=120, memo="coffee").remaining
except AllowanceExceeded as e:
    print(f"only {e.remaining} left")
```

Names come from paths (`allowance.spend`), errors are the declared errors with the same codes, and the docs each
method carries are the operation's `description`.

## Journeys

No new journeys are written. That is the point of the replay rule: **the journeys acme already has are replayed
through Python**, step by step, wherever the step's operation is in Python's `takes`.

In prose, what happens to `revoke-then-spend` (`examples/acme/journeys/revoke-then-spend.ts` on `origin/layer/3`):

1. "ada revokes it": replayed through Python, with ada's API key, if `allowance.revoke` admits `Via.key`.
2. "olga can't spend": replayed; Python raises `AllowanceNotActive`, and the replay turns it back into the refusal
   `machine.notFrom { state: "revoked" }`, which the step's check compares as it does for every projection.
3. A step whose operation is session-only is skipped through Python, and the report says so per step.

The cast needs API keys. The world makes one per cast member by calling `api-key.create` as that member, which acme
already has (`examples/acme/journeys/an-owner-makes-an-api-key.ts`), so the starting world stays "made by operations,
never by writing rows".

## Blanks and handlers

None. A client projection has no blanks. Everything behind the client is the same server and the same handlers.

## Adapters and secrets

- **Adapters**: none.
- **Secrets**: one **release** secret, `PYPI_TOKEN`, declared by the `python` projection with
  `Blueprint.secret.stored({ kind: Secret.release })`. It lives in CI only, never in a Worker. The callers' API keys are
  theirs; acme never holds them in plain.

## Where data lives

Nothing new. Python is a caller.

## Proof

```text
$ ortho prove --env local
replays   api 41/41   sdk 41/41   cli 38/38   mcp 22/22   python 30/30  (11 steps session-only, not in python)
```

`promote --to staging` releases `acme==1.4.0rc1` to PyPI (staging uses a pre-release, as npm uses `next`); production
releases `acme==1.4.0`. Locally, the release goes to a local package index, as Verdaccio stands in for npm today.

## Today vs proposed

| | Today (`origin/layer/3`) | Proposed |
|---|---|---|
| Python | nothing; "Python as a third target. Later." (`design/later.md:8`) | `@orthograph/language-python` (client only) plus the `python` projection |
| Adding a client | edit the fixed renderer list (`packages/generators/src/modules/render/service.ts:13-24`) | mount a projection |
| Proving a client | journeys call the server over raw HTTP (`packages/prove/src/modules/journeys/internal/world.ts:85`) | each projection replays the journeys it takes |
| Release secrets | one kind, named by string | `Secret.release`, held by CI only |

## Questions this raised

1. **Exceptions or results?** (a) Typed exceptions, the Python norm, as the mount's default. (b) A result type, closer
   to Effect. *Recommend (a)*, with (b) as a choice.
2. **Built from the OpenAPI document or from the model?** (a) From the OpenAPI document (`builtOn: api`), so any
   OpenAPI tool's view matches. (b) Straight from the model, which carries more (refusal codes, visibility). *Recommend
   (b)*: the model is the one contract, and OpenAPI drops our refusal codes. This reverses projections 3.12.
3. **What is a local stand-in for PyPI?** (a) A local package index (devpi or pypiserver), as Verdaccio is for npm.
   (b) Build the wheel and skip release locally. *Recommend (a)*, labelled like any stand-in.
