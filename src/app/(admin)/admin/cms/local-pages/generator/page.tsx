import type { Metadata } from "next";
import pool from "@/lib/db/pool";
import GeneratorForm from "./GeneratorForm";

export const metadata: Metadata = { title: "Sayfa Üretici | Admin XipSoft", robots: { index: false, follow: false } };

export default async function LocalPagesGeneratorPage() {
  const [services, locations] = await Promise.all([
    pool.query(`SELECT id::text, title FROM services WHERE is_active = TRUE AND row_type = 'main' ORDER BY sort_order, title`),
    pool.query(`SELECT id::text, name, location_type FROM locations WHERE is_active = TRUE ORDER BY location_type, name`),
  ]);
  return <div className="mx-auto max-w-5xl space-y-5"><div><h1 className="text-xl font-bold text-gray-900">Toplu Sayfa Üretici</h1><p className="text-xs text-gray-500">Önce dry-run ile kapsamı kontrol edin; üretim kayıtları review olarak kuyruğa alınır.</p></div><GeneratorForm services={services.rows} locations={locations.rows} /></div>;
}
