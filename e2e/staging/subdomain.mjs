// Reads the account's workers.dev subdomain (`GET /accounts/<id>/workers/subdomain`) and writes `subdomain=<name>` to the file named by its one argument (the workflow passes
// $GITHUB_OUTPUT). The staging prove forms its address from it (check 41). A subdomain is not a secret, but the response is never printed: the only things this says are the
// status code on a failure and that the name was bad. The token is read from the environment and never written. Exits 2 on any problem, writing nothing.
// `ORTHO_STAGING_API` points it at another address, loopback only, for its own tests.
import { appendFileSync } from "node:fs";

const LOOPBACK = /^http:\/\/(127\.\d+\.\d+\.\d+|localhost|\[::1\]):\d+$/;
const NAME = /^[a-z0-9-]{1,63}$/;
const [out] = process.argv.slice(2);
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, ORTHO_STAGING_API: given } = process.env;
const stop = (message) => { process.stderr.write(`subdomain: ${message}\n`); process.exit(2); };

if (!out) stop("needs the file to write to");
if (!token || !account) stop("CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID must both be set: this runs only inside the staging workflow");
if (given !== undefined && !LOOPBACK.test(given)) stop("ORTHO_STAGING_API is for a server on this machine only");
const res = await fetch(`${given ?? "https://api.cloudflare.com"}/client/v4/accounts/${account}/workers/subdomain`, { headers: { authorization: `Bearer ${token}` } }).catch(() => undefined);
if (res === undefined) stop("the account could not be reached");
if (!res.ok) stop(`the account's subdomain could not be read (HTTP ${res.status})`);
const name = (await res.json().catch(() => ({})))?.result?.subdomain;
if (typeof name !== "string" || !NAME.test(name)) stop("the account has no workers.dev subdomain, or its name is not 1 to 63 of a-z, 0-9 and dashes");
appendFileSync(out, `subdomain=${name}\n`);
