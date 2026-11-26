// Scaffolded from ortho new adapter. Yours from now on.
// Bridge's world, as Capxul's own Bridge account sees it: customers made by KYC links, a virtual account per currency
// with the deposit instructions Bridge's guides publish, and transfers out. A request in, a reply out; the clock and
// the ids come from the caller, so a test can drive it directly. Every answer is one of Bridge's published examples
// with fresh ids and the caller's fields (design/decisions/CX-bridge.md, "The stand-in"); its rules are Bridge's:
// no `Api-Key` is 401, a POST without an `Idempotency-Key` is 400, and a key seen before gets the first answer again.
export interface Request {
  readonly method: string;
  readonly path: string;
  readonly apiKey: string | undefined;
  readonly idempotencyKey: string | undefined;
  readonly body: string | undefined;
}
export interface Reply { readonly status: number; readonly body: unknown }
export interface Context {
  /** Milliseconds since the epoch. */
  readonly now: () => number;
  /** A fresh random hex string of 32 characters: an id's body. */
  readonly random: () => string;
  readonly saved: (state: unknown) => void;
}

/** Lead Bank, as Bridge's virtual account guide gives it (get-started/guides/move-money/virtualaccounts). */
export const LEAD_BANK = { bank_name: "Lead Bank", bank_address: "1801 Main St., Kansas City, MO 64108", bank_routing_number: "101019644" } as const;
/** The first US account number the guide gives; each later account takes the next. */
export const FIRST_USD_ACCOUNT = 215268120000n;
/**
 * Modulr's Irish branch, from the same guide: BIC MODRIE00XXX, sort code 140353, account 07970528. The guide's IBAN,
 * IE90MODR14035307970528, fails ISO 13616's mod 97, so the stand-in computes the check digits: IE34MODR14035307970528.
 */
export const MODULR = { bank_name: "Modulr Finance, Ireland Branch", bank_address: "Floor 6, 2 Grand Canal Square, Dublin, Ireland", bic: "MODRIE00XXX", account_holder_name: "Bridge Building Sp.z.o.o." } as const;
export const FIRST_EUR_ACCOUNT = 14035307970528n;

/** An Irish IBAN for Modulr's sort code and an account number: ISO 13616's check digits over `MODR<14 digits>IE00`. */
export const ibanOf = (account: bigint): string => {
  const bban = `MODR${account.toString().padStart(14, "0")}`;
  const numeric = [...`${bban}IE00`].map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join("");
  return `IE${(98n - (BigInt(numeric) % 97n)).toString().padStart(2, "0")}${bban}`;
};

type Json = Record<string, unknown>;
interface Customer { id: string; type: "individual" | "business"; kyc_status: string; rejection_reasons: Array<Json> }
interface KycLink extends Json { id: string; customer_id: string; type: string; kyc_status: string }
interface VirtualAccount extends Json { id: string; customer_id: string; status: string; source_deposit_instructions: Json }
interface Transfer extends Json { id: string; state: string }
interface Kept { readonly path: string; readonly reply: Reply }
/** What the stand-in issued, for a journey to read back: each virtual account and transfer, and the key each POST came with. */
export interface Issued {
  readonly kycLinks: ReadonlyArray<KycLink>;
  readonly virtualAccounts: ReadonlyArray<VirtualAccount>;
  readonly transfers: ReadonlyArray<Transfer & { readonly idempotency_key: string }>;
}

const failed = (status: number, code: string, message: string): Reply => ({ status, body: { code, message } });
const parsed = (body: string | undefined): Json | undefined => {
  if (body === undefined || body === "") return {};
  const value: unknown = JSON.parse(body);
  return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Json) : undefined;
};
const iso = (ms: number) => new Date(ms).toISOString();

