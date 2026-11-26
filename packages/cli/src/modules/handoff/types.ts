// A global `ortho` hands off to the app's own `@orthograph/cli`, so the app's packages are the only copies loaded (#1151).

export interface HandoffApi {
  /** The folder whose app is meant: the `--root` in `args` (everything after `ortho`), else `cwd`. */
  readonly from: (args: ReadonlyArray<string>, cwd: string) => string;
  /** The app's own `ortho` entry to run instead, when one is installed from `from` up and it is not the CLI at `own` (its package folder). */
  readonly target: (options: { readonly from: string; readonly own: string }) => string | undefined;
}
