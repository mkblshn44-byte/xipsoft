import type { Metadata } from "next";
import pool from "@/lib/db/pool";
import { getPage } from "@/app/_actions/admin-local-pages-actions";
import LocalPageForm from "../LocalPageForm";

export const metadata: Metadata = { title: "Yerel Sayfa Düzenle | Admin XipSoft", robots: { index: false, follow: false } };

export default async function EditLocalPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ page, error }, services, locations] = await Promise.all([
    getPage(id),
    pool.query(`SELECT id::text, title FROM services WHERE is_active = TRUE AND row_type = 'main' ORDER BY sort_order, title`),
    pool.query(`SELECT id::text, name, location_type FROM locations WHERE is_active = TRUE ORDER BY location_type, name`),
  ]);
  if (!page) return <div className="mx-auto max-w-5xl rounded-xl bg-red-50 p-5 text-sm text-red-700">{error ?? "Sayfa bulunamadı"}</div>;
  return <div className="mx-auto max-w-5xl space-y-5"><h1 className="text-xl font-bold text-gray-900">Yerel Sayfa Düzenle</h1><LocalPageForm services={services.rows} locations={locations.rows} page={page} /></div>;
}
