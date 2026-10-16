import type { Metadata } from "next";
import Link from "next/link";
import pool from "@/lib/database";
import { listPages } from "@/app/_actions/admin-local-pages-actions";

export const metadata: Metadata = {
  title: "Yerel Sayfalar | Admin XipSoft",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

async function getOptions() {
  try {
    const [services, locations] = await Promise.all([
      pool.query(`SELECT id, title FROM services WHERE is_active = TRUE ORDER BY sort_order, title`),
      pool.query(`SELECT id::text, name, slug, location_type FROM locations WHERE is_active = TRUE ORDER BY location_type, name`),
    ]);
    return { services: services.rows, locations: locations.rows, error: null };
  } catch (error) {
    return { services: [], locations: [], error: error instanceof Error ? error.message : "Seçenekler yüklenemedi" };
  }
}

export default async function LocalPagesPage({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const filters = {
    locationType: first(query.locationType),
    locationId: first(query.locationId),
    serviceId: first(query.serviceId),
    status: first(query.status),
    search: first(query.search),
    limit: 50,
    offset: 0,
  };
  const [{ services, locations, error: optionsError }, result] = await Promise.all([
    getOptions(),
    listPages(filters),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Yerel Sayfalar</h1>
          <p className="text-xs text-gray-500">Hizmet + konum SEO sayfalarını yönetin</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/cms/local-pages/generator" className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50">Toplu üretici</Link>
          <Link href="/admin/cms/local-pages/new" className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white hover:bg-violet-700">Yeni Sayfa</Link>
        </div>
      </div>

      {(result.error || optionsError) && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {result.error || optionsError}. Migration için `npm run db:migrate-local-pages` çalıştırılmalı.
        </div>
      )}

      <form className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-5" method="get">
        <input name="search" defaultValue={filters.search} placeholder="Başlık veya slug" className="rounded-lg border border-gray-200 px-3 py-2 text-xs outline-none focus:border-violet-400" />
        <select name="serviceId" defaultValue={filters.serviceId} className="rounded-lg border border-gray-200 px-3 py-2 text-xs">
          <option value="">Tüm hizmetler</option>
          {services.map((service: any) => <option key={service.id} value={service.id}>{service.title}</option>)}
        </select>
        <select name="locationType" defaultValue={filters.locationType} className="rounded-lg border border-gray-200 px-3 py-2 text-xs">
          <option value="">Tüm konum türleri</option>
          <option value="province">İl</option>
          <option value="district">İlçe</option>
          <option value="neighborhood">Mahalle</option>
        </select>
        <select name="locationId" defaultValue={filters.locationId} className="rounded-lg border border-gray-200 px-3 py-2 text-xs">
          <option value="">Tüm konumlar</option>
          {locations.map((location: any) => <option key={location.id} value={location.id}>{location.name} ({location.location_type})</option>)}
        </select>
        <div className="flex gap-2">
          <select name="status" defaultValue={filters.status} className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs">
            <option value="">Tüm durumlar</option>
            <option value="draft">Taslak</option>
            <option value="review">İncelemede</option>
            <option value="published">Yayında</option>
            <option value="paused">Pasif</option>
          </select>
          <button className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white">Filtrele</button>
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-xs">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Başlık</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Hizmet</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Konum</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Durum</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Güncelleme</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {result.pages.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">Kayıt bulunamadı</td></tr>
            ) : result.pages.map((page: any) => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-4 py-3"><Link href={`/admin/cms/local-pages/${page.id}`} className="font-medium text-gray-900 hover:text-violet-700">{page.title}</Link><p className="mt-0.5 font-mono text-[10px] text-gray-400">/{page.slug}</p></td>
                <td className="px-4 py-3 text-gray-600">{page.service_title}</td>
                <td className="px-4 py-3 text-gray-600">{page.location_name}<span className="ml-1 text-[10px] text-gray-400">({page.location_type})</span></td>
                <td className="px-4 py-3"><span className="rounded bg-gray-100 px-2 py-1 text-[10px] text-gray-700">{page.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{new Date(page.updated_at).toLocaleDateString("tr-TR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
