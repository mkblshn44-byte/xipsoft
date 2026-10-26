import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { collectDescendants, getTreeNode, listCategoryOptions } from "@/lib/content-tree-admin";
import ContentNodeForm from "../ContentNodeForm";

export const metadata: Metadata = {
  title: "İçerik Düzenle | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default async function EditContentNodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const node = await getTreeNode(id).catch(() => null);
  if (!node) notFound();

  // Kendisi ve tüm torunları üst öğe listesinden çıkarılır (çevrim önleme).
  const descendants = await collectDescendants(node.id).catch(() => []);
  const excluded = new Set([node.id, ...descendants.map((descendant) => descendant.id)]);
  const options = (await listCategoryOptions().catch(() => []))
    .filter((option) => !excluded.has(option.id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">İçeriği Düzenle</h1>
          <p className="font-mono text-xs text-gray-400">/{node.fullPath}.html</p>
        </div>
      </div>
      <ContentNodeForm parents={options} node={node} />
    </div>
  );
}
