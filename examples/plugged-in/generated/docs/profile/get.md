<!-- Generated from the blueprint. Do not edit. -->
# profile.get

Read a claimed name's public page and its links in display order.

**Who may call:** anyone.

**Budget:** p95 150ms.

## Payload

| field | value | description |
|---|---|---|
| handle | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |

## Answer

| field | value | description |
|---|---|---|
| handle | handle.name | A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page. |
| links | schema |  |

## Steps

- `profile.get.load` (database)

## Refusals

| refusal | exit | code | when |
|---|---|---|---|
| ProfileNotFound | 20 | PR-001 | declared in errors.ts |

## Worked examples

### a stranger cannot edit a page

Starts from the world `page-to-guard`.

- **aaron's page is exactly as he left it.** `visitor` (anyone) calls and sends handle `guardpage`, and gets back 1 and gets back [the world's lastLink, `GitHub`, `https://github.com/aaron`].

### add, order and remove a link

Starts from the world `page-to-edit`.

- **the page starts with the three links aaron put on it, in order.** `visitor` (anyone) calls and sends handle `editpage`, and gets back [`GitHub`, `Blog`, `Talks`] and gets back the world's lastLink.
- **it goes at the end, with its title and address.** `visitor` (anyone) calls and sends handle `editpage`, and gets back [`GitHub`, `Blog`, `Talks`, `Newsletter`] and gets back [`Newsletter`, `https://aaron.example.com/news`].
- **the page shows the new order.** `visitor` (anyone) calls and sends handle `editpage`, and gets back [`Newsletter`, `GitHub`, `Blog`, `Talks`].
- **the page shows GitHub last.** `visitor` (anyone) calls and sends handle `editpage`, and gets back [`Newsletter`, `Blog`, `Talks`, `GitHub`].
- **the page no longer lists it, and keeps the order of the rest.** `visitor` (anyone) calls and sends handle `editpage`, and gets back [`Newsletter`, `Blog`, `GitHub`].
- **the page is as the removal left it.** `visitor` (anyone) calls and sends handle `editpage`, and gets back [`Newsletter`, `Blog`, `GitHub`].

### anyone reads a public page

Starts from the world `page-with-links`.

- **a visitor reads the page: the name and every link, in order.** `visitor` (anyone) calls and sends handle `linkpage`, and gets back `linkpage` and gets back [`GitHub`, `Blog`, `Talks`] and gets back [`https://github.com/aaron`, `https://aaron.example.com/blog`, `https://aaron.example.com/talks`] and gets back [true, true, true] and gets back the world's lastLink and gets back [`id`, `title`, `url`].
- **a signed-in person who is not the owner reads the same page.** `bob` (signed in) calls and sends handle `linkpage`, and gets back `linkpage` and gets back [`GitHub`, `Blog`, `Talks`].
- **a name nobody claimed has no page.** `visitor` (anyone) calls and sends handle `nosuchpage`, and is refused with ProfileNotFound, PR-001.

### claim a handle

Starts from an empty world.

- **an unclaimed name has no public page.** `visitor` (anyone) calls and sends handle `firstpage`, and is refused with ProfileNotFound, PR-001.
- **the claim made a public page, with no links yet.** `visitor` (anyone) calls and sends handle `firstpage`, and gets back { handle: `firstpage`, links: [] }.

### release a handle

Starts from the world `claimed-to-release`.

- **the released name has no public page.** `visitor` (anyone) calls and sends handle `releasepage`, and is refused with ProfileNotFound, PR-001.
- **the new page has none of the old owner's links.** `visitor` (anyone) calls and sends handle `releasepage`, and gets back { handle: `releasepage`, links: [] }.
- **his new page has only the new link, and the old name's page is still bob's and empty.** `visitor` (anyone) calls and sends handle `aaronspage`, and gets back [`New link`].

### a person claims a page and shares it

Starts from an empty world.

- **anyone sees his public page at @aaron: three links in the order he added them.** `visitor` (anyone) calls and sends handle `aaron`, and gets back `aaron` and gets back [[`GitHub`, `https://github.com/aaron`], [`Blog`, `https://aaron.example.com/blog`], [`Talks`, `https://aaron.example.com/talks`]].

## How to call

```sh
plugged-in profile get --handle <handle>
```

HTTP: `POST /profile/get` with the payload as JSON. SDK: `Sdk.profile.get(payload)`.
