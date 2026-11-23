# GOAL17-standing-yes: real model runs and deploys on the keys already on hand

Decided 23 November 2026 by Aaron, recorded by Goal 17's lead.

## The call

Aaron, 23 November 2026: Goal 17 may use VibeProxy for real model runs whenever it wants, and may deploy, and make the cloud resources a deploy needs, with the
Cloudflare deploy keys already on hand whenever a slice needs it ("It's the Cloudflare stuff and all of that, so you should
be able to do that if you need to").

## What still holds

- **Spending and cleanup:** the $10 a day cap across everything, and every world, stage and site destroyed after.
- **Keys:** never print or commit a key.
- **New credentials:** the yes covers only keys already on hand. Each new credential still waits for Aaron's written yes: a GitHub App, a Slack app, a new cloud token, E2B.

## Supersedes

- `design/goals/17-superagent.md`: "are written first, and nothing in it goes live without Aaron's yes." → "are written first; its deploys use the Cloudflare keys already on hand (Aaron's standing yes, 23 November 2026), and a new credential still waits for his yes."
- `design/goals/17-superagent.md`: "Each real credential, each cloud resource and the deploy itself waits for Aaron's written yes, and stays within the daily cap." → "The deploy and the cloud resources on the Cloudflare keys already on hand go ahead under Aaron's standing yes (23 November 2026); each new credential, such as a GitHub App or a Slack app, waits for his written yes; all of it stays within the daily cap and is destroyed after."
- `design/goals/17-superagent.md`: "No cloud: E2B and staging are later, each its own yes." → "Real model runs through VibeProxy, and deploys on the Cloudflare keys already on hand, go ahead whenever a slice needs them (Aaron's standing yes, 23 November 2026), within the daily cap and destroyed after; E2B, and any new cloud credential, is still its own yes."
