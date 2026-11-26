# The hard part is the next morning

Film: `docs/explainer/films/why/`

An agent can write a working system in an afternoon. The server, the database, the command line, the tools for other
agents, the page of docs. Writing it was never the hard part.

The hard part is the next morning. Is it right? Is it fast enough, and what happens when something fails? When one rule
changes, what else has to change? To answer any of that, someone has to read all of it. Usually that someone is you.

## What Orthograph does about it

We want you to be able to trust a system you did not write and have not read. So Orthograph moves the part you read.

You work on the system itself: the things in it, who may do what to them, and what must always be true. That
description is the [blueprint](../../canon/blueprint.mdx), and it is small enough to read whole. Everything below it is
either made by the framework from the blueprint, or written by an agent inside a frame the blueprint sets. And nobody
takes anyone's word that it works. The running system is proved against stories you agreed to before it was built.

So three parties do three different jobs. You decide the system, and you read the blueprint and the stories. Your
agents plan with you, write the stories, build the behaviour and review each other. The framework makes the server,
the API, the SDK, the command line and the deployment, and proves them.

## How to read this manual

The manual follows one small app, Plugged In, from the first conversation about it to a change made months after it
went live. A person claims a name, and gets a public page of links. It is small on purpose, so you can hold all of it in your
head. It has no money and nothing that waits on anyone else yet; its next stage adds both, and the first chapter
plans it.

Each chapter is one stage in that life, in the order it happens. It says what you do, what your agents do and what you
read, and it ends with what goes wrong and with how that part of Orthograph stands today. Each chapter has a film of two or three
minutes that shows the same thing happening.

Everything printed in a chapter was recorded from a real run, or is quoted from a file, and a check fails the manual
if it is not. Where something does not exist yet, the chapter says so in the same voice as everything else.

## The cast

Five roles appear in the story, and one agent takes one role at a time. The designer turns what you want into a plan
and then a blueprint. The author writes the stories that say what done means. The builder writes one handler until
those stories pass. The reviewer reads a change it had no part in. And a spike answers one doubtful question in
throwaway code. Each is introduced where it first appears, and [all five are set out in full](../working-with-your-agents.md)
at the back.

## When it goes wrong

The commonest way to go wrong with this manual is to skip to the building. The chapters before it are short, and they
are where the decisions are made that the later chapters only carry out.

## How this stands

Orthograph is not finished, and the manual says where. All eleven chapters are written, and each says in its last
section what runs today, what is only our practice, and what is missing. The commands in them were recorded on Plugged
In. The way of working with agents that runs through all of them is how this repository builds Orthograph itself,
every day, and it is practice: no command hands a new app its roles yet, and nothing stops an agent stepping outside
one. Two chapters stop short on purpose. Planning stops at the first question its page asks the owner, and staging
stops at the plan, because the real deployment has not been recorded yet.
