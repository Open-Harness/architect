# mount

Owns `Mount.picked(option)`, how a plugin's handler asks what the app that mounted it picked, and `Mount.under(mount)`,
which runs an effect under a mount, and `Mount.serving(mount, handler)`, the handler the generated server serves for each plugin operation. `Mounted` is a context reference, so a handler never declares
it; with no mount, every choice is at its first option. Test: `mount.test.ts`.
