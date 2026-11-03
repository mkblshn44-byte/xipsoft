/**
 * References (formerly db-references) — `site_references` tablosu.
 */

import pool from "./pool";

export interface Reference {
  id: number;
  title: string;
  description: string | null;
  client_name: string | null;
  client_website: string | null;
  project_url: string | null;
  image_url: string | null;
  technologies: string[];
  category: string;
  is_featured: boolean;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const REFERENCE_COLUMNS = 'id, title, description, client_name, client_website, project_url, image_url, technologies, category, is_featured, order_index, is_active, created_at, updated_at';

export async function getAllReferences(activeOnly = true): Promise<Reference[]> {
  const sql = activeOnly
    ? `SELECT ${REFERENCE_COLUMNS} FROM site_references WHERE is_active = true ORDER BY order_index ASC, created_at DESC`
    : `SELECT ${REFERENCE_COLUMNS} FROM site_references ORDER BY order_index ASC, created_at DESC`;
  const result = await pool.query(sql);
  return result.rows;
}
