<!-- Generated from the blueprint. Do not edit. -->
# settings

The app's settings: execution variables and blocked commands. One current version, every save kept.

Lives in the database.

## Fields

| field | value |
|---|---|
| id | id |
| revision | uint |
| variables | schema |
| blocked | schema |

## Machine

States: current. A move from the wrong state is refused SettingsNotCurrent (exit 40).

| move | from | to | emits |
|---|---|---|---|
| save | (creates) | current | SettingsSaved |

## Events

- `SettingsSaved`: carries settings (settings.id), revision (settings.revision); emitted by the move save

## Operations

- [settings.save](save.md): Save a new version of the settings. A save made from an older version is refused, with the current one. A main agent may only propose it.
