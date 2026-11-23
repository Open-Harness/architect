// A hole the portal cannot fill yet (portal.md's list): said as `not yet`, with what is missing, and never a made-up value.
export const NotYet = ({ hole, what }: { readonly hole: string; readonly what: string }) => (
  <span data-portal="not-yet" data-hole={hole}>not yet<span className="meta">{` (${what})`}</span></span>
);
