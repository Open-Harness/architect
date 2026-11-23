const escaped = (login: string): string => login.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether a message addresses `login`: `@login` as a whole name, in any case. A longer name (`@login-bot`, `@login_two`) and an email address are not. */
export const mentions = (text: string, login: string): boolean => new RegExp(`(^|[^A-Za-z0-9_])@${escaped(login)}(?![A-Za-z0-9_-])`, "i").test(text);
