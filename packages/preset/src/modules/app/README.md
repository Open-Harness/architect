# app

`create({ parent, name })` makes `<parent>/<name>/`: the starter, laid down by `Starter.write` into a tree and put on disk,
so it is exactly what the preset makes. It installs nothing and writes nothing outside the folder. The refusals (a name
that is not lower case words, a reserved name, a folder with anything in it, a file in its place) come before anything is
written. Both `ortho new app` and `create-orthograph` call it, and print the lines it returns.
