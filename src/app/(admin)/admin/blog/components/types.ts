export type Post = {
  id: number;
  title: string;
  slug: string;
  description: string;
  status: "draft" | "published";
  tags: string[];
  cover_image_url: string | null;
  created_at: string;
  published_at: string | null;
  author_name: string | null;
  author_email: string | null;
};

export type DeletedPost = {
  id: number;
  title: string;
  slug: string;
  deleted_at: string;
  author_name: string | null;
};

export type Tab = "published" | "draft" | "trash" | "new";

export type BlogFormState = {
  title: string;
  description: string;
  content: string;
  tags: string;
  cover_image_url: string;
  cover_image_alt: string;
  citations: string;
  status: "draft" | "published";
  slug: string;
};

export const EMPTY_FORM: BlogFormState = {
  title: "",
  description: "",
  content: "",
  tags: "",
  cover_image_url: "",
  cover_image_alt: "",
  citations: "",
  status: "draft",
  slug: "",
};
