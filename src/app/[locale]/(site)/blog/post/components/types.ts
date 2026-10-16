import type { BlogPost } from "@/types/blog";

export interface AdjacentPosts {
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string } | null;
}

export interface BlogShareButtonsProps {
  title?: string;
}

export interface BlogPostInnerProps {
  slug?: string;
}

export interface BlogHeaderProps {
  post: BlogPost;
  isModerator: boolean;
  formattedDate: string;
  readTime: number;
  onShare: () => void;
}

export interface BlogActionsProps {
  post: BlogPost;
  normalizedSlug: string;
  adjacent: AdjacentPosts;
}
