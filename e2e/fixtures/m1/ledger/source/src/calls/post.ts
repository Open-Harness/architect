// An actual non-Effect HTTP callable. It is a fixture package's own code, not a platform shim.
export default function post(origin: string): Promise<{ readonly value: string }> {
  return fetch(new URL("/ok", origin)).then((response) => response.json() as Promise<{ readonly value: string }>);
}
