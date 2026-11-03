import type { Metadata } from "next";
import { listCategoryOptions, type TreeNodeType } from "@/lib/content-tree-admin";
import ContentNodeForm from "../ContentNodeForm";

export const metadata: Metadata = {
  title: "Yeni İçerik | Admin XipSoft",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function NewContentNodePage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const defaultParentId = first(query.parent) || undefined;
  const typeParam = first(query.type);
  const defaultType: TreeNodeType = typeParam === "category" ? "category" : "page";
  const options = await listCategoryOptions().catch(() => []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Yeni {defaultType === "category" ? "Kategori" : "Sayfa"}</h1>
        <p className="text-xs text-gray-500">Üst öğe seçerek sınırsız derinlikte ağaç kurabilirsiniz.</p>
      </div>
      <ContentNodeForm parents={options} defaultParentId={defaultParentId} defaultType={defaultType} />
    </div>
  );
}
