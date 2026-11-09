import Link from "next/link";
import ItemCapture from "./ItemCapture";

export default function NewItemPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">New item</h1>
        <Link href="/closet" className="text-sm text-stone-600 hover:text-stone-900">
          Cancel
        </Link>
      </div>
      <ItemCapture />
    </div>
  );
}
