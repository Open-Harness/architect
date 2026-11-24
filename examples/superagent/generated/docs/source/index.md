<!-- Generated from the blueprint. Do not edit. -->
# source

One connection of a superagent to an outside service, with the place it has read to.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| superagent | superagent.id |
| name | text |
| kind | text |
| config | schema |
| position | text |
| failures | uint |
| failAfter | uint |

## Machine

States: setup, ready, paused, error, off. A move from the wrong state is refused SourceNotSetup (exit 80).

| move | from | to | emits |
|---|---|---|---|
| save | (creates) | setup | SourceSaved |
| enable | setup, paused, off, error | ready | SourceEnabled |
| disable | setup, ready, paused, error | paused, off | SourceDisabled |
| advance | ready | ready | SourcePositionAdvanced |
| fail | ready | error | SourceFailed |

## Events

- `SourceDisabled`: carries source (source.id); emitted by the move disable
- `SourceEnabled`: carries source (source.id); emitted by the move enable
- `SourceFailed`: carries source (source.id); emitted by the move fail
- `SourcePositionAdvanced`: carries source (source.id), position (source.position); emitted by the move advance
- `SourceSaved`: carries source (source.id), superagent (source.superagent); emitted by the move save

## Operations

- [source.disable](disable.md): Stop listening on a connection; its triggers already recorded stay.
- [source.enable](enable.md): Start listening on a connection.
- [source.position-advanced](position-advanced.md): Record how far a connection has read, after a poll.
- [source.problem](problem.md): Say a connection has failed three polls in a row: it shows as a problem until a poll succeeds.
- [source.save](save.md): Save a connection: its kind and its configuration.
