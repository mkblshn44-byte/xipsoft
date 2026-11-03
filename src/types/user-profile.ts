/**
 * user-profile.ts — Genel (public) kullanıcı profili tipi.
 *
 * Bu tip hem sunucu veri katmanı (`lib/user-profile.ts`) hem de istemci
 * profil bileşeni tarafından paylaşılır. Sunucu bağımlılığı içermez; bu yüzden
 * ayrı bir dosyada tutulur (istemci paketine `pg` sızmasın).
 */

export interface PublicUserProfile {
  id: number;
  nick: string | null;
  display_name: string | null;
  photo_url: string | null;
  cover_url: string | null;
  bio: string | null;
  website: string | null;
  location: string | null;
  job: string | null;
  branch: string | null;
  signature: string | null;
  role: string;
  rank_id: number | null;
  is_banned: boolean;
  /**
   * ISO 8601 dizesi (RSC payload için serileştirilmiş).
   */
  last_active: string | null;
  /** ISO 8601 dizesi. */
  created_at: string;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  expertise_area: string | null;
  years_experience: number | null;
  is_expert: boolean | null;
  /**
   * Gizlilik ayarına bağlı e-posta. Sunucu sorgusu bu alanı SEÇMEZ; yalnızca
   * bileşenin gizlilik kontrolü tip uyumlu kalsın diye opsiyoneldir.
   */
  email?: string | null;
}
