# sources

Owns `Source.from` and `Source.timer` (GOAL17-source-from): a source is a mapping on an adapter, made once and exported
from a file of a plugin's `blueprint/sources/`; calling it with a configuration makes the connection a superagent lists.
The compiler binds each mapping to the app's mount of the adapter, refuses an event or call the mount leaves out, a name
the adapter does not have, and a variable that is a secret or does not start with its source's prefix. Test: `sources.test.ts`.
