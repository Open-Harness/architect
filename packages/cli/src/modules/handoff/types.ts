// A global `ortho` hands off to the app's own `@orthograph/cli`, so the app's packages are the only copies loaded (#1151).

export interface HandoffApi {
  /** The folder whose app is meant: the `--root` in `args` (everything after `ortho`), else `cwd`. */
  readonly from: (args: ReadonlyArray<string>, cwd: string) => string;
  /**
   * The app's own `ortho` entry to run instead (`run`), when one is installed from `from` up and it is not the CLI at `own` (its
   * package folder); `broken` (the package's folder) when one is installed but its entry can't be read; nothing otherwise.
   */
  readonly target: (options: { readonly from: string; readonly own: string }) => Target | undefined;
}

export type Target = { readonly run: string } | { readonly broken: string };
