/** Whether a message addresses `login`: `@login` as a word, in any case. */
export const mentions = (text: string, login: string): boolean => new RegExp(`(^|\\W)@${login}(\\W|$)`, "i").test(text);
