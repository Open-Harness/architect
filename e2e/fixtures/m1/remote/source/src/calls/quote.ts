// An actual non-Effect HTTP callable. It is a fixture package's own code, not a platform shim.
export type Mode = "ok" | "reject" | "throw" | "hold";
export interface Reply { readonly value: string }

export default function quote(origin: string, mode: Mode): Promise<Reply> {
  if (mode === "throw") throw { marker: "foreign-private-canary", kind: "synchronous" };
  return fetch(new URL(`/${mode}`, origin)).then(async (response) => {
    const body: unknown = await response.json();
    if (!response.ok) return Promise.reject(body);
    return body as Reply;
  });
}
