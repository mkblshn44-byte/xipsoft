export const USER_FIELDS = "id, uid, email, display_name, photo_url, role, rank_id, reputation, message_count, bio, website, location, job, branch, signature, is_banned, last_active, created_at";

export function sanitizeEmail(email: string): string {
  return email.replace(/[^a-zA-Z0-9@.+_-]/g, "").toLowerCase();
}
