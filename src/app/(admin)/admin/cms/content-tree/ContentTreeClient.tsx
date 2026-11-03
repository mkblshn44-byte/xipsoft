"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  FileText,
  ArrowUp,
  ArrowDown,
  Trash2,
  RotateCcw,
  FolderPlus,
  FilePlus,
  ExternalLink,
  Sparkles,
  MapPin,
  Search,
  X,
  ChevronsUpDown,
  ChevronsDownUp,
  Edit3,
} from "lucide-react";
import type { AdminTreeNode } from "@/lib/content-tree-admin";
import { canonicalPathForNode } from "@/lib/content-path";
import {
  deleteContentNode,
  reorderContentNode,
  restoreContentNode,
  setContentNodeStatus,
} from "@/app/_actions/admin-content-tree-actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Taslak",
  review: "İncelemede",
  published: "Yayında",
  paused: "Pasif",
};

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  review: "bg-amber-100 text-amber-700",
  published: "bg-emerald-100 text-emerald-700",
  paused: "bg-rose-100 text-rose-700",
};

function canonical(node: Pick<AdminTreeNode, "fullPath" | "kind">): string {
  // Link, sayfanın kendi kanoniğiyle birebir aynı olmalı; farklısı tıklayınca
  // fazladan bir yönlendirme üretir.
  return canonicalPathForNode(node);
}

function getNodeIcon(node: AdminTreeNode) {
  if (node.nodeType === "category") {
    return <FolderTree className="h-4 w-4 shrink-0 text-violet-600" />;
  }
  if (node.kind === "service" || Boolean(node.serviceId)) {
    return <Sparkles className="h-4 w-4 shrink-0 text-sky-600" />;
  }
  if (node.kind === "location") {
    return <MapPin className="h-4 w-4 shrink-0 text-emerald-600" />;
  }
  return <FileText className="h-4 w-4 shrink-0 text-gray-500" />;
}

function getNodeBadge(node: AdminTreeNode) {
  if (node.nodeType === "category") {
    return (
      <span className="rounded border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
        Kategori
      </span>
    );
  }
  if (node.kind === "service" || Boolean(node.serviceId)) {
    return (
      <span className="rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700">
        Hizmet
      </span>
    );
  }
  if (node.kind === "location") {
    return (
      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
        Yerel SEO
      </span>
    );
  }
  return (
    <span className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
      Sayfa
    </span>
  );
}

function getChildCountBadge(node: AdminTreeNode, count: number) {
  if (count === 0) return null;
  if (node.kind === "service" && node.nodeType === "page") {
    return (
      <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800">
        {count} İl
      </span>
    );
  }
  if (node.kind === "location") {
    return (
      <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800">
        {count} İlçe
      </span>
    );
  }
  return (
    <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-700">
      {count} alt öğe
    </span>
  );
}