export const createWorld = (context: Context) => {
  const customers = new Map<string, Customer>();
  const kycLinks = new Map<string, KycLink>();
  const accounts = new Map<string, VirtualAccount>();
  const transfers = new Map<string, Transfer & { idempotency_key: string }>();
  const kept = new Map<string, Kept>();
  const next = { usd: FIRST_USD_ACCOUNT, eur: FIRST_EUR_ACCOUNT };
  const save = () => context.saved(issued());

  const issued = (): Issued => ({ kycLinks: [...kycLinks.values()], virtualAccounts: [...accounts.values()], transfers: [...transfers.values()] });

  /** `POST /v0/kyc_links`: Bridge's SuccessfulKycLinkCreateResponse, which makes the customer too. */
  const kycLink = (fields: Json): Reply => {
    const type = fields["type"];
    if (type !== "individual" && type !== "business") return failed(400, "invalid_parameters", "type must be individual or business");
    if (typeof fields["full_name"] !== "string" || typeof fields["email"] !== "string") return failed(400, "invalid_parameters", "full_name and email are required");
    const customer: Customer = { id: context.random(), type, kyc_status: "not_started", rejection_reasons: [] };
    const id = context.random();
    const link: KycLink = {
      id, full_name: fields["full_name"], email: fields["email"], type,
      kyc_link: `https://bridge.withpersona.com/verify?inquiry-template-id=itmpl_${id}`,
      tos_link: `https://dashboard.bridge.xyz/accept-terms-of-service?session_token=${id}`,
      kyc_status: "not_started", rejection_reasons: [], tos_status: "pending", customer_id: customer.id, created_at: iso(context.now()),
    };
    customers.set(customer.id, customer);
    kycLinks.set(id, link);
    return { status: 200, body: link };
  };

  /** `POST /v0/customers/{id}/virtual_accounts`: the guide's USD or EUR answer, with the next account number. */
  const virtualAccount = (customerId: string, fields: Json): Reply => {
    const customer = customers.get(customerId);
    if (customer === undefined) return failed(404, "not_found", "customer not found");
    if (customer.kyc_status !== "approved") return failed(400, "customer_not_approved", "the customer's KYC is not approved");
    const currency = (fields["source"] as Json | undefined)?.["currency"];
    const destination = fields["destination"] as Json | undefined;
    if (destination === undefined || typeof destination["address"] !== "string") return failed(400, "invalid_parameters", "destination is required");
    const instructions: Json | undefined = currency === "usd"
      ? { currency: "usd", ...LEAD_BANK, bank_account_number: String(next.usd++), bank_beneficiary_name: "Capxul customer", bank_beneficiary_address: "1234 Main St., Kansas City, MO 64108", payment_rail: "ach_push", payment_rails: ["ach_push", "wire"] }
      : currency === "eur"
        ? { currency: "eur", iban: ibanOf(next.eur++), ...MODULR, payment_rails: "sepa" }
        : undefined;
    if (instructions === undefined) return failed(400, "invalid_parameters", "source.currency must be usd or eur here");
    const account: VirtualAccount = {
      id: context.random(), status: "activated", developer_fee_percent: "0.0", customer_id: customerId, created_at: iso(context.now()),
      source_deposit_instructions: instructions, destination: { currency: destination["currency"], payment_rail: destination["payment_rail"], address: destination["address"] },
    };
    accounts.set(account.id, account);
    // Bridge documents 200 for this call, though it creates (`latest.json`).
    return { status: 200, body: account };
  };

  const deactivate = (customerId: string, accountId: string): Reply => {
    const account = accounts.get(accountId);
    if (account === undefined || account.customer_id !== customerId) return failed(404, "not_found", "virtual account not found");
    account.status = "deactivated";
    return { status: 200, body: account };
  };

  /** A transfer's `currency`: its source's fiat, or the fiat a stablecoin source is pegged to. */
  const pegged = (currency: unknown): unknown => currency === "usdc" ? "usd" : currency === "eurc" ? "eur" : currency;

  /**
   * `POST /v0/transfers`: Bridge's AchOfframpTransferResponse, awaiting funds, with the `currency` and the receipt's
   * `*_currency` fields its schema requires and its example leaves out.
   */
  const transfer = (fields: Json, key: string): Reply => {
    const source = fields["source"] as Json | undefined;
    const destination = fields["destination"] as Json | undefined;
    if (typeof fields["on_behalf_of"] !== "string" || source === undefined || destination === undefined) return failed(400, "invalid_parameters", "on_behalf_of, source and destination are required");
    if (!customers.has(fields["on_behalf_of"])) return failed(404, "not_found", "customer not found");
    if (typeof fields["amount"] !== "string" || !/^\d+(\.\d{1,6})?$/.test(fields["amount"]) || /^0+(\.0+)?$/.test(fields["amount"])) return failed(400, "invalid_parameters", "amount must be a positive decimal string");
    const amount = fields["amount"];
    const id = context.random();
    const made = {
      id, ...(typeof fields["client_reference_id"] === "string" ? { client_reference_id: fields["client_reference_id"] } : {}), state: "awaiting_funds", on_behalf_of: fields["on_behalf_of"], amount, currency: pegged(source["currency"]), developer_fee: "0.0",
      source, destination, receipt: {
        initial_amount: amount, initial_amount_currency: source["currency"], developer_fee: "0.0", developer_fee_currency: source["currency"], exchange_fee: "0.0", exchange_fee_currency: source["currency"],
        subtotal_amount: amount, subtotal_amount_currency: source["currency"], gas_fee: "0.0", gas_fee_currency: source["currency"], final_amount: amount, final_amount_currency: destination["currency"],
      },
      created_at: iso(context.now()), updated_at: iso(context.now()), idempotency_key: key,
    };
    transfers.set(id, made);
    const { idempotency_key: _, ...answer } = made;
    return { status: 201, body: answer };
  };

  const route = (request: Request, fields: Json): Reply => {
    const parts = request.path.replace(/^\/v0/, "").split("/").filter((p) => p !== "");
    const [a, b, c, d, e] = parts;
    if (request.method === "POST" && a === "kyc_links" && b === undefined) return kycLink(fields);
    if (request.method === "GET" && a === "kyc_links" && b !== undefined) return kycLinks.has(b) ? { status: 200, body: kycLinks.get(b) } : failed(404, "not_found", "kyc link not found");
    if (a === "customers" && b !== undefined && c === "virtual_accounts") {
      if (request.method === "POST" && d === undefined) return virtualAccount(b, fields);
      if (request.method === "POST" && d !== undefined && e === "deactivate") return deactivate(b, d);
      if (request.method === "GET" && d !== undefined && e === undefined) return accounts.get(d)?.customer_id === b ? { status: 200, body: accounts.get(d) } : failed(404, "not_found", "virtual account not found");
    }
    if (request.method === "POST" && a === "transfers" && b === undefined) return transfer(fields, request.idempotencyKey ?? "");
    if (request.method === "GET" && a === "transfers" && b !== undefined) {
      const found = transfers.get(b);
      if (found === undefined) return failed(404, "not_found", "transfer not found");
      const { idempotency_key: _, ...answer } = found;
      return { status: 200, body: answer };
    }
    return failed(404, "not_found", `${request.method} ${request.path} is not one the stand-in answers`);
  };

  const handle = (request: Request): Reply => {
    if ((request.apiKey ?? "") === "") return failed(401, "unauthorized", "Missing Api-Key header");
    if (request.method === "POST" && (request.idempotencyKey ?? "") === "") return failed(400, "missing_idempotency_key", "Idempotency-Key header is required");
    const key = request.method === "POST" ? `${request.path} ${request.idempotencyKey}` : undefined;
    const seen = key === undefined ? undefined : kept.get(key);
    if (seen !== undefined) return structuredClone(seen.reply);
    const fields = parsed(request.body);
    if (fields === undefined) return failed(400, "invalid_json", "the body is not a JSON object");
    const reply = route(request, fields);
    if (key !== undefined && reply.status < 500) kept.set(key, { path: request.path, reply: structuredClone(reply) });
    // a snapshot: the first answer as it was, not the resource a later decision or deactivation changes
    save();
    return reply;
  };

  /** Bridge's decision on a KYC link and its customer: what its hosted form ends in, which the stand-in is told. */
  const decide = (kycLinkId: string, status: "approved" | "rejected", reason?: string): Reply => {
    const link = kycLinks.get(kycLinkId);
    const customer = link === undefined ? undefined : customers.get(link.customer_id);
    if (link === undefined || customer === undefined) return failed(404, "not_found", "kyc link not found");
    const reasons = status === "rejected" ? [{ developer_reason: reason ?? "Rejected", reason: reason ?? "Rejected", created_at: iso(context.now()) }] : [];
    link.kyc_status = status;
    link["tos_status"] = "approved";
    link["rejection_reasons"] = reasons;
    customer.kyc_status = status;
    customer.rejection_reasons = reasons;
    save();
    return { status: 200, body: link };
  };

  /** A transfer's later state, as Bridge moves it (Bridge's `TransferState`). */
  const move = (transferId: string, state: string): Reply => {
    const found = transfers.get(transferId);
    if (found === undefined) return failed(404, "not_found", "transfer not found");
    found.state = state;
    found["updated_at"] = iso(context.now());
    save();
    const { idempotency_key: _, ...answer } = found;
    return { status: 200, body: answer };
  };

  return { handle, decide, move, issued };
};

export type World = ReturnType<typeof createWorld>;
