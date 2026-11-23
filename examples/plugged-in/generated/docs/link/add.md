<!-- Generated from the blueprint. Do not edit. -->
# link.add

Append a link to your own public page. You need a claimed name first.

**Who may call:** anyone signed in.

**Idempotent by request:** send `idempotency-key`; the same key twice is one call.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| title | link.title | What the link shows on the page, up to 120 characters. |
| url | link.url | Where the link goes: a web address starting with http:// or https://, up to 2048 characters. |

## Answer

| field | value | description |
|---|---|---|
| link | link.id | The link's own id. |

## Move

`add`: from nothing (it creates) to listed, emitting LinkAdded.

## Steps

- `link.add.load` (database)
- `link.add.record` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| LinkNeedsHandle | 30 | LN-001 | declared in errors.ts |
| NotAllowed | 3 | AR-001 | the caller isn't anyone signed in; the handler never runs |
| IdempotencyConflict | 120 | AR-002 | the request key was first used with another payload; the handler never runs |

## Worked examples

### a stranger cannot edit a page

Starts from the world `page-to-guard`.

- **bob has no page, so he has nowhere to add a link.** `bob` (signed in) calls and sends title `Spam`, url `https://bob.example.com`, and is refused with LinkNeedsHandle, LN-001.

### add, order and remove a link

Starts from the world `page-to-edit`.

- **aaron adds a fourth link.** `aaron` (signed in) calls and sends title `Newsletter`, url `https://aaron.example.com/news`, and gets back an answer matching `^lnk_[0-9a-z]+$`.

### claim a handle

Starts from an empty world.

- **aaron cannot add a link before he has a page.** `aaron` (signed in) calls and sends title `GitHub`, url `https://github.com/aaron`, and is refused with LinkNeedsHandle, LN-001.

### release a handle

Starts from the world `claimed-to-release`.

- **aaron puts a link on his page before he lets the name go.** `aaron` (signed in) calls and sends title `Old link`, url `https://aaron.example.com/old`, and gets back an answer matching `^lnk_[0-9a-z]+$`.
- **aaron has no page to add a link to any more.** `aaron` (signed in) calls and sends title `Too late`, url `https://aaron.example.com/late`, and is refused with LinkNeedsHandle, LN-001.
- **aaron can add a link again, to his new page.** `aaron` (signed in) calls and sends title `New link`, url `https://aaron.example.com/new`, and gets back an answer matching `^lnk_[0-9a-z]+$`.

### a person claims a page and shares it

Starts from an empty world.

- **aaron adds his GitHub.** `aaron` (signed in) calls and sends title `GitHub`, url `https://github.com/aaron`, and is answered.
- **aaron adds his blog.** `aaron` (signed in) calls and sends title `Blog`, url `https://aaron.example.com/blog`, and is answered.
- **aaron adds his talks.** `aaron` (signed in) calls and sends title `Talks`, url `https://aaron.example.com/talks`, and is answered.

## How to call

```sh
plugged-in link add --title <title> --url <url>
```

HTTP: `POST /link/add` with the payload as JSON. SDK: `Sdk.link.add(payload)`.
