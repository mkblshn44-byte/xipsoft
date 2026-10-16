import { revalidatePath, revalidateTag } from "next/cache";
import pool from "@/lib/database";
import { invalidateRedirectCache, recordSlugRedirect } from "@/lib/redirect-handler";
import { slugify } from "@/utils/slugify";

export interface ServiceUpdateInput {
  slug?: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  badge_icon?: string;
  badge_gradient?: string;
  badge_color?: string;
  title_gradient?: string;
  hero_cta?: string;
  stats?: unknown;
  features?: unknown;
  tech_stack?: unknown;
  process_title?: string;
  process_desc?: string;
  process_steps?: unknown;
  packages?: unknown;
  cta_title?: string;
  cta_desc?: string;
  cta_btn?: string;
  micro_services?: unknown;
  faq_title?: string;
  faq_items?: unknown;
  metadata?: unknown;
  is_active?: boolean;
}

export type ServiceUpdateFailureCode =
  | "invalid_id"
  | "not_found"
  | "invalid_input"
  | "slug_conflict"
  | "no_fields";

export class ServiceUpdateError extends Error {
  constructor(
    message: string,
    readonly code: ServiceUpdateFailureCode,
  ) {
    super(message);
    this.name = "ServiceUpdateError";
  }
}

const TEXT_FIELDS = [
  "title",
  "subtitle",
  "badge",
  "badge_icon",
  "badge_gradient",
  "badge_color",
  "title_gradient",
  "hero_cta",
  "process_title",
  "process_desc",
  "cta_title",
  "cta_desc",
  "cta_btn",
  "faq_title",
] as const;

const JSONB_FIELDS = [
  "stats",
  "features",
  "tech_stack",
  "process_steps",
  "packages",
  "micro_services",
  "faq_items",
  "metadata",
] as const;

export async function updateServiceRecord(
  id: number,
  input: unknown,
): Promise<{ slug: string }> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new ServiceUpdateError("Geçersiz ID", "invalid_id");
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new ServiceUpdateError("Geçersiz istek gövdesi", "invalid_input");
  }
  const data = input as ServiceUpdateInput;

  const client = await pool.connect();
  let previousSlug = "";
  let updatedSlug = "";

  try {
    await client.query("BEGIN");

    const existing = await client.query<{ slug: string }>(
      "SELECT slug FROM services WHERE id = $1::int LIMIT 1 FOR UPDATE",
      [id],
    );
    if (!existing.rows[0]) {
      throw new ServiceUpdateError("Hizmet bulunamadı", "not_found");
    }
    previousSlug = existing.rows[0].slug;

    const fields: string[] = [];
    const values: unknown[] = [];
    let parameterIndex = 1;

    const addField = (column: string, value: unknown) => {
      fields.push(`${column} = $${parameterIndex++}`);
      values.push(value);
    };

    if (data.slug !== undefined) {
      if (typeof data.slug !== "string") {
        throw new ServiceUpdateError("slug string olmalı", "invalid_input");
      }
      const slug = slugify(data.slug.trim());
      if (!slug) {
        throw new ServiceUpdateError("Geçersiz slug formatı", "invalid_input");
      }
      if (slug !== previousSlug) {
        const collision = await client.query(
          "SELECT 1 FROM services WHERE slug = $1 AND id <> $2::int LIMIT 1",
          [slug, id],
        );
        if (collision.rows.length > 0) {
          throw new ServiceUpdateError(
            "Bu slug başka bir hizmette kullanılıyor",
            "slug_conflict",
          );
        }
      }
      addField("slug", slug);
    }

    for (const column of TEXT_FIELDS) {
      const value = data[column];
      if (value === undefined) continue;
      if (typeof value !== "string") {
        throw new ServiceUpdateError(`${column} string olmalı`, "invalid_input");
      }
      addField(column, value);
    }

    for (const column of JSONB_FIELDS) {
      const value = data[column];
      if (value === undefined) continue;
      try {
        const serialized = JSON.stringify(value);
        if (serialized === undefined) throw new Error("JSON değeri serileştirilemedi");
        addField(column, serialized);
      } catch {
        throw new ServiceUpdateError(`${column} geçerli JSON olmalı`, "invalid_input");
      }
    }

    if (data.is_active !== undefined) {
      if (typeof data.is_active !== "boolean") {
        throw new ServiceUpdateError("is_active boolean olmalı", "invalid_input");
      }
      addField("is_active", data.is_active);
    }

    if (fields.length === 0) {
      throw new ServiceUpdateError(
        "Güncellenecek alan bulunamadı",
        "no_fields",
      );
    }

    fields.push("updated_at = NOW()");
    values.push(id);

    const updated = await client.query<{ slug: string }>(
      `UPDATE services SET ${fields.join(", ")} WHERE id = $${parameterIndex} RETURNING slug`,
      values,
    );
    if (!updated.rows[0]) {
      throw new ServiceUpdateError("Hizmet bulunamadı", "not_found");
    }
    updatedSlug = updated.rows[0].slug;

    if (previousSlug !== updatedSlug) {
      await recordSlugRedirect(
        client,
        `/hizmetler/${previousSlug}`,
        `/hizmetler/${updatedSlug}`,
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  if (previousSlug !== updatedSlug) {
    invalidateRedirectCache(`/hizmetler/${previousSlug}`);
    invalidateRedirectCache(`/hizmetler/${updatedSlug}`);
  }
  revalidateTag("services");
  revalidateTag("sitemap");
  revalidateTag(`service:${previousSlug}`);
  revalidateTag(`service:${updatedSlug}`);
  revalidatePath(`/hizmetler/${previousSlug}`);
  revalidatePath(`/hizmetler/${updatedSlug}`);
  revalidatePath("/hizmetler");
  revalidatePath("/sitemap.xml");

  return { slug: updatedSlug };
}
