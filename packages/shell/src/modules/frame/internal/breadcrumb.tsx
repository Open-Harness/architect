// The breadcrumb: the chain of parents from home to the page, each a link where the route has the parameters its page needs. The page shown is
// last, current and no link.
import { Link } from "./link.tsx";

export interface Crumb {
  readonly page: string;
  readonly href: string | undefined;
  readonly current: boolean;
}

export const Breadcrumb = ({ crumbs }: { readonly crumbs: ReadonlyArray<Crumb> }) => (
  <nav aria-label="Breadcrumb">
    <ol data-shell="breadcrumb">
      {crumbs.map((crumb) => (
        <li key={crumb.page} data-shell="crumb" data-page={crumb.page} data-current={String(crumb.current)}>
          {crumb.current || crumb.href === undefined ? <span aria-current={crumb.current ? "page" : undefined}>{crumb.page}</span> : <Link href={crumb.href}>{crumb.page}</Link>}
        </li>
      ))}
    </ol>
  </nav>
);
