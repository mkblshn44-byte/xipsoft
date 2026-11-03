import type { Metadata } from "next";
import pool from "@/lib/db/pool";
import LocalPageForm from "../LocalPageForm";

export const metadata: Metadata = { title: "Yeni Yerel Sayfa | Admin XipSoft", robots: { index: false, follow: false } };

export default async function NewLocalPagePage() {
  const [services, locations] = await Promise.all([
    pool.query(`SELECT id::text, title FROM services WHERE is_active = TRUE AND row_type = 'main' ORDER BY sort_order, title`),
    pool.query(`SELECT id::text, name, location_type FROM locations WHERE is_active = TRUE ORDER BY location_type, name`),
  ]);
  return <div className="mx-auto max-w-5xl space-y-5"><h1 className="text-xl font-bold text-gray-900">Yeni Yerel Sayfa</h1><LocalPageForm services={services.rows} locations={locations.rows} /></div>;
}
