"use client";

import { useState, useEffect } from "react";
import { Upload, Trash2, Image, FileText, Search, Grid, List } from "lucide-react";

type MediaFile = { name: string; path: string; size: number; sizeFormatted: string; type: string; ext: string; modifiedAt: string; isImage: boolean };

export default function MediaClient() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [folder, setFolder] = useState("images");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);

  const loadFiles = async () => {
    setLoading(true);
    try { const r = await fetch(`/api/admin/media?folder=${folder}`); const j = await r.json(); if (j.ok) setFiles(j.files || []); } catch {}
    setLoading(false);
  };

  useEffect(() => { loadFiles(); }, [folder]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("folder", folder);
    try { const r = await fetch("/api/admin/media", { method: "POST", body: fd }); const j = await r.json(); if (j.ok) await loadFiles(); else alert(j.error); }
    catch (err: any) { alert("Hata: " + err.message); }
    setUploading(false);
    e.target.value = "";
  };

  const handleDelete = async (path: string) => {
    if (!confirm("Silinsin mi?")) return;
    try { const r = await fetch(`/api/admin/media?path=${encodeURIComponent(path)}`, { method: "DELETE" }); const j = await r.json(); if (j.ok) { setFiles((p) => p.filter((f) => f.path !== path)); if (selectedFile?.path === path) setSelectedFile(null); } }
    catch {}
  };

  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Upload className="w-5 h-5 text-gray-500" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Medya</h1>
            <p className="text-xs text-gray-500">{files.length} dosya</p>
          </div>
        </div>
        <label className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-900 hover:bg-gray-100 cursor-pointer disabled:opacity-50">
          <Upload className="w-3.5 h-3.5" /> {uploading ? "Yükleniyor..." : "Yükle"}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="input w-auto">
          <option value="images">images</option>
          <option value="media">media</option>
          <option value="uploads">uploads</option>
        </select>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Dosya ara..." className="input pl-9" />
        </div>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setViewMode("grid")} className={`p-1.5 ${viewMode === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}><Grid className="w-3.5 h-3.5" /></button>
          <button onClick={() => setViewMode("list")} className={`p-1.5 ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}><List className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {loading && <p className="text-xs text-gray-400">Yükleniyor...</p>}

      {!loading && viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {filtered.map((file) => (
            <div key={file.path} onClick={() => setSelectedFile(file)} className={`rounded-lg border p-2 cursor-pointer transition-colors ${selectedFile?.path === file.path ? "border-gray-300 bg-gray-100" : "border-gray-200 hover:bg-gray-50"}`}>
              {file.isImage ? (
                <div className="aspect-square bg-gray-100 rounded mb-1.5 overflow-hidden flex items-center justify-center">
                  <img src={file.path} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ) : (
                <div className="aspect-square bg-gray-100 rounded mb-1.5 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <p className="text-[10px] text-gray-500 truncate">{file.name}</p>
              <p className="text-[9px] text-gray-400">{file.sizeFormatted}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && viewMode === "list" && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">Dosya</th>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">Boyut</th>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">Tür</th>
                <th className="px-4 py-2 text-left text-gray-500 font-medium">Tarih</th>
                <th className="px-4 py-2 text-right text-gray-500 font-medium">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((file) => (
                <tr key={file.path} className="hover:bg-gray-50">
                  <td className="px-4 py-2 flex items-center gap-2">
                    {file.isImage ? <Image className="w-4 h-4 text-gray-500" /> : <FileText className="w-4 h-4 text-gray-500" />}
                    <span className="text-gray-700">{file.name}</span>
                  </td>
                  <td className="px-4 py-2 text-gray-500">{file.sizeFormatted}</td>
                  <td className="px-4 py-2 text-gray-500">{file.type}</td>
                  <td className="px-4 py-2 text-gray-500">{new Date(file.modifiedAt).toLocaleString("tr-TR")}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => handleDelete(file.path)} className="p-1 rounded text-gray-500 hover:text-gray-900 hover:bg-gray-100"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedFile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50 shadow-sm">
          <div className="max-w-6xl mx-auto flex items-center gap-4">
            {selectedFile.isImage && <img src={selectedFile.path} alt={selectedFile.name} className="w-12 h-12 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900">{selectedFile.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{selectedFile.path} — {selectedFile.sizeFormatted}</p>
            </div>
            <button onClick={() => navigator.clipboard.writeText(selectedFile.path)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-[11px] text-gray-500 hover:text-gray-900">Kopyala</button>
            <button onClick={() => handleDelete(selectedFile.path)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-[11px] text-gray-900 hover:bg-gray-100">Sil</button>
            <button onClick={() => setSelectedFile(null)} className="text-gray-500 hover:text-gray-900 text-lg">×</button>
          </div>
        </div>
      )}
    </div>
  );
}
