# disk

The one port to the machine's disk the other modules use: real paths, folders, files, listings. Each call is an Effect and a
missing path is a value (`null`, `[]`), never a throw. `Disk` is the type; `nodeDisk` is the layer `main.ts` hands the rest.
Test: `disk.test.ts`, on a real temporary folder.