export default function ContentTreeClient({ nodes }: { nodes: AdminTreeNode[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const active = useMemo(() => nodes.filter((node) => !node.isDeleted), [nodes]);
  const deleted = useMemo(() => nodes.filter((node) => node.isDeleted), [nodes]);

  const stats = useMemo(() => {
    let servicesCount = 0;
    let locationsCount = 0;
    let customCount = 0;
    let publishedCount = 0;

    for (const node of active) {
      if (node.kind === "service" && node.nodeType === "page") servicesCount++;
      else if (node.kind === "location") locationsCount++;
      else customCount++;

      if (node.status === "published") publishedCount++;
    }

    return {
      total: active.length,
      servicesCount,
      locationsCount,
      customCount,
      publishedCount,
    };
  }, [active]);

  const childrenByParent = useMemo(() => {
    const map = new Map<string | null, AdminTreeNode[]>();
    for (const node of active) {
      const key = node.parentId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(node);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "tr"));
    }
    return map;
  }, [active]);

  // Initial collapse: keep root categories open, but collapse service and location nodes with children
  const [collapsed, setCollapsed] = useState<Set<string>>(() => {
    const set = new Set<string>();
    for (const node of active) {
      const hasChildren = (childrenByParent.get(node.id) ?? []).length > 0;
      if (node.parentId && hasChildren) {
        set.add(node.id);
      }
    }
    return set;
  });

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLocaleLowerCase("tr");
    if (!q) return null;

    const matchedIds = new Set<string>();
    const visibleIds = new Set<string>();

    for (const node of active) {
      const title = node.title.toLocaleLowerCase("tr");
      const path = (node.fullPath || "").toLocaleLowerCase("tr");
      const slug = (node.slug || "").toLocaleLowerCase("tr");
      if (title.includes(q) || path.includes(q) || slug.includes(q)) {
        matchedIds.add(node.id);
        visibleIds.add(node.id);
      }
    }

    const parentMap = new Map<string, string | null>();
    for (const node of active) {
      parentMap.set(node.id, node.parentId);
    }

    for (const id of matchedIds) {
      let curr = parentMap.get(id);
      while (curr) {
        visibleIds.add(curr);
        curr = parentMap.get(curr);
      }
    }

    return { matchedIds, visibleIds };
  }, [searchQuery, active]);

  function run(action: () => Promise<{ success: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "İşlem başarısız");
        return;
      }
      router.refresh();
    });
  }

  function toggleCollapse(id: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setCollapsed(new Set());
  }

  function collapseAll() {
    const set = new Set<string>();
    for (const node of active) {
      if ((childrenByParent.get(node.id) ?? []).length > 0) {
        set.add(node.id);
      }
    }
    setCollapsed(set);
  }

  function Row({ node, depth }: { node: AdminTreeNode; depth: number }) {
    if (searchResults && !searchResults.visibleIds.has(node.id)) {
      return null;
    }

    const children = childrenByParent.get(node.id) ?? [];
    const hasChildren = children.length > 0;
    const isCollapsed = searchResults ? false : collapsed.has(node.id);
    const isCategory = node.nodeType === "category";
    const isMatched = searchResults?.matchedIds.has(node.id);

    return (
      <li>
        <div
          className={`flex items-center gap-2 border-b border-gray-100 py-2.5 pr-3 transition-colors ${
            isMatched ? "bg-amber-50/70 hover:bg-amber-100/60" : "hover:bg-gray-50/80"
          }`}
          style={{ paddingLeft: `${depth * 20 + 10}px` }}
        >
          <button
            type="button"
            onClick={() => toggleCollapse(node.id)}
            className={`flex h-5 w-5 items-center justify-center rounded text-gray-400 hover:bg-gray-200/60 ${
              hasChildren ? "" : "invisible"
            }`}
            aria-label={isCollapsed ? "Aç" : "Kapat"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {getNodeIcon(node)}

          <Link href={`/admin/cms/content-tree/${node.id}`} className="min-w-0 flex-1 group">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-xs font-medium text-gray-900 group-hover:text-violet-700">
                {node.title}
              </span>
              {getChildCountBadge(node, children.length)}
            </div>
            <span className="block truncate font-mono text-[10px] text-gray-400">
              {canonical(node)}
            </span>
          </Link>

          {getNodeBadge(node)}

          <span
            className={`rounded px-2 py-0.5 text-[10px] font-medium ${
              STATUS_STYLE[node.status] ?? "bg-gray-100 text-gray-600"
            }`}
          >
            {STATUS_LABEL[node.status] ?? node.status}
          </span>

          {!node.isIndexable && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
              noindex
            </span>
          )}

          <a
            href={canonical(node)}
            target="_blank"
            rel="noopener noreferrer"
            title="Sitede görüntüle"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex items-center gap-1">
            <Link
              href={`/admin/cms/content-tree/${node.id}`}
              title="İçeriği ve ayarları düzenle"
              className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-700 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 shadow-sm"
            >
              <Edit3 className="h-3 w-3" />
              <span className="hidden sm:inline">Düzenle</span>
            </Link>

            {isCategory && (
              <>
                <Link
                  href={`/admin/cms/content-tree/new?parent=${node.id}&type=page`}
                  title="Bu kategoriye alt sayfa ekle"
                  className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
                >
                  <FilePlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-[10px]">+Sayfa</span>
                </Link>
                <Link
                  href={`/admin/cms/content-tree/new?parent=${node.id}&type=category`}
                  title="Bu kategoriye alt kategori ekle"
                  className="flex items-center gap-0.5 rounded px-1.5 py-1 text-[11px] font-medium text-violet-700 hover:bg-violet-50"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-[10px]">+Kategori</span>
                </Link>
              </>
            )}

            <button
              type="button"
              title="Yukarı taşı"
              disabled={isPending}
              onClick={() => run(() => reorderContentNode(node.id, "up"))}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              title="Aşağı taşı"
              disabled={isPending}
              onClick={() => run(() => reorderContentNode(node.id, "down"))}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() =>
                run(() =>
                  setContentNodeStatus(node.id, node.status === "published" ? "paused" : "published")
                )
              }
              className="rounded border border-gray-200 px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              {node.status === "published" ? "Pasifleştir" : "Yayınla"}
            </button>

            <button
              type="button"
              title="Sil"
              disabled={isPending}
              onClick={() => {
                if (confirm(`"${node.title}" ve altındaki tüm içerik silinsin mi?`)) {
                  run(() => deleteContentNode(node.id));
                }
              }}
              className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {hasChildren && !isCollapsed && (
          <ul>
            {children.map((child) => (
              <Row key={child.id} node={child} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  }

  const roots = childrenByParent.get(null) ?? [];

  return (
    <div className="space-y-4">
      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      {/* Mini Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-medium text-gray-500">Toplam Sayfa & Kategori</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{stats.total.toLocaleString("tr")}</p>
        </div>
        <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-3 shadow-sm">
          <p className="text-[11px] font-medium text-sky-800">Ana Hizmetler</p>
          <p className="mt-1 text-lg font-bold text-sky-900">{stats.servicesCount}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 shadow-sm">
          <p className="text-[11px] font-medium text-emerald-800">Yerel SEO Sayfaları</p>
          <p className="mt-1 text-lg font-bold text-emerald-900">{stats.locationsCount.toLocaleString("tr")}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-medium text-gray-500">Yayında Olanlar</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{stats.publishedCount.toLocaleString("tr")}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header and Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-900">İçerik Ağacı</p>
            <p className="text-[11px] text-gray-500">
              Kanonik adresler <span className="font-mono">.html</span> ile biter. 12 ana hizmet, yerel sayfalar ve tüm CMS içeriğini tek noktadan yönetebilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              title="Tüm ağacı genişlet"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              <span>Tümünü Aç</span>
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              title="Tüm ağacı daralt"
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
              <span>Tümünü Kapat</span>
            </button>
            <Link
              href="/admin/cms/content-tree/new?type=category"
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <FolderTree className="h-3.5 w-3.5 text-violet-600" />
              Yeni Kategori
            </Link>
            <Link
              href="/admin/cms/content-tree/new?type=page"
              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              Yeni Sayfa
            </Link>
          </div>
        </div>

        {/* Real-time Search Box */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ağaçta hızlı ara... (başlık, URL veya slug)"
                className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-xs text-gray-900 placeholder-gray-400 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {searchResults && (
              <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-[11px] font-semibold text-violet-800">
                {searchResults.matchedIds.size} sonuç
              </span>
            )}
          </div>
        </div>

        {roots.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <FolderTree className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-gray-800">Henüz içerik bulunmuyor</p>
            <p className="mt-1 max-w-sm text-xs text-gray-500">
              Siteniz için hiyerarşik kategori veya içerik sayfaları oluşturmaya başlayabilirsiniz.
            </p>
            <div className="mt-4 flex gap-2">
              <Link
                href="/admin/cms/content-tree/new?type=category"
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
              >
                <FolderTree className="h-3.5 w-3.5 text-violet-600" />
                Yeni Kategori
              </Link>
              <Link
                href="/admin/cms/content-tree/new?type=page"
                className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-violet-700"
              >
                <FileText className="h-3.5 w-3.5" />
                Yeni Sayfa
              </Link>
            </div>
          </div>
        ) : (
          <ul>
            {roots.map((node) => (
              <Row key={node.id} node={node} depth={0} />
            ))}
          </ul>
        )}
      </div>

      {deleted.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Silinenler</p>
            <p className="text-[11px] text-gray-500">
              Silinen kategori ve sayfalar burada saklanır. Gerektiğinde geri yükleyebilirsiniz.
            </p>
          </div>
          <ul>
            {deleted.map((node) => (
              <li
                key={node.id}
                className="flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 text-xs text-gray-500"
              >
                <span className="flex-1 truncate line-through text-gray-600">{node.title}</span>
                <span className="font-mono text-[10px] text-gray-400">{canonical(node)}</span>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => run(() => restoreContentNode(node.id))}
                  className="flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[10px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <RotateCcw className="h-3 w-3" /> Geri yükle
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
