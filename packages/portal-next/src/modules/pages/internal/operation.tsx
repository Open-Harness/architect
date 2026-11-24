// `/portal/operations/:name`: slice 7 draws its five tabs. Until then the page is its name, its description and its thing's scope in the rail,
// so a search that opens an operation lands on a page and not on a hole.
import { Frame } from "../../frame/service.ts";
import type { PortalData } from "../../data/types.ts";
import { NotFound } from "./draw.tsx";

export const OperationPage = ({ data, name }: { readonly data: PortalData; readonly name: string }) => {
  const op = data.blueprint.model.operations[name];
  if (op === undefined) return <NotFound what={`The operation ${name}`} data={data} />;
  return (
    <Frame.Page status={200} data={data} scope={`operation:${op.name}`} operations={[op.name]}>
      <h1>{op.name}</h1>
      <p>{op.description}</p>
    </Frame.Page>
  );
};
