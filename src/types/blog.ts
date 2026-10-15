import type { SerializedEditorState } from "lexical";
import type { PaginatedResult } from "@/types/common";
import type { ResponsiveUrls } from "@/components/LazyImage";

export interface BlogPost {
  id: string;
  title: string;
  description: string;
  content: SerializedEditorState;
  authorId: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  authorNick?: string | null;
  status: "draft" | "published";
  tags: string[];
  coverImageURL: string | null;
  /** Cloudinary responsive URL seti — upload API'den döner, varsa srcset kullanılır */
  coverImageUrls?: ResponsiveUrls | null;
  coverImageAlt?: string | null;
  citations?: Array<{ url: string; title: string; source?: string }> | null;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface BlogPostInput {
  title: string;
  description: string;
  content: SerializedEditorState;
  tags: string[];
  coverImageURL: string | null;
  coverImageAlt?: string | null;
  /** Cloudinary responsive URL seti — upload API'den döner */
  coverImageUrls?: import("@/components/LazyImage").ResponsiveUrls | null;
}

/** @deprecated PaginatedResult<BlogPost> kullanın */
export type PaginatedBlogResult = PaginatedResult<BlogPost>;
