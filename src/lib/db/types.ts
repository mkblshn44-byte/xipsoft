/**
 * Paylaşılan veri katmanı tipleri (formerly db-users).
 */

export interface User {
  id: number;
  uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  role: "user" | "moderator" | "admin";
  rank_id: number | null;
  reputation: number;
  message_count: number;
  bio: string | null;
  website: string | null;
  location: string | null;
  job: string | null;
  branch: string | null;
  signature: string | null;
  is_banned: boolean;
  last_active: Date | null;
  created_at: Date;
  updated_at: Date;
}
