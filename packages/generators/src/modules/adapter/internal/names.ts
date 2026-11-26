// The one naming rule: a call is named from its `operationId`, split at `/` and `.` into groups, each piece camel-cased at
// `-` and `_` (`issues/create-comment` is `issues.createComment`; `chat_postMessage` is the flat `chatPostMessage`). An
// event is the service's own event name, camel-cased the same way (`issue_comment` is `issueComment`).
export const camel = (word: string): string =>
  word.split(/[-_]/).filter((p) => p !== "")
    .map((p, i) => (i === 0 ? p.charAt(0).toLowerCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1))).join("");

export const nameParts = (operationId: string): ReadonlyArray<string> => operationId.split(/[/.]/).map(camel);

/** Lower case words joined by dashes: `github`, `error-tracking`. */
export const isName = (name: string): boolean => /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name);

/** An adapter's name in Pascal case, its errors' prefix: `fx-rates` is `FxRates`. */
export const pascalOf = (name: string): string => name.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");

/** The four errors every call of a generated adapter declares (G16-adapter-mounts call 1), in the adapter's name. */
export const errorsOf = (name: string): ReadonlyArray<string> => ["ApiFailure", "InputRefused", "AnswerRefused", "Unreachable"].map((e) => `${pascalOf(name)}${e}`);
