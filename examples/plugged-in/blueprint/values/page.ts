import { Blueprint, Schema } from "orthograph";

export const HandleName = Blueprint.described(
  Blueprint.value(Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9]{0,31}$/))),
  "A name of up to 32 lowercase letters and digits, starting with a letter: the address of a public page.",
);
export const LinkTitle = Blueprint.described(Blueprint.value(Blueprint.text({ max: 120 })), "What the link shows on the page, up to 120 characters.");
export const LinkUrl = Blueprint.described(Blueprint.value(Schema.String.check(
  Schema.isMaxLength(2048),
  Schema.isPattern(/^https?:\/\//),
  Schema.makeFilter((url: string) => URL.canParse(url)),
)), "Where the link goes: a web address starting with http:// or https://, up to 2048 characters.");
export const LinkPosition = Blueprint.described(Blueprint.value(Blueprint.uint(32)), "Its place in the page's list of links: 0 is first.");
