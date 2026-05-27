import { getDefaultDoc } from "../../lib/docs";
import { DocsPage } from "./DocsPage";

export default function DocsIndexPage() {
  return <DocsPage page={getDefaultDoc()} />;
}
