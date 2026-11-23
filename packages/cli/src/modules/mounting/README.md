# mounting

Owns `ortho add feature|adapter|projection <package> [--as <name>] [--dry-run]`
([`design/decisions/M1-plugins.md`](../../../../../design/decisions/M1-plugins.md) section 11). `Mounting.add` reads
the installed package, refuses before writing anything (a bad name, a package not installed or not a plugin of that
kind, a mount that exists, a registry release under R1's three days), then writes one mount with each choice at its
first option, pins the version exactly in `package.json`, and lists the plugin's needs as met or not. It returns its
lines; `main.ts` prints them. Test: `mounting.test.ts`.
