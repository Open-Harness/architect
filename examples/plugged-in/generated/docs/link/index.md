<!-- Generated from the blueprint. Do not edit. -->
# link

A title and web address on a public page.

Lives in the database.

## Fields

| field | value | description |
|---|---|---|
| id | id | The link's own id. |
| profile | profile.id | The page the link is on. |
| owner | handle.owner | The person whose page the link is on. |
| title | LinkTitle | What the link shows on the page, up to 120 characters. |
| url | LinkUrl | Where the link goes: a web address starting with http:// or https://, up to 2048 characters. |

## Machine

States: listed, removed. A move from the wrong state is refused LinkNotListed (exit 31).

| move | from | to | emits |
|---|---|---|---|
| add | (creates) | listed | LinkAdded |
| remove | listed | removed | LinkRemoved |

## Events

- `LinkAdded`: carries link (link.id: The link's own id.); emitted by the move add
- `LinkRemoved`: carries link (link.id: The link's own id.); emitted by the move remove

## Roles

- linkOwner

## Operations

- [link.add](add.md): Append a link to your own public page. You need a claimed name first.
- [link.order](order.md): Move a link to a zero-based position. A position past the end puts it last.
- [link.remove](remove.md): Remove a link from a public page.
