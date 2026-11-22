import { ButtonLink, PageHeader } from "@/components/ui";
import ItemCapture from "./ItemCapture";

export default function NewItemPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add a piece"
        actions={
          <ButtonLink href="/closet" variant="quiet" size="sm">
            Cancel
          </ButtonLink>
        }
      />
      <ItemCapture />
    </div>
  );
}
