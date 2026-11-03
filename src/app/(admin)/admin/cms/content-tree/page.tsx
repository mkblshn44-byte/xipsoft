import type { Metadata } from "next";
import { listTreeNodesForAdmin, type AdminTreeNode } from "@/lib/content-tree-admin";
import ContentTreeClient from "./ContentTreeClient";

export const metadata: Metadata = {
  title: "İçerik Ağacı | Admin XipSoft",
  robots: { index: false, follow: false },
};

export default async function ContentTreePage() {
  let nodes: AdminTreeNode[] = [];
  let error: string | null = null;
  try {
    nodes = await listTreeNodesForAdmin();
  } catch (caught) {
    error = caught instanceof Error ? caught.message : "Ağaç yüklenemedi";
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">İçerik Ağacı</h1>
        <p className="text-xs text-gray-500">
          12 ana hizmet, yerel il/ilçe sayfaları ve tüm kurumsal CMS içeriğini hiyerarşik olarak buradan yönetebilirsiniz.
          Blog yazıları ise <span className="font-medium text-amber-700">/admin/blog</span> panelinden bağımsız yönetilir.
          Kanonik adresler <span className="font-mono">.html</span> ile biter.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</div>
      ) : (
        <ContentTreeClient nodes={nodes} />
      )}
    </div>
  );
}
