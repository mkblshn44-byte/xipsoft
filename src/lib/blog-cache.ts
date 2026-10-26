import { revalidatePath, revalidateTag } from "next/cache";
import { invalidateBlogCache as invalidateRedisBlogCache } from "@/lib/redis/blog-cache";
import { invalidateSitemapCache } from "@/lib/redis/page-cache";

export async function invalidateBlogCaches(slug?: string): Promise<void> {
  await invalidateRedisBlogCache(slug);
  await invalidateSitemapCache();
  revalidateTag("blog-content");
  revalidateTag("sitemap");
  revalidatePath("/blog");
  revalidatePath("/blog/[slug]", "page");
  revalidatePath("/sitemap.xml");
  revalidatePath("/sitemap/1.xml");
}
