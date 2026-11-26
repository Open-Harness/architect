# create-orthograph

```bash
npm create orthograph@next bakery
cd bakery
pnpm install
pnpm ortho check
pnpm ortho prove
```

Makes `bakery/` in the current folder: the Orthograph starter app, the same one `ortho new app bakery` makes. It installs
nothing. An empty folder is filled; a folder with anything in it is refused.

While Orthograph is a preview, its packages are published under the `next` tag only, so name it: a plain
`npm create orthograph` asks for `latest`, which does not exist yet.
